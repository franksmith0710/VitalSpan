"""IM app credential probes via the same SDK stack as work-notice send."""

from __future__ import annotations

import logging
import time
from typing import Any

import lark_oapi as lark
from dingtalk.client import AppKeyClient
from lark_oapi.api.auth.v3 import InternalTenantAccessTokenRequest, InternalTenantAccessTokenRequestBody
from sqlalchemy.orm import Session
from wechatpy.enterprise import WeChatClient

from app.core.config import Settings, get_settings
from app.core.platform_config.im_credentials import ImCredentials

logger = logging.getLogger(__name__)

_TIMEOUT_SECONDS = 8
_PROBE_CACHE_SECONDS = 60
_DINGTALK_PLACEHOLDER_CORP_ID = "dingtalk"
_CHANNELS = ("dingtalk", "wecom", "feishu")

_probe_cache: dict[str, dict[str, Any]] | None = None
_probe_cache_at: float = 0.0
_group_live_cache: dict[str, tuple[float, dict[str, Any]]] = {}


def reset_im_probe_cache_for_tests() -> None:
    global _probe_cache, _probe_cache_at, _group_live_cache
    _probe_cache = None
    _probe_cache_at = 0.0
    _group_live_cache = {}


def _group_webhook(settings: Settings, channel: str) -> bool:
    return {
        "dingtalk": bool(settings.push_dingtalk_webhook),
        "wecom": bool(settings.push_wecom_webhook),
        "feishu": bool(settings.push_feishu_webhook),
    }.get(channel, False)


def has_im_credentials(settings: Settings, channel: str) -> bool:
    if channel == "dingtalk":
        return bool(settings.dingtalk_app_key and settings.dingtalk_app_secret and settings.dingtalk_agent_id)
    if channel == "wecom":
        return bool(settings.wecom_corp_id and settings.wecom_secret and settings.wecom_agent_id)
    if channel == "feishu":
        return bool(settings.feishu_app_id and settings.feishu_app_secret)
    return False


def probe_wecom_token(*, corp_id: str, secret: str) -> None:
    client = WeChatClient(corp_id, secret, timeout=_TIMEOUT_SECONDS)
    token = client.fetch_access_token()
    if not token:
        raise RuntimeError("企业微信 gettoken 未返回 access_token")


def probe_dingtalk_token(*, app_key: str, app_secret: str) -> None:
    client = AppKeyClient(
        _DINGTALK_PLACEHOLDER_CORP_ID,
        app_key,
        app_secret,
        timeout=_TIMEOUT_SECONDS,
        auto_retry=True,
    )
    body = client.get_access_token()
    if not body.get("access_token"):
        raise RuntimeError(body.get("errmsg") or "钉钉 gettoken 未返回 access_token")


def probe_feishu_token(*, app_id: str, app_secret: str) -> None:
    client = (
        lark.Client.builder()
        .app_id(app_id)
        .app_secret(app_secret)
        .timeout(_TIMEOUT_SECONDS)
        .build()
    )
    request = (
        InternalTenantAccessTokenRequest.builder()
        .request_body(
            InternalTenantAccessTokenRequestBody.builder()
            .app_id(app_id)
            .app_secret(app_secret)
            .build()
        )
        .build()
    )
    response = client.auth.v3.tenant_access_token.internal(request)
    if not response.success():
        raise RuntimeError(response.msg or str(response.code))
    if not response.data or not response.data.tenant_access_token:
        raise RuntimeError("飞书 tenant_access_token 为空")


