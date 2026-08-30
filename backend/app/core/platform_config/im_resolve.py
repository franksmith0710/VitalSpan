from __future__ import annotations

from sqlalchemy.orm import Session

from app.auth.models import get_meta_session
from app.core.config import Settings, get_settings
from app.core.platform_config.im_connect_model import IM_CHANNELS, IM_DELIVERY_MODES, PlatformImConnectConfig
from app.core.platform_config.im_credentials import (
    ImCredentials,
    decrypt_credentials_payload,
    empty_credentials,
    normalize_im_channel,
)


def _from_env(settings: Settings, channel: str) -> ImCredentials:
    if channel == "dingtalk":
        return ImCredentials(
            channel=channel,
            source="env",
            app_key=(settings.dingtalk_app_key or "").strip() or None,
            app_secret=settings.dingtalk_app_secret,
            agent_id=(settings.dingtalk_agent_id or "").strip() or None,
        )
    if channel == "wecom":
        return ImCredentials(
            channel=channel,
            source="env",
            corp_id=(settings.wecom_corp_id or "").strip() or None,
            secret=settings.wecom_secret,
            agent_id=(settings.wecom_agent_id or "").strip() or None,
        )
    if channel == "feishu":
        return ImCredentials(
            channel=channel,
            source="env",
            app_id=(settings.feishu_app_id or "").strip() or None,
            app_secret=settings.feishu_app_secret,
        )
    return empty_credentials(channel)


def _from_row(row: PlatformImConnectConfig) -> ImCredentials:
    channel = row.channel
    mode = row.delivery_mode if row.delivery_mode in IM_DELIVERY_MODES else "corporate_app"
    payload = decrypt_credentials_payload(row.credentials_encrypted or "")
    callback = (row.callback_domain or "").strip() or None
    if channel == "dingtalk":
        return ImCredentials(
            channel=channel,
            source="db",
            delivery_mode=mode,
            callback_domain=callback,
            app_key=payload.get("app_key") or None,
            app_secret=payload.get("app_secret") or None,
            agent_id=payload.get("agent_id") or None,
        )
    if channel == "wecom":
        return ImCredentials(
            channel=channel,
            source="db",
            delivery_mode=mode,
            callback_domain=callback,
            corp_id=payload.get("corp_id") or None,
            secret=payload.get("secret") or None,
            agent_id=payload.get("agent_id") or None,
        )
    return ImCredentials(
        channel=channel,
        source="db",
        delivery_mode=mode,
        callback_domain=callback,
        app_id=payload.get("app_id") or None,
        app_secret=payload.get("app_secret") or None,
    )


def resolve_im_credentials(
    session: Session | None = None,
    *,
    channel: str,
    settings: Settings | None = None,
) -> ImCredentials:
    normalized = normalize_im_channel(channel)
    owns = session is None
    db = session or get_meta_session()
    cfg = settings or get_settings()
    try:
        row = db.get(PlatformImConnectConfig, normalized)
        if row is None:
            return _from_env(cfg, normalized)
        if row.state == "cleared":
            return empty_credentials(normalized)
        return _from_row(row)
    finally:
        if owns:
            db.close()


def resolve_im_delivery_mode(session: Session, channel: str) -> str:
    normalized = normalize_im_channel(channel)
    row = session.get(PlatformImConnectConfig, normalized)
    if row is None or row.state != "active":
        return "corporate_app"
    if row.delivery_mode in IM_DELIVERY_MODES:
        return row.delivery_mode
    return "corporate_app"


def resolve_all_im_credentials(
    session: Session | None = None,
    settings: Settings | None = None,
) -> dict[str, ImCredentials]:
    return {
        channel: resolve_im_credentials(session, channel=channel, settings=settings)
        for channel in IM_CHANNELS
    }
