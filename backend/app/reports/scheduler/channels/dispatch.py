"""Report schedule delivery channels: email, DingTalk, Feishu."""

from __future__ import annotations

from typing import Any

from app.core.config import Settings, get_settings
from app.core.platform_config.resolve import resolve_email_smtp
from app.core.platform_config.slots import EMAIL_SLOT_QQ, normalize_email_slot
from app.reports.scheduler.channels import work_notice
from app.reports.scheduler.channels.im_sdk.group_webhook import post_group_webhook
from app.reports.scheduler.delivery_adapter import _deliver_explicit_mock, _send_smtp

_IM_CHANNELS = ("dingtalk", "feishu")
_IM_LABELS = {"dingtalk": "钉钉", "feishu": "飞书"}


def _send_group_webhook(
    channel: str,
    settings: Settings,
    *,
    summary: str,
    artifact_ref: str,
    webhook_url: str | None = None,
    webhook_secret: str | None = None,
) -> dict[str, Any]:
    return post_group_webhook(
        channel,
        settings,
        summary=summary,
        artifact_ref=artifact_ref,
        webhook_url=webhook_url,
        webhook_secret=webhook_secret,
    )


def _dingtalk_group_target(settings: Settings, session) -> tuple[str | None, str | None]:
    from app.core.platform_config.im_resolve import resolve_im_credentials

    creds = resolve_im_credentials(session, channel="dingtalk", settings=settings)
    if creds.source == "none":
        return None, None
    url = creds.webhook_url
    if not url and creds.source == "env":
        url = settings.push_dingtalk_webhook
    secret = creds.webhook_secret
    if not secret and creds.source == "env":
        secret = getattr(settings, "push_dingtalk_robot_secret", None)
    return url, secret


def _channel_uses_group_webhook(channel: str, session) -> bool:
    return channel == "dingtalk"


def _person_step(
    channel: str,
    *,
    targets: list[tuple[str, str]],
    missing: list[str],
    summary: str,
    artifact_ref: str,
    attachments: list[tuple[bytes, str, str]],
    settings: Settings,
    session=None,
    owner_id=None,
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
        attachments=attachments if channel == "feishu" else None,
        settings=settings,
        session=session,
        owner_id=owner_id,
    )
    if targets:
        step = {
            **step,
            "recipient_usernames": [username for username, _ in targets],
            "to": step.get("to") or [account_id for _, account_id in targets],
        }
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
    session=None,
    owner_id=None,
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
        elif channel == "wecom":
            steps.append({
                "channel": "wecom",
                "status": "skipped",
                "error": "企业微信投递已下线",
            })
        elif channel in _IM_CHANNELS:
            if _channel_uses_group_webhook(channel, session):
                hook_url, hook_secret = _dingtalk_group_target(settings, session)
                steps.append(
                    _send_group_webhook(
                        channel,
                        settings,
                        summary=summary,
                        artifact_ref=artifact_ref,
                        webhook_url=hook_url,
                        webhook_secret=hook_secret,
                    )
                )
            else:
                steps.append(_person_step(
                    channel,
                    targets=targets_by_channel.get(channel, []),
                    missing=missing_by_channel.get(channel, []),
                    summary=summary,
                    artifact_ref=artifact_ref,
                    attachments=attachments,
                    settings=settings,
                    session=session,
                    owner_id=owner_id,
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
    elif any(s.get("status") == "failed" for s in steps):
        overall = "failed"
    else:
        overall = "unconfigured"
    error = next((s.get("error") for s in steps if s.get("error")), None)
    return {
        "status": overall,
        "attempts": 1,
        "deliverySteps": steps,
        "deliveryMode": "multi",
        "error": error,
    }
