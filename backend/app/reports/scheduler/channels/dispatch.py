"""Report schedule delivery channels: email, WeCom, DingTalk, Feishu."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.core.config import Settings, get_settings
from app.core.platform_config.resolve import resolve_email_smtp
from app.core.platform_config.slots import EMAIL_SLOT_QQ, normalize_email_slot
from app.reports.scheduler.channels import work_notice
from app.reports.scheduler.delivery_adapter import _deliver_explicit_mock, _send_smtp

logger = logging.getLogger(__name__)

_IM_CHANNELS = ("wecom", "dingtalk", "feishu")
_IM_LABELS = {"wecom": "企业微信", "dingtalk": "钉钉", "feishu": "飞书"}


def _send_group_webhook(
    channel: str,
    settings: Settings,
    *,
    summary: str,
    artifact_ref: str,
) -> dict[str, Any]:
    url = {
        "wecom": settings.push_wecom_webhook,
        "dingtalk": settings.push_dingtalk_webhook,
        "feishu": settings.push_feishu_webhook,
    }.get(channel)
    label = _IM_LABELS.get(channel, channel)
    if not url:
        return {
            "channel": f"{channel}_group",
            "status": "skipped",
            "mode": "group_webhook",
            "error": f"{label}群 webhook 未配置",
        }
    payload: dict[str, Any]
    if channel == "feishu":
        payload = {"msg_type": "text", "content": {"text": f"{summary}\n引用：{artifact_ref}"}}
    else:
        payload = {"msgtype": "text", "text": {"content": f"{summary}\n引用：{artifact_ref}"}}
    # 群机器人 webhook 为厂商提供的固定 HTTPS URL，无官方 Python SDK，直 POST JSON。
    try:
        with httpx.Client(timeout=5.0) as client:
            resp = client.post(url, json=payload)
            resp.raise_for_status()
    except Exception as exc:
        logger.warning("%s group webhook failed: %s", label, exc)
        return {
            "channel": f"{channel}_group",
            "status": "failed",
            "mode": "group_webhook",
            "error": str(exc),
        }
    return {"channel": f"{channel}_group", "status": "delivered", "mode": "group_webhook"}


def _person_step(
    channel: str,
    *,
    targets: list[tuple[str, str]],
    missing: list[str],
    summary: str,
    artifact_ref: str,
    settings: Settings,
) -> dict[str, Any]:
    label = _IM_LABELS.get(channel, channel)
    if not targets:
        names = "、".join(missing) if missing else "收件人"
        return {
            "channel": channel,
            "status": "failed",
            "mode": "work_notice",
            "error": f"以下用户未绑定{label}账号：{names}。不会改发到群。",
            "missing": missing,
        }
    step = work_notice.send_work_notices(
        channel,
        account_ids=[account_id for _, account_id in targets],
        summary=summary,
        artifact_ref=artifact_ref,
        settings=settings,
    )
    if missing:
        step = {
            **step,
            "missing": missing,
            "error": (
                (step.get("error") + "；") if step.get("error") else ""
            )
            + f"未绑定{label}账号：{'、'.join(missing)}",
        }
        if step.get("status") == "delivered":
            step["status"] = "degraded"
    return step


def deliver_to_channels(
    channels: list[str],
    *,
    artifact_ref: str,
    artifact_kind: str | None,
    recipient_emails: list[str] | None,
    attachments: list[tuple[bytes, str, str]],
    mock_mode: str | None,
    settings: Settings | None = None,
    im_targets: dict[str, list[tuple[str, str]]] | None = None,
    im_missing: dict[str, list[str]] | None = None,
    notify_group: bool = False,
    email_smtp_slot: str | None = EMAIL_SLOT_QQ,
) -> dict[str, Any]:
    settings = settings or get_settings()
    if mock_mode is not None:
        return _deliver_explicit_mock(channels or ["email"], mock_mode)

    channel_list = channels or ["email"]
    steps: list[dict[str, Any]] = []
    summary = f"VitalSpan 定时报告（{artifact_kind or 'report'}）"
    targets_by_channel = im_targets or {}
    missing_by_channel = im_missing or {}

    for channel in channel_list:
        if channel == "email":
            smtp = resolve_email_smtp(slot=normalize_email_slot(email_smtp_slot))
            steps.append(_send_smtp(
                artifact_ref,
                smtp,
                recipient_emails=recipient_emails,
                artifact_kind=artifact_kind,
                attachments=attachments,
            ))
        elif channel in _IM_CHANNELS:
            steps.append(_person_step(
                channel,
                targets=targets_by_channel.get(channel, []),
                missing=missing_by_channel.get(channel, []),
                summary=summary,
                artifact_ref=artifact_ref,
                settings=settings,
            ))
            if notify_group:
                steps.append(_send_group_webhook(
                    channel, settings, summary=summary, artifact_ref=artifact_ref,
                ))
        else:
            steps.append({"channel": channel, "status": "skipped", "error": "未知通道"})

    delivered = [s for s in steps if s.get("status") == "delivered"]
    failed = [s for s in steps if s.get("status") in {"failed", "degraded"}]
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
