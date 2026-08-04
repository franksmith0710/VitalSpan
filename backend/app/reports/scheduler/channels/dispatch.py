"""Report schedule delivery channels: email, WeCom, DingTalk."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.core.config import Settings, get_settings
from app.reports.scheduler.delivery_adapter import _deliver_explicit_mock, _send_smtp

logger = logging.getLogger(__name__)


def _send_wecom_webhook(
    settings: Settings,
    *,
    summary: str,
    artifact_ref: str,
) -> dict[str, Any]:
    url = settings.push_wecom_webhook
    if not url:
        return {"channel": "wecom", "status": "skipped", "error": "企微 webhook 未配置"}
    payload = {
        "msgtype": "text",
        "text": {"content": f"{summary}\n引用：{artifact_ref}"},
    }
    try:
        with httpx.Client(timeout=5.0) as client:
            resp = client.post(url, json=payload)
            resp.raise_for_status()
    except Exception as exc:
        logger.warning("WeCom webhook failed: %s", exc)
        return {"channel": "wecom", "status": "failed", "error": str(exc)}
    return {"channel": "wecom", "status": "delivered", "mode": "webhook"}


def _send_dingtalk_webhook(
    settings: Settings,
    *,
    summary: str,
    artifact_ref: str,
) -> dict[str, Any]:
    url = settings.push_dingtalk_webhook
    if not url:
        return {"channel": "dingtalk", "status": "skipped", "error": "钉钉 webhook 未配置"}
    payload = {
        "msgtype": "text",
        "text": {"content": f"{summary}\n引用：{artifact_ref}"},
    }
    try:
        with httpx.Client(timeout=5.0) as client:
            resp = client.post(url, json=payload)
            resp.raise_for_status()
    except Exception as exc:
        logger.warning("DingTalk webhook failed: %s", exc)
        return {"channel": "dingtalk", "status": "failed", "error": str(exc)}
    return {"channel": "dingtalk", "status": "delivered", "mode": "webhook"}


def deliver_to_channels(
    channels: list[str],
    *,
    artifact_ref: str,
    artifact_kind: str | None,
    recipient_emails: list[str] | None,
    attachments: list[tuple[bytes, str, str]],
    mock_mode: str | None,
    settings: Settings | None = None,
) -> dict[str, Any]:
    settings = settings or get_settings()
    if mock_mode is not None:
        return _deliver_explicit_mock(channels or ["email"], mock_mode)

    channel_list = channels or ["email"]
    steps: list[dict[str, Any]] = []
    summary = f"VitalSpan 定时报告（{artifact_kind or 'report'}）"

    for channel in channel_list:
        if channel == "email":
            steps.append(_send_smtp(
                artifact_ref,
                settings,
                recipient_emails=recipient_emails,
                artifact_kind=artifact_kind,
                attachments=attachments,
            ))
        elif channel == "wecom":
            steps.append(_send_wecom_webhook(settings, summary=summary, artifact_ref=artifact_ref))
        elif channel == "dingtalk":
            steps.append(_send_dingtalk_webhook(settings, summary=summary, artifact_ref=artifact_ref))
        else:
            steps.append({"channel": channel, "status": "skipped", "error": "未知通道"})

    delivered = [s for s in steps if s.get("status") == "delivered"]
    failed = [s for s in steps if s.get("status") == "failed"]
    if delivered and not failed:
        overall = "delivered"
    elif delivered:
        overall = "degraded"
    else:
        overall = "degraded" if any(s.get("status") != "skipped" for s in steps) else "unconfigured"
    error = next((s.get("error") for s in steps if s.get("error")), None)
    return {
        "status": overall,
        "attempts": 1,
        "deliverySteps": steps,
        "deliveryMode": "multi",
        "error": error,
    }
