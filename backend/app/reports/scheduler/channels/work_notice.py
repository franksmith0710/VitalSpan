"""DingTalk / WeCom / Feishu work-notice (person) delivery."""

from __future__ import annotations

import logging
from typing import Any

from app.core.config import Settings
from app.reports.scheduler.channels.im_sdk import (
    probe_im_channels,
    send_dingtalk_text,
    send_feishu_text,
    send_wecom_text,
)
from app.reports.scheduler.channels.im_sdk.probe import has_im_credentials

logger = logging.getLogger(__name__)

_CHANNEL_LABELS = {"dingtalk": "钉钉", "wecom": "企业微信", "feishu": "飞书"}


def app_configured(settings: Settings, channel: str) -> bool:
    return has_im_credentials(settings, channel)


def probe_im_apps(settings: Settings, *, force_refresh: bool = False) -> dict[str, dict[str, Any]]:
    return probe_im_channels(settings, force_refresh=force_refresh)


def send_work_notices(
    channel: str,
    *,
    account_ids: list[str],
    summary: str,
    artifact_ref: str,
    settings: Settings,
) -> dict[str, Any]:
    label = _CHANNEL_LABELS.get(channel, channel)
    if not account_ids:
        return {"channel": channel, "status": "failed", "mode": "work_notice", "error": f"{label}没有可投递的个人账号"}
    if not app_configured(settings, channel):
        return {
            "channel": channel,
            "status": "failed",
            "mode": "work_notice",
            "error": f"{label}应用未配置，无法发给个人账号。请配置平台 {label} App 凭证。",
            "to": account_ids,
        }
    text = f"{summary}\n引用：{artifact_ref}"
    try:
        if channel == "dingtalk":
            send_dingtalk_text(
                app_key=settings.dingtalk_app_key or "",
                app_secret=settings.dingtalk_app_secret or "",
                agent_id=settings.dingtalk_agent_id or "",
                account_ids=account_ids,
                text=text,
            )
        elif channel == "wecom":
            send_wecom_text(
                corp_id=settings.wecom_corp_id or "",
                secret=settings.wecom_secret or "",
                agent_id=settings.wecom_agent_id or "",
                account_ids=account_ids,
                text=text,
            )
        elif channel == "feishu":
            send_feishu_text(
                app_id=settings.feishu_app_id or "",
                app_secret=settings.feishu_app_secret or "",
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
