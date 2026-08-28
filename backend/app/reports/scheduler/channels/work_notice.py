"""DingTalk / WeCom / Feishu work-notice (person) delivery."""

from __future__ import annotations

import logging
from typing import Any

from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.platform_config.im_credentials import ImCredentials
from app.core.platform_config.im_resolve import resolve_im_credentials
from app.reports.scheduler.channels.im_sdk import (
    probe_im_channels,
    send_dingtalk_text,
    send_feishu_text,
    send_wecom_text,
)
from app.reports.scheduler.channels.im_sdk.probe import probe_im_credentials_bundle

logger = logging.getLogger(__name__)

_CHANNEL_LABELS = {"dingtalk": "钉钉", "wecom": "企业微信", "feishu": "飞书"}


def app_configured(
    channel: str,
    *,
    session: Session | None = None,
    settings: Settings | None = None,
    creds: ImCredentials | None = None,
) -> bool:
    resolved = creds or resolve_im_credentials(session, channel=channel, settings=settings)
    return resolved.is_configured


def probe_im_apps(
    settings: Settings | None = None,
    *,
    session: Session | None = None,
    force_refresh: bool = False,
) -> dict[str, dict[str, Any]]:
    return probe_im_channels(settings, session=session, force_refresh=force_refresh)


def send_work_notices(
    channel: str,
    *,
    account_ids: list[str],
    summary: str,
    artifact_ref: str,
    settings: Settings | None = None,
    session: Session | None = None,
    creds: ImCredentials | None = None,
) -> dict[str, Any]:
    label = _CHANNEL_LABELS.get(channel, channel)
    cfg = settings or get_settings()
    resolved = creds or resolve_im_credentials(session, channel=channel, settings=cfg)
    if not account_ids:
        return {"channel": channel, "status": "failed", "mode": "work_notice", "error": f"{label}没有可投递的个人账号"}
    if not resolved.is_configured:
        return {
            "channel": channel,
            "status": "failed",
            "mode": "work_notice",
            "error": f"{label}应用未配置，无法发给个人账号。请配置平台 {label} App 凭证。",
            "to": account_ids,
        }
    probe = probe_im_credentials_bundle(resolved)
    if not probe.get("ok"):
        return {
            "channel": channel,
            "status": "failed",
            "mode": "work_notice",
            "error": probe.get("error") or f"{label}应用探测失败",
            "to": account_ids,
        }
    text = f"{summary}\n引用：{artifact_ref}"
    try:
        if channel == "dingtalk":
            send_dingtalk_text(
                app_key=resolved.app_key or "",
                app_secret=resolved.app_secret or "",
                agent_id=resolved.agent_id or "",
                account_ids=account_ids,
                text=text,
            )
        elif channel == "wecom":
            send_wecom_text(
                corp_id=resolved.corp_id or "",
                secret=resolved.secret or "",
                agent_id=resolved.agent_id or "",
                account_ids=account_ids,
                text=text,
            )
        elif channel == "feishu":
            send_feishu_text(
                app_id=resolved.app_id or "",
                app_secret=resolved.app_secret or "",
                account_ids=account_ids,
                text=text,
            )
        else:
            return {"channel": channel, "status": "skipped", "error": "未知通道"}
    except Exception as exc:
        logger.warning("%s work notice failed: %s", label, exc)
        return {
            "channel": channel,
            "status": "failed",
            "mode": "work_notice",
            "error": str(exc),
            "to": account_ids,
        }
    return {"channel": channel, "status": "delivered", "mode": "work_notice", "to": account_ids}
