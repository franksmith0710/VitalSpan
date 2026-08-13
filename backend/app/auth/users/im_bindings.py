from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.im_models import IM_CHANNELS, UserImBinding

_MAX_ACCOUNT_LEN = 128


def list_accounts(session: Session, user_id: uuid.UUID) -> dict[str, str]:
    rows = session.scalars(
        select(UserImBinding).where(UserImBinding.user_id == user_id),
    ).all()
    return {row.channel: row.account_id for row in rows if row.channel in IM_CHANNELS}


def list_accounts_for_users(
    session: Session,
    user_ids: list[uuid.UUID],
    channel: str,
) -> dict[uuid.UUID, str]:
    if not user_ids:
        return {}
    rows = session.scalars(
        select(UserImBinding).where(
            UserImBinding.user_id.in_(user_ids),
            UserImBinding.channel == channel,
        ),
    ).all()
    return {row.user_id: row.account_id for row in rows}


def upsert_accounts(
    session: Session,
    user_id: uuid.UUID,
    accounts: dict[str, str | None],
) -> dict[str, str]:
    """写入或清空绑定。空字符串表示解绑。忽略未知通道。"""
    existing = {
        row.channel: row
        for row in session.scalars(
            select(UserImBinding).where(UserImBinding.user_id == user_id),
        ).all()
    }
    for channel, raw in accounts.items():
        if channel not in IM_CHANNELS:
            continue
        value = (raw or "").strip()
        if len(value) > _MAX_ACCOUNT_LEN:
            value = value[:_MAX_ACCOUNT_LEN]
        row = existing.get(channel)
        if not value:
            if row is not None:
                session.delete(row)
            continue
        if row is None:
            session.add(UserImBinding(user_id=user_id, channel=channel, account_id=value))
        else:
            row.account_id = value
    session.flush()
    return list_accounts(session, user_id)
