"""Resolve and refresh per-user IM OAuth tokens (user_delegated delivery)."""

from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime, timedelta

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.im_models import UserImBinding
from app.core.crypto.credentials import decrypt_credential, encrypt_credential
from app.core.platform_config.im_credentials import ImCredentials, normalize_im_channel
from app.core.platform_config.im_resolve import resolve_im_credentials

_TOKEN_URL = "https://open.feishu.cn/open-apis/authen/v2/oauth/token"
_TIMEOUT = 8.0
_REFRESH_SKEW = timedelta(minutes=2)
_OWNER_BIND_HINT = {
    "feishu": "您尚未绑定飞书，请在个人中心完成扫码绑定",
    "dingtalk": "您尚未绑定钉钉，请在个人中心完成扫码绑定",
}


def _load_token_blob(row: UserImBinding) -> dict[str, str]:
    if not row.token_encrypted:
        return {}
    raw = decrypt_credential(row.token_encrypted)
    data = json.loads(raw)
    return data if isinstance(data, dict) else {}


def _save_token_blob(
    session: Session,
    row: UserImBinding,
    *,
    access_token: str,
    refresh_token: str | None,
    expires_in: int,
) -> None:
    expires_at = datetime.now(UTC) + timedelta(seconds=max(expires_in, 60))
    payload = {
        "access_token": access_token,
        "refresh_token": refresh_token or "",
        "expires_at": expires_at.isoformat(),
    }
    row.token_encrypted = encrypt_credential(json.dumps(payload, ensure_ascii=False))
    row.token_expires_at = expires_at
    session.flush()


def _refresh_feishu_token(creds: ImCredentials, refresh_token: str) -> tuple[str, str | None, int]:
    with httpx.Client(timeout=_TIMEOUT) as client:
        resp = client.post(
            _TOKEN_URL,
            json={
                "grant_type": "refresh_token",
                "client_id": creds.app_id,
                "client_secret": creds.app_secret,
                "refresh_token": refresh_token,
            },
        )
        data = resp.json()
    if data.get("code") != 0:
        raise RuntimeError(data.get("msg") or "飞书 refresh_token 失效")
    access_token = str(data.get("access_token") or "")
    if not access_token:
        raise RuntimeError("飞书 refresh 未返回 access_token")
    new_refresh = data.get("refresh_token")
    expires_in = int(data.get("expires_in") or 7200)
    return access_token, (str(new_refresh) if new_refresh else refresh_token), expires_in


def _coerce_user_id(user_id: uuid.UUID | str) -> uuid.UUID:
    if isinstance(user_id, uuid.UUID):
        return user_id
    return uuid.UUID(str(user_id))


def owner_has_send_token(session: Session, user_id: uuid.UUID | str, channel: str) -> tuple[bool, str | None]:
    """Whether schedule owner can send in user_delegated mode (no network refresh)."""
    normalized = normalize_im_channel(channel)
    creds = resolve_im_credentials(session, channel=normalized)
    if creds.delivery_mode != "user_delegated":
        return True, None
    if not creds.is_configured:
        return False, "应用未配置"
    uid = _coerce_user_id(user_id)
    row = session.scalar(
        select(UserImBinding).where(
            UserImBinding.user_id == uid,
            UserImBinding.channel == normalized,
        )
    )
    if row is None:
        return False, _OWNER_BIND_HINT.get(normalized, "您尚未绑定 IM，请在个人中心完成扫码绑定")
    if normalized == "feishu":
        blob = _load_token_blob(row)
        access_token = (blob.get("access_token") or "").strip()
        refresh_token = (blob.get("refresh_token") or "").strip()
        if not access_token and not refresh_token:
            return False, "飞书授权已失效，请重新绑定"
    return True, None


def check_im_owner_sender_ready(session: Session, user_id: uuid.UUID | str) -> dict[str, dict[str, object]]:
    from app.core.platform_config.im_connect_model import IM_CHANNELS
    from app.core.platform_config.im_resolve import resolve_im_delivery_mode

    out: dict[str, dict[str, object]] = {}
    for channel in IM_CHANNELS:
        mode = resolve_im_delivery_mode(session, channel)
        if mode != "user_delegated":
            continue
        ready, error = owner_has_send_token(session, user_id, channel)
        out[channel] = {"ready": ready, "error": error}
    return out


def get_user_access_token(session: Session, user_id: uuid.UUID | str, channel: str) -> str | None:
    uid = _coerce_user_id(user_id)
    normalized = normalize_im_channel(channel)
    creds = resolve_im_credentials(session, channel=normalized)
    if creds.delivery_mode != "user_delegated":
        return None
    row = session.scalar(
        select(UserImBinding).where(
            UserImBinding.user_id == uid,
            UserImBinding.channel == normalized,
        )
    )
    if row is None:
        return None
    blob = _load_token_blob(row)
    access_token = (blob.get("access_token") or "").strip()
    refresh_token = (blob.get("refresh_token") or "").strip()
    expires_raw = blob.get("expires_at")
    expires_at: datetime | None = None
    if expires_raw:
        try:
            expires_at = datetime.fromisoformat(str(expires_raw))
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=UTC)
        except ValueError:
            expires_at = None
    now = datetime.now(UTC)
    if access_token and expires_at and expires_at > now + _REFRESH_SKEW:
        return access_token
    if not refresh_token:
        return access_token or None
    if normalized != "feishu":
        return None
    try:
        new_access, new_refresh, expires_in = _refresh_feishu_token(creds, refresh_token)
    except RuntimeError:
        return None
    _save_token_blob(
        session,
        row,
        access_token=new_access,
        refresh_token=new_refresh,
        expires_in=expires_in,
    )
    session.flush()
    return new_access
