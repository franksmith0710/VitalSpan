from __future__ import annotations

import json
import secrets
import uuid
from datetime import UTC, datetime, timedelta

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth.im_oauth.bindings import (
    ImBindingError,
    delete_binding,
    list_binding_rows,
    mask_account_id,
    upsert_device_binding,
    upsert_oauth_binding,
)
from app.auth.im_oauth.device_code.feishu import (
    DeviceAuthPending,
    FeishuDeviceAuthError,
    poll_feishu_device_token,
    start_feishu_device_auth,
)
from app.auth.im_oauth.oauth import (
    ImOAuthError,
    build_authorize_url,
    consume_state,
    create_state,
    exchange_code_for_account,
    purge_expired_states,
)
from app.auth.im_oauth.redirect import sanitize_redirect_after
from app.auth.im_models import ImOAuthState
from app.core.platform_config.im_connect_model import IM_CHANNELS, IM_LABELS
from app.core.platform_config.im_resolve import resolve_im_credentials, resolve_im_delivery_mode
from app.reports.scheduler.channels.im_sdk.probe import probe_im_credentials_bundle

_DEVICE_STATE_TTL = timedelta(minutes=15)


class ImBindingItemOut(BaseModel):
    channel: str
    label: str
    delivery_mode: str = Field(default="corporate_app", alias="deliveryMode")
    app_configured: bool = Field(alias="appConfigured")
    bound: bool
    masked_account: str | None = Field(default=None, alias="maskedAccount")
    source: str | None = None
    deliverable: bool
    probe_error: str | None = Field(default=None, alias="probeError")

    model_config = {"populate_by_name": True}


class ImBindingsOut(BaseModel):
    items: list[ImBindingItemOut]

    model_config = {"populate_by_name": True}


class DeviceAuthStartOut(BaseModel):
    session_id: str = Field(alias="sessionId")
    verification_uri: str = Field(alias="verificationUri")
    user_code: str = Field(alias="userCode")
    expires_in: int = Field(alias="expiresIn")
    interval: int

    model_config = {"populate_by_name": True}


class DeviceAuthCompleteIn(BaseModel):
    session_id: str = Field(alias="sessionId")

    model_config = {"populate_by_name": True}


class DeviceAuthCompleteOut(BaseModel):
    status: str
    message: str | None = None
    interval: int | None = None

    model_config = {"populate_by_name": True}


class AuthorizeUrlOut(BaseModel):
    authorize_url: str = Field(alias="authorizeUrl")

    model_config = {"populate_by_name": True}


def _app_ready(session: Session, channel: str, creds) -> tuple[bool, str | None]:
    mode = resolve_im_delivery_mode(session, channel)
    if mode == "user_delegated":
        return creds.is_configured, None
    if not creds.is_configured:
        return False, None
    probe = probe_im_credentials_bundle(creds)
    return bool(probe.get("ok")), probe.get("error")


def list_user_im_bindings(session: Session, user_id: uuid.UUID) -> ImBindingsOut:
    rows = list_binding_rows(session, user_id)
    items: list[ImBindingItemOut] = []
    for channel in IM_CHANNELS:
        creds = resolve_im_credentials(session, channel=channel)
        mode = resolve_im_delivery_mode(session, channel)
        app_configured, probe_error = _app_ready(session, channel, creds)
        row = rows.get(channel)
        bound = row is not None
        items.append(
            ImBindingItemOut(
                channel=channel,
                label=IM_LABELS[channel],
                delivery_mode=mode,
                app_configured=app_configured,
                bound=bound,
                masked_account=mask_account_id(row.account_id) if row else None,
                source=row.source if row else None,
                deliverable=app_configured and bound,
                probe_error=probe_error,
            )
        )
    return ImBindingsOut(items=items)


def start_authorize(
    session: Session,
    *,
    user_id: uuid.UUID,
    channel: str,
    redirect_after: str | None = None,
) -> str:
    purge_expired_states(session)
    creds = resolve_im_credentials(session, channel=channel)
    if not creds.is_configured:
        raise ImOAuthError("IM_APP_NOT_CONFIGURED", "应用未配置，请联系管理员完成平台对接", 422)
    mode = resolve_im_delivery_mode(session, channel)
    if mode == "user_delegated":
        raise ImOAuthError(
            "IM_BIND_USE_DEVICE",
            "当前为用户委托模式，请使用扫码绑定",
            422,
        )
    probe = probe_im_credentials_bundle(creds)
    if not probe.get("ok"):
        raise ImOAuthError(
            "IM_APP_PROBE_FAILED",
            probe.get("error") or "应用探测未通过，暂不可绑定",
            422,
        )
    state = create_state(
        session,
        user_id=user_id,
        channel=channel,
        redirect_after=sanitize_redirect_after(redirect_after),
    )
    session.commit()
    return build_authorize_url(creds, state=state)


