from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.auth.audit.write_hooks import record_platform_event
from app.core.platform_config.email_service import PlatformConfigError
from app.core.platform_config.im_connect_model import (
    AUDIT_TARGET_BY_IM_CHANNEL,
    IM_CHANNELS,
    IM_DELIVERY_MODES,
    IM_LABELS,
    PlatformImConnectConfig,
)
from app.core.platform_config.im_credentials import (
    decrypt_credentials_payload,
    encrypt_credentials_payload,
    is_dingtalk_group_webhook,
    mask_webhook_url,
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



def _delivery_mode(
    row: PlatformImConnectConfig | None,
    payload: ImDeliveryConfigPut | None = None,
    *,
    channel: str | None = None,
) -> str:
    resolved = channel or (row.channel if row else None)
    if resolved == "dingtalk":
        return "group_webhook"
    if payload and payload.delivery_mode in IM_DELIVERY_MODES and payload.delivery_mode != "group_webhook":
        return payload.delivery_mode
    if row and row.delivery_mode in IM_DELIVERY_MODES:
        return row.delivery_mode
    return "corporate_app"


def _out_fields(channel: str, creds, row: PlatformImConnectConfig | None, source: str) -> dict:
    mode = _delivery_mode(row, channel=channel)
    base = {
        "channel": channel,
        "label": IM_LABELS[channel],
        "source": source,
        "delivery_mode": mode,
        "callback_domain": row.callback_domain if row and row.state == "active" else creds.callback_domain,
        "has_secret": False,
        "has_webhook_sign": False,
        "webhook_url": None,
    }
    if channel == "dingtalk":
        if mode == "group_webhook":
            base.update(
                webhook_url=mask_webhook_url(creds.webhook_url) if source != "none" else None,
                has_secret=bool(creds.webhook_url),
                has_webhook_sign=bool(creds.webhook_secret),
            )
        else:
            base.update(
                app_key=creds.app_key if source != "none" else None,
                agent_id=creds.agent_id if source != "none" else None,
                has_secret=bool(creds.app_secret),
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


def _validate_put(
    channel: str,
    payload: ImDeliveryConfigPut,
    mode: str,
    *,
    existing_webhook: str | None = None,
) -> dict[str, str]:
    if mode == "group_webhook":
        if channel != "dingtalk":
            raise PlatformConfigError("PLATFORM_IM_MODE_UNSUPPORTED", "群发模式目前仅支持钉钉", 422)
        webhook = (payload.webhook_url or "").strip() or (existing_webhook or "").strip()
        if not is_dingtalk_group_webhook(webhook):
            raise PlatformConfigError(
                "PLATFORM_IM_WEBHOOK_INVALID",
                "请填写钉钉自定义机器人 webhook（https://oapi.dingtalk.com/robot/send?access_token=…）",
                422,
            )
        return {"webhook_url": webhook}
    if mode == "user_delegated":
        if channel == "dingtalk":
            app_key = (payload.app_key or "").strip()
            agent_id = (payload.agent_id or "").strip()
            if not app_key or not agent_id:
                raise PlatformConfigError("PLATFORM_IM_FIELDS_REQUIRED", "钉钉 AppKey 与 AgentId 不能为空", 422)
            return {"app_key": app_key, "agent_id": agent_id}
        app_id = (payload.app_id or "").strip()
        if not app_id:
            raise PlatformConfigError("PLATFORM_IM_FIELDS_REQUIRED", "飞书 AppId 不能为空", 422)
        return {"app_id": app_id}
    callback = (payload.callback_domain or "").strip()
    if not callback:
        raise PlatformConfigError("PLATFORM_IM_CALLBACK_REQUIRED", "回调域名不能为空", 422)
    if channel == "dingtalk":
        app_key = (payload.app_key or "").strip()
        agent_id = (payload.agent_id or "").strip()
        if not app_key or not agent_id:
            raise PlatformConfigError("PLATFORM_IM_FIELDS_REQUIRED", "钉钉 AppKey 与 AgentId 不能为空", 422)
        return {"app_key": app_key, "agent_id": agent_id}
    app_id = (payload.app_id or "").strip()
    if not app_id:
        raise PlatformConfigError("PLATFORM_IM_FIELDS_REQUIRED", "飞书 AppId 不能为空", 422)
    return {"app_id": app_id}


def _resolve_secret(
    channel: str,
    payload: ImDeliveryConfigPut,
    existing_cipher: str | None,
) -> str:
    secret_key = {"dingtalk": "app_secret", "feishu": "app_secret"}[channel]
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
    mode = _delivery_mode(row, payload, channel=normalized)
    existing_webhook = None
    if existing_cipher:
        existing_webhook = decrypt_credentials_payload(existing_cipher).get("webhook_url")
    fields = _validate_put(normalized, payload, mode, existing_webhook=existing_webhook)
    if mode == "group_webhook":
        existing_sign = ""
        if existing_cipher:
            existing_sign = decrypt_credentials_payload(existing_cipher).get("webhook_secret") or ""
        sign = (payload.webhook_secret or "").strip() or existing_sign
        cred_payload = dict(fields)
        if sign:
            cred_payload["webhook_secret"] = sign
        callback = None
    else:
        secret = _resolve_secret(normalized, payload, existing_cipher)
        if not secret:
            raise PlatformConfigError("PLATFORM_IM_SECRET_REQUIRED", "应用 Secret 不能为空", 422)
        secret_key = {"dingtalk": "app_secret", "feishu": "app_secret"}[normalized]
        cred_payload = {**fields, secret_key: secret}
        callback = (payload.callback_domain or "").strip() or None
    probe_result = probe_im_credentials_bundle_from_payload(
        normalized, callback or "", cred_payload, delivery_mode=mode
    )
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
    row.delivery_mode = mode
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
        detail={"channel": normalized, "callback_domain": callback, "delivery_mode": mode},
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
    row.delivery_mode = "group_webhook" if normalized == "dingtalk" else "corporate_app"
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
    *,
    delivery_mode: str = "corporate_app",
) -> dict:
    from app.core.platform_config.im_credentials import ImCredentials

    if delivery_mode == "group_webhook":
        from app.core.config import get_settings
        from app.reports.scheduler.channels.im_sdk.group_webhook import post_group_webhook

        creds = ImCredentials(
            channel=channel,
            source="db",
            delivery_mode=delivery_mode,
            webhook_url=payload.get("webhook_url"),
            webhook_secret=payload.get("webhook_secret") or None,
        )
        if not creds.is_configured:
            return {
                "channel": channel,
                "skipped": False,
                "ok": False,
                "error": "钉钉群机器人 webhook 无效",
            }
        step = post_group_webhook(
            channel,
            get_settings(),
            summary="VitalSpan 连通性探测",
            artifact_ref="probe",
            webhook_url=creds.webhook_url,
            webhook_secret=creds.webhook_secret,
            max_attempts=2,
        )
        if step.get("status") == "delivered":
            return {"channel": channel, "skipped": False, "ok": True, "error": None}
        return {
            "channel": channel,
            "skipped": False,
            "ok": False,
            "error": step.get("error") or "钉钉群机器人探测失败",
        }
    if delivery_mode == "user_delegated":
        if channel == "feishu":
            creds = ImCredentials(
                channel=channel,
                source="db",
                delivery_mode=delivery_mode,
                app_id=payload.get("app_id"),
                app_secret=payload.get("app_secret"),
            )
            if creds.is_configured:
                return {"channel": channel, "skipped": False, "ok": True, "error": None}
            return {"channel": channel, "skipped": False, "ok": False, "error": "飞书 AppId/Secret 不完整"}
        if channel == "dingtalk":
            creds = ImCredentials(
                channel=channel,
                source="db",
                delivery_mode=delivery_mode,
                app_key=payload.get("app_key"),
                app_secret=payload.get("app_secret"),
                agent_id=payload.get("agent_id"),
            )
        else:
            return {"channel": channel, "skipped": False, "ok": False, "error": "未知通道"}
        return probe_im_credentials_bundle(creds)
    if channel == "dingtalk":
        creds = ImCredentials(
            channel=channel,
            source="db",
            callback_domain=callback_domain,
            app_key=payload.get("app_key"),
            app_secret=payload.get("app_secret"),
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
