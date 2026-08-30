from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.im_models import IM_CHANNELS, UserImBinding
from app.core.crypto.credentials import encrypt_credential


class ImBindingError(Exception):
    def __init__(self, code: str, message: str, status: int = 400) -> None:
        self.code = code
        self.message = message
        self.status = status
        super().__init__(message)


def mask_account_id(account_id: str) -> str:
    value = account_id.strip()
    if len(value) <= 4:
        return "****"
    return f"{value[:2]}****{value[-2:]}"


def list_binding_rows(session: Session, user_id: uuid.UUID) -> dict[str, UserImBinding]:
    rows = session.scalars(select(UserImBinding).where(UserImBinding.user_id == user_id)).all()
    return {row.channel: row for row in rows if row.channel in IM_CHANNELS}


def upsert_oauth_binding(
    session: Session,
    *,
    user_id: uuid.UUID,
    channel: str,
    account_id: str,
    source: str = "oauth",
) -> UserImBinding:
    conflict = session.scalar(
        select(UserImBinding).where(
            UserImBinding.channel == channel,
            UserImBinding.account_id == account_id,
            UserImBinding.user_id != user_id,
        )
    )
    if conflict is not None:
        raise ImBindingError(
            "IM_BINDING_CONFLICT",
            "该 IM 账号已被其他用户绑定",
            409,
        )
    row = session.scalar(
        select(UserImBinding).where(
            UserImBinding.user_id == user_id,
            UserImBinding.channel == channel,
        )
    )
    if row is None:
        row = UserImBinding(user_id=user_id, channel=channel, account_id=account_id, source=source)
        session.add(row)
    else:
        row.account_id = account_id
        row.source = source
    session.flush()
    return row


def upsert_device_binding(
    session: Session,
    *,
    user_id: uuid.UUID,
    channel: str,
    account_id: str,
    access_token: str,
    refresh_token: str | None,
    expires_in: int,
    source: str = "device",
) -> UserImBinding:
    expires_at = datetime.now(UTC) + timedelta(seconds=max(expires_in, 60))
    token_payload = {
        "access_token": access_token,
        "refresh_token": refresh_token or "",
        "expires_at": expires_at.isoformat(),
    }
    token_encrypted = encrypt_credential(json.dumps(token_payload, ensure_ascii=False))
    conflict = session.scalar(
        select(UserImBinding).where(
            UserImBinding.channel == channel,
            UserImBinding.account_id == account_id,
            UserImBinding.user_id != user_id,
        )
    )
    if conflict is not None:
        raise ImBindingError(
            "IM_BINDING_CONFLICT",
            "该 IM 账号已被其他用户绑定",
            409,
        )
    row = session.scalar(
        select(UserImBinding).where(
            UserImBinding.user_id == user_id,
            UserImBinding.channel == channel,
        )
    )
    if row is None:
        row = UserImBinding(
            user_id=user_id,
            channel=channel,
            account_id=account_id,
            source=source,
            token_encrypted=token_encrypted,
            token_expires_at=expires_at,
        )
        session.add(row)
    else:
        row.account_id = account_id
        row.source = source
        row.token_encrypted = token_encrypted
        row.token_expires_at = expires_at
    session.flush()
    return row


def delete_binding(session: Session, *, user_id: uuid.UUID, channel: str) -> None:
    row = session.scalar(
        select(UserImBinding).where(
            UserImBinding.user_id == user_id,
            UserImBinding.channel == channel,
        )
    )
    if row is not None:
        session.delete(row)
        session.flush()
