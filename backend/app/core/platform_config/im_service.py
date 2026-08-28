from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.auth.audit.write_hooks import record_platform_event
from app.core.platform_config.email_service import PlatformConfigError
from app.core.platform_config.im_connect_model import (
    AUDIT_TARGET_BY_IM_CHANNEL,
    IM_CHANNELS,
    IM_LABELS,
    PlatformImConnectConfig,
)
from app.core.platform_config.im_credentials import (
    decrypt_credentials_payload,
    encrypt_credentials_payload,
    normalize_im_channel,
)
from app.core.platform_config.im_resolve import resolve_im_credentials
from app.core.platform_config.schemas import ImDeliveryConfigOut, ImDeliveryConfigPut, ImDeliverySlotsOut
from app.reports.scheduler.channels.im_sdk.probe import probe_im_credentials_bundle


def _row_or_none(session: Session, channel: str) -> PlatformImConnectConfig | None:
    return session.get(PlatformImConnectConfig, channel)


def _effective_source(session: Session, channel: str) -> str:
    row = _row_or_none(session, channel)
    if row is None:
        creds = resolve_im_credentials(session, channel=channel)
        return creds.source if creds.is_configured else "none"
    if row.state == "cleared":
        return "none"
    return "db"



def _out_fields(channel: str, creds, row: PlatformImConnectConfig | None, source: str) -> dict:
    base = {
        "channel": channel,
        "label": IM_LABELS[channel],
        "source": source,
        "callback_domain": row.callback_domain if row and row.state == "active" else creds.callback_domain,
        "has_secret": False,
    }
    if channel == "dingtalk":
        base.update(
            app_key=creds.app_key if source != "none" else None,
            agent_id=creds.agent_id if source != "none" else None,
            has_secret=bool(creds.app_secret),
        )
    elif channel == "wecom":
        base.update(
            corp_id=creds.corp_id if source != "none" else None,
            agent_id=creds.agent_id if source != "none" else None,
            has_secret=bool(creds.secret),
        )
    else:
        base.update(
            app_id=creds.app_id if source != "none" else None,
            has_secret=bool(creds.app_secret),
        )
    return base


def get_im_config(session: Session, channel: str, *, probe: bool = True) -> ImDeliveryConfigOut:
    normalized = normalize_im_channel(channel)
    row = _row_or_none(session, normalized)
    creds = resolve_im_credentials(session, channel=normalized)
    source = _effective_source(session, normalized)
    configured = creds.is_configured and source != "none"
    probe_error = None
    if probe and configured:
        result = probe_im_credentials_bundle(creds)
        if not result.get("ok"):
            configured = False
            probe_error = result.get("error")
    fields = _out_fields(normalized, creds, row, source)
    return ImDeliveryConfigOut(
        configured=configured,
        probe_error=probe_error,
        **fields,
    )


def list_im_configs(session: Session, *, probe: bool = True) -> ImDeliverySlotsOut:
    return ImDeliverySlotsOut(items=[get_im_config(session, ch, probe=probe) for ch in IM_CHANNELS])


def _validate_put(channel: str, payload: ImDeliveryConfigPut) -> dict[str, str]:
    callback = payload.callback_domain.strip()
    if not callback:
        raise PlatformConfigError("PLATFORM_IM_CALLBACK_REQUIRED", "回调域名不能为空", 422)
    if channel == "dingtalk":
        app_key = (payload.app_key or "").strip()
        agent_id = (payload.agent_id or "").strip()
        if not app_key or not agent_id:
            raise PlatformConfigError("PLATFORM_IM_FIELDS_REQUIRED", "钉钉 AppKey 与 AgentId 不能为空", 422)
        return {"app_key": app_key, "agent_id": agent_id}
    if channel == "wecom":
        corp_id = (payload.corp_id or "").strip()
        agent_id = (payload.agent_id or "").strip()
        if not corp_id or not agent_id:
            raise PlatformConfigError("PLATFORM_IM_FIELDS_REQUIRED", "企业微信 CorpId 与 AgentId 不能为空", 422)
        return {"corp_id": corp_id, "agent_id": agent_id}
    app_id = (payload.app_id or "").strip()
    if not app_id:
        raise PlatformConfigError("PLATFORM_IM_FIELDS_REQUIRED", "飞书 AppId 不能为空", 422)
    return {"app_id": app_id}


