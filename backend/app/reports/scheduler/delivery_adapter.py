from __future__ import annotations

import smtplib
from email.message import EmailMessage

from app.core.config import Settings, get_settings


def _send_smtp(
    artifact_ref: str,
    settings: Settings,
    *,
    recipient_emails: list[str] | None = None,
) -> dict:
    to_addrs = recipient_emails or [settings.rpt_smtp_from]
    msg = EmailMessage()
    msg["Subject"] = "VitalSpan scheduled report"
    msg["From"] = settings.rpt_smtp_from
    msg["To"] = ", ".join(to_addrs)
    msg.set_content(f"Report artifact: {artifact_ref}")
    try:
        with smtplib.SMTP(settings.rpt_smtp_host, settings.rpt_smtp_port, timeout=5) as smtp:
            if settings.rpt_smtp_user and settings.rpt_smtp_password:
                smtp.login(settings.rpt_smtp_user, settings.rpt_smtp_password)
            smtp.send_message(msg)
    except OSError as exc:
        return {
            "channel": "email",
            "status": "failed",
            "attempt": 1,
            "mode": "smtp",
            "error": str(exc),
            "recipients": to_addrs,
        }
    return {
        "channel": "email",
        "status": "delivered",
        "attempt": 1,
        "mode": "smtp",
        "recipients": to_addrs,
    }


def _deliver_explicit_mock(channels: list[str], mock_mode: str) -> dict:
    """Test-only mock delivery; requires explicit X-Rpt-Delivery-Mock header."""
    channel_list = channels or ["email"]
    steps: list[dict] = []
    overall = "delivered"
    attempts = 1
    first_channel = channel_list[0]
    mode = mock_mode.strip().lower()
    for channel in channel_list:
        if mode == "fail" and channel == first_channel:
            steps.append({"channel": channel, "status": "failed", "attempt": 1, "mode": "mock"})
            overall = "degraded"
            continue
        if mode == "retry" and channel == first_channel:
            steps.append({"channel": channel, "status": "failed", "attempt": 1, "mode": "mock"})
            steps.append({"channel": channel, "status": "delivered", "attempt": 2, "mode": "mock"})
            attempts = 2
            continue
        steps.append({"channel": channel, "status": "delivered", "attempt": 1, "mode": "mock"})
    return {
        "status": overall,
        "attempts": attempts,
        "deliverySteps": steps,
        "deliveryMode": "mock",
    }


def deliver_artifact(
    artifact_ref: str,
    channels: list[str],
    mock_mode: str | None,
    settings: Settings | None = None,
    *,
    recipient_emails: list[str] | None = None,
) -> dict:
    settings = settings or get_settings()
    channel_list = channels or ["email"]

    if mock_mode is not None:
        return _deliver_explicit_mock(channel_list, mock_mode)

    step = _send_smtp(artifact_ref, settings, recipient_emails=recipient_emails)
    steps = [step]
    overall = "delivered" if step["status"] == "delivered" else "degraded"
    return {
        "status": overall,
        "attempts": 1,
        "deliverySteps": steps,
        "deliveryMode": "smtp",
    }
