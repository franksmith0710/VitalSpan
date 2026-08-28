from __future__ import annotations

import uuid

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth.im_oauth.bindings import delete_binding, list_binding_rows, mask_account_id, upsert_oauth_binding
from app.auth.im_oauth.oauth import (
    ImOAuthError,
    build_authorize_url,
    consume_state,
    create_state,
    exchange_code_for_account,
    purge_expired_states,
)
from app.core.platform_config.im_connect_model import IM_CHANNELS, IM_LABELS
from app.core.platform_config.im_resolve import resolve_im_credentials
from app.reports.scheduler.channels.im_sdk.probe import probe_im_credentials_bundle


class ImBindingItemOut(BaseModel):
    channel: str
    label: str
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


def list_user_im_bindings(session: Session, user_id: uuid.UUID) -> ImBindingsOut:
    rows = list_binding_rows(session, user_id)
    items: list[ImBindingItemOut] = []
    for channel in IM_CHANNELS:
        creds = resolve_im_credentials(session, channel=channel)
        probe = probe_im_credentials_bundle(creds) if creds.is_configured else {"ok": False}
        app_configured = bool(probe.get("ok"))
        row = rows.get(channel)
        bound = row is not None
        items.append(
            ImBindingItemOut(
                channel=channel,
                label=IM_LABELS[channel],
                app_configured=app_configured,
                bound=bound,
                masked_account=mask_account_id(row.account_id) if row else None,
                source=row.source if row else None,
                deliverable=app_configured and bound,
                probe_error=probe.get("error"),
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
    probe = probe_im_credentials_bundle(creds)
    if not probe.get("ok"):
        raise ImOAuthError(
            "IM_APP_PROBE_FAILED",
            probe.get("error") or "应用探测未通过，暂不可绑定",
            422,
        )
    state = create_state(session, user_id=user_id, channel=channel, redirect_after=redirect_after)
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
    upsert_oauth_binding(
        session,
        user_id=oauth_state.user_id,
        channel=channel,
        account_id=account_id,
    )
    session.commit()
    redirect = oauth_state.redirect_after or "/admin/account/profile"
    return oauth_state.user_id, redirect