def _resolve_secret(
    channel: str,
    payload: ImDeliveryConfigPut,
    existing_cipher: str | None,
) -> str:
    secret_key = {"dingtalk": "app_secret", "wecom": "secret", "feishu": "app_secret"}[channel]
    incoming = getattr(payload, secret_key, None)
    if incoming:
        return incoming
    if existing_cipher:
        return decrypt_credentials_payload(existing_cipher).get(secret_key, "")
    raise PlatformConfigError("PLATFORM_IM_SECRET_REQUIRED", "首次保存须填写应用 Secret", 422)


def save_im_config(
    session: Session,
    channel: str,
    payload: ImDeliveryConfigPut,
    *,
    actor_id: str,
    actor_username: str | None,
    trace_id: str,
) -> ImDeliveryConfigOut:
    normalized = normalize_im_channel(channel)
    row = _row_or_none(session, normalized)
    existing_cipher = row.credentials_encrypted if row and row.state == "active" else None
    fields = _validate_put(normalized, payload)
    secret = _resolve_secret(normalized, payload, existing_cipher)
    if not secret:
        raise PlatformConfigError("PLATFORM_IM_SECRET_REQUIRED", "应用 Secret 不能为空", 422)
    secret_key = {"dingtalk": "app_secret", "wecom": "secret", "feishu": "app_secret"}[normalized]
    cred_payload = {**fields, secret_key: secret}
    callback = payload.callback_domain.strip()
    probe_result = probe_im_credentials_bundle_from_payload(normalized, callback, cred_payload)
    if not probe_result.get("ok"):
        raise PlatformConfigError(
            "PLATFORM_IM_PROBE_FAILED",
            probe_result.get("error") or "IM 应用探测失败",
            422,
        )
    if row is None:
        row = PlatformImConnectConfig(channel=normalized, state="active")
        session.add(row)
    else:
        row.state = "active"
    row.callback_domain = callback
    row.credentials_encrypted = encrypt_credentials_payload(cred_payload)
    row.updated_by = uuid.UUID(actor_id)
    record_platform_event(
        session,
        actor_id=actor_id,
        actor_username=actor_username,
        target_type="platform_im_connect",
        target_id=AUDIT_TARGET_BY_IM_CHANNEL[normalized],
        action=f"platform_connect.im.{normalized}.save",
        detail={"channel": normalized, "callback_domain": callback},
        trace_id=trace_id,
    )
    session.commit()
    return get_im_config(session, normalized, probe=False)


def clear_im_config(
    session: Session,
    channel: str,
    *,
    actor_id: str,
    actor_username: str | None,
    trace_id: str,
) -> ImDeliveryConfigOut:
    normalized = normalize_im_channel(channel)
    row = _row_or_none(session, normalized)
    if row is None:
        row = PlatformImConnectConfig(channel=normalized, state="cleared")
        session.add(row)
    row.state = "cleared"
    row.callback_domain = None
    row.credentials_encrypted = None
    row.updated_by = uuid.UUID(actor_id)
    record_platform_event(
        session,
        actor_id=actor_id,
        actor_username=actor_username,
        target_type="platform_im_connect",
        target_id=AUDIT_TARGET_BY_IM_CHANNEL[normalized],
        action=f"platform_connect.im.{normalized}.clear",
        detail={"channel": normalized},
        trace_id=trace_id,
    )
    session.commit()
    return get_im_config(session, normalized, probe=False)


def probe_im_credentials_bundle_from_payload(
    channel: str,
    callback_domain: str,
    payload: dict[str, str],
) -> dict:
    from app.core.platform_config.im_credentials import ImCredentials

    if channel == "dingtalk":
        creds = ImCredentials(
            channel=channel,
            source="db",
            callback_domain=callback_domain,
            app_key=payload.get("app_key"),
            app_secret=payload.get("app_secret"),
            agent_id=payload.get("agent_id"),
        )
    elif channel == "wecom":
        creds = ImCredentials(
            channel=channel,
            source="db",
            callback_domain=callback_domain,
            corp_id=payload.get("corp_id"),
            secret=payload.get("secret"),
            agent_id=payload.get("agent_id"),
        )
    else:
        creds = ImCredentials(
            channel=channel,
            source="db",
            callback_domain=callback_domain,
            app_id=payload.get("app_id"),
            app_secret=payload.get("app_secret"),
        )
    return probe_im_credentials_bundle(creds)