def complete_callback(
    session: Session,
    *,
    channel: str,
    code: str,
    state: str,
) -> tuple[uuid.UUID, str]:
    oauth_state = consume_state(session, state, channel)
    account_id = exchange_code_for_account(session, channel, code)
    try:
        upsert_oauth_binding(
            session,
            user_id=oauth_state.user_id,
            channel=channel,
            account_id=account_id,
        )
    except ImBindingError as exc:
        raise ImOAuthError(exc.code, exc.message, exc.status) from exc
    session.commit()
    redirect = sanitize_redirect_after(oauth_state.redirect_after)
    return oauth_state.user_id, redirect


def start_feishu_device_auth_session(session: Session, *, user_id: uuid.UUID) -> DeviceAuthStartOut:
    channel = "feishu"
    mode = resolve_im_delivery_mode(session, channel)
    if mode != "user_delegated":
        raise ImOAuthError("IM_BIND_USE_OAUTH", "当前为企业应用模式，请使用网页授权绑定", 422)
    creds = resolve_im_credentials(session, channel=channel)
    if not creds.is_configured:
        raise ImOAuthError("IM_APP_NOT_CONFIGURED", "应用未配置，请联系管理员完成平台对接", 422)
    started = start_feishu_device_auth(
        app_id=creds.app_id or "",
        app_secret=creds.app_secret or "",
    )
    session_id = secrets.token_urlsafe(24)
    session.add(
        ImOAuthState(
            state=session_id,
            user_id=user_id,
            channel=channel,
            redirect_after=json.dumps(
                {
                    "device_code": started.device_code,
                    "interval": started.interval,
                },
                ensure_ascii=False,
            ),
            expires_at=datetime.now(UTC) + _DEVICE_STATE_TTL,
        )
    )
    session.commit()
    return DeviceAuthStartOut(
        session_id=session_id,
        verification_uri=started.verification_uri_complete or started.verification_uri,
        user_code=started.user_code,
        expires_in=started.expires_in,
        interval=started.interval,
    )


def complete_feishu_device_auth_session(
    session: Session,
    *,
    user_id: uuid.UUID,
    session_id: str,
) -> DeviceAuthCompleteOut:
    row = session.get(ImOAuthState, session_id)
    if row is None or row.channel != "feishu" or row.user_id != user_id:
        raise ImOAuthError("IM_DEVICE_SESSION_INVALID", "绑定会话无效或已过期", 400)
    expires_at = row.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC)
    if expires_at < datetime.now(UTC):
        session.delete(row)
        session.commit()
        raise ImOAuthError("IM_DEVICE_SESSION_EXPIRED", "绑定会话已过期，请重新开始", 400)
    meta = json.loads(row.redirect_after or "{}")
    device_code = str(meta.get("device_code") or "")
    if not device_code:
        raise ImOAuthError("IM_DEVICE_SESSION_INVALID", "绑定会话数据无效", 400)
    creds = resolve_im_credentials(session, channel="feishu")
    try:
        result = poll_feishu_device_token(
            app_id=creds.app_id or "",
            app_secret=creds.app_secret or "",
            device_code=device_code,
        )
    except FeishuDeviceAuthError as exc:
        raise ImOAuthError(exc.code, exc.message, exc.status) from exc
    if isinstance(result, DeviceAuthPending):
        return DeviceAuthCompleteOut(status="pending", interval=result.interval)
    try:
        upsert_device_binding(
            session,
            user_id=user_id,
            channel="feishu",
            account_id=result.user_id,
            access_token=result.access_token,
            refresh_token=result.refresh_token,
            expires_in=result.expires_in,
        )
    except ImBindingError as exc:
        raise ImOAuthError(exc.code, exc.message, exc.status) from exc
    session.delete(row)
    session.commit()
    return DeviceAuthCompleteOut(status="success", message="绑定成功")