def probe_im_credentials_bundle(creds: ImCredentials) -> dict[str, Any]:
    channel = creds.channel
    if not creds.is_configured:
        return {"channel": channel, "skipped": True, "ok": False, "error": None}
    if creds.delivery_mode == "group_webhook":
        if not creds.is_configured:
            return {
                "channel": channel,
                "skipped": False,
                "ok": False,
                "error": "钉钉群机器人 webhook 未配置或格式无效",
            }
        from app.core.config import get_settings
        from app.reports.scheduler.channels.im_sdk.group_webhook import post_group_webhook

        cache_key = f"{creds.webhook_url}|{bool(creds.webhook_secret)}"
        now = time.monotonic()
        cached = _group_live_cache.get(cache_key)
        if cached and now - cached[0] < _PROBE_CACHE_SECONDS:
            return cached[1]
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
            result = {"channel": channel, "skipped": False, "ok": True, "error": None}
        else:
            result = {
                "channel": channel,
                "skipped": False,
                "ok": False,
                "error": step.get("error") or "钉钉群机器人探测失败",
            }
        _group_live_cache[cache_key] = (now, result)
        return result
    if creds.delivery_mode == "user_delegated":
        if channel == "feishu":
            return {"channel": channel, "skipped": False, "ok": True, "error": None}
        if channel in {"dingtalk", "wecom"}:
            try:
                if channel == "wecom":
                    probe_wecom_token(corp_id=creds.corp_id or "", secret=creds.secret or "")
                else:
                    probe_dingtalk_token(app_key=creds.app_key or "", app_secret=creds.app_secret or "")
            except Exception as exc:
                logger.warning("IM probe failed (%s user_delegated): %s", channel, exc)
                return {"channel": channel, "skipped": False, "ok": False, "error": str(exc)}
            return {"channel": channel, "skipped": False, "ok": True, "error": None}
        return {
            "channel": channel,
            "skipped": False,
            "ok": False,
            "error": "用户委托模式暂不支持该通道",
        }
    try:
        if channel == "wecom":
            probe_wecom_token(corp_id=creds.corp_id or "", secret=creds.secret or "")
        elif channel == "dingtalk":
            probe_dingtalk_token(app_key=creds.app_key or "", app_secret=creds.app_secret or "")
        elif channel == "feishu":
            probe_feishu_token(app_id=creds.app_id or "", app_secret=creds.app_secret or "")
        else:
            return {"channel": channel, "skipped": True, "ok": False, "error": "未知通道"}
    except Exception as exc:
        logger.warning("IM probe failed (%s): %s", channel, exc)
        return {"channel": channel, "skipped": False, "ok": False, "error": str(exc)}
    return {"channel": channel, "skipped": False, "ok": True, "error": None}


def probe_channel_credentials(settings: Settings, channel: str) -> dict[str, Any]:
    """Backward-compatible env probe for smoke contracts."""
    from app.core.platform_config.im_resolve import resolve_im_credentials

    creds = resolve_im_credentials(settings=settings, channel=channel)
    return probe_im_credentials_bundle(creds)


def probe_im_channels(
    settings: Settings | None = None,
    *,
    session: Session | None = None,
    force_refresh: bool = False,
) -> dict[str, dict[str, Any]]:
    global _probe_cache, _probe_cache_at
    now = time.monotonic()
    if (
        not force_refresh
        and _probe_cache is not None
        and now - _probe_cache_at < _PROBE_CACHE_SECONDS
    ):
        return _probe_cache

    cfg = settings or get_settings()
    from app.core.platform_config.im_resolve import resolve_all_im_credentials

    creds_map = resolve_all_im_credentials(session, cfg)
    out: dict[str, dict[str, Any]] = {}
    for channel in _CHANNELS:
        creds = creds_map[channel]
        if not creds.is_configured:
            out[channel] = {
                "configured": False,
                "deliveryMode": creds.delivery_mode,
                "groupWebhook": _group_webhook(cfg, channel),
                "error": None,
            }
            continue
        result = probe_im_credentials_bundle(creds)
        out[channel] = {
            "configured": bool(result.get("ok")),
            "deliveryMode": creds.delivery_mode,
            "groupWebhook": _group_webhook(cfg, channel),
            "error": result.get("error"),
        }
    _probe_cache = out
    _probe_cache_at = now
    return out
