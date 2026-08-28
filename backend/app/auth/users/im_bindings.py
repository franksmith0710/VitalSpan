from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.im_models import IM_CHANNELS, UserImBinding

_MAX_ACCOUNT_LEN = 128


class ImBindingConflictError(Exception):
    def __init__(self, channel: str, message: str = "该 IM 账号已被其他用户绑定") -> None:
        self.channel = channel
        self.message = message
        super().__init__(message)


def list_accounts(session: Session, user_id: uuid.UUID) -> dict[str, str]:
    rows = session.scalars(
        select(UserImBinding).where(UserImBinding.user_id == user_id),
    ).all()
    return {row.channel: row.account_id for row in rows if row.channel in IM_CHANNELS}


def list_accounts_with_source(session: Session, user_id: uuid.UUID) -> dict[str, dict[str, str]]:
    rows = session.scalars(
        select(UserImBinding).where(UserImBinding.user_id == user_id),
    ).all()
    out: dict[str, dict[str, str]] = {}
    for row in rows:
        if row.channel in IM_CHANNELS:
            out[row.channel] = {"accountId": row.account_id, "source": row.source}
    return out


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


def _assert_no_conflict(
    session: Session,
    *,
    user_id: uuid.UUID,
    channel: str,
    account_id: str,
) -> None:
    conflict = session.scalar(
        select(UserImBinding).where(
            UserImBinding.channel == channel,
            UserImBinding.account_id == account_id,
            UserImBinding.user_id != user_id,
        )
    )
    if conflict is not None:
        raise ImBindingConflictError(channel)


def upsert_accounts(
    session: Session,
    user_id: uuid.UUID,
    accounts: dict[str, str | None],
    *,
    source: str = "admin",
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
        _assert_no_conflict(session, user_id=user_id, channel=channel, account_id=value)
        if row is None:
            session.add(
                UserImBinding(user_id=user_id, channel=channel, account_id=value, source=source)
            )
        else:
            row.account_id = value
            row.source = source
    session.flush()
    return list_accounts(session, user_id)
