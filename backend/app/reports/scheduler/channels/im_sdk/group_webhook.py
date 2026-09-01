"""IM group-robot webhook POST (DingTalk / WeCom / Feishu)."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.core.config import Settings

logger = logging.getLogger(__name__)

_LABELS = {"wecom": "企业微信", "dingtalk": "钉钉", "feishu": "飞书"}


def post_group_webhook(
    channel: str,
    settings: Settings,
    *,
    summary: str,
    artifact_ref: str,
    webhook_url: str | None = None,
) -> dict[str, Any]:
    url = webhook_url or {
        "wecom": settings.push_wecom_webhook,
        "dingtalk": settings.push_dingtalk_webhook,
        "feishu": settings.push_feishu_webhook,
    }.get(channel)
    label = _LABELS.get(channel, channel)
    if not url:
        return {
            "channel": f"{channel}_group",
            "status": "failed",
            "mode": "group_webhook",
            "error": f"{label}群 webhook 未配置",
        }
    if channel == "feishu":
        payload: dict[str, Any] = {
            "msg_type": "text",
            "content": {"text": f"{summary}\n引用：{artifact_ref}"},
        }
    else:
        payload = {"msgtype": "text", "text": {"content": f"{summary}\n引用：{artifact_ref}"}}
    try:
        with httpx.Client(timeout=5.0) as client:
            resp = client.post(url, json=payload)
            resp.raise_for_status()
            body = resp.json() if resp.content else {}
    except Exception as exc:
        logger.warning("%s group webhook failed: %s", label, exc)
        return {
            "channel": f"{channel}_group",
            "status": "failed",
            "mode": "group_webhook",
            "error": str(exc),
        }
    errcode = body.get("errcode")
    if errcode not in (0, None):
        return {
            "channel": f"{channel}_group",
            "status": "failed",
            "mode": "group_webhook",
            "error": str(body.get("errmsg") or errcode),
        }
    return {"channel": f"{channel}_group", "status": "delivered", "mode": "group_webhook"}
