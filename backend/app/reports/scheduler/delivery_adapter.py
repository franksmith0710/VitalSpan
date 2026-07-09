from __future__ import annotations

import smtplib
from email.message import EmailMessage

from app.core.config import Settings, get_settings


def _send_smtp(artifact_ref: str, settings: Settings) -> dict:
    msg = EmailMessage()
    msg["Subject"] = "VitalSpan scheduled report"
    msg["From"] = settings.rpt_smtp_from
    msg["To"] = settings.rpt_smtp_from
    msg.set_content(f"Report artifact: {artifact_ref}")
    try:
        with smtplib.SMTP(settings.rpt_smtp_host, settings.rpt_smtp_port, timeout=5) as smtp:
            if settings.rpt_smtp_user and settings.rpt_smtp_password:
                smtp.login(settings.rpt_smtp_user, settings.rpt_smtp_password)
            smtp.send_message(msg)
        return {"channel": "email", "status": "delivered", "attempt": 1, "mode": "smtp"}
    except OSError as exc:
        return {
            "channel": "email",
            "status": "failed",
            "attempt": 1,
            "mode": "smtp",
            "error": str(exc),
        }


def deliver_artifact(
    artifact_ref: str,
    channels: list[str],
    mock_mode: str | None,
    settings: Settings | None = None,
) -> dict:
    settings = settings or get_settings()
    channel_list = channels or ["email"]
    steps: list[dict] = []
    overall = "delivered"
    attempts = 1

    if settings.rpt_delivery_mode == "smtp" and mock_mode is None:
        step = _send_smtp(artifact_ref, settings)
        steps.append(step)
        if step["status"] != "delivered":
            overall = "degraded"
        return {"status": overall, "attempts": attempts, "deliverySteps": steps, "deliveryMode": "smtp"}

    first_channel = channel_list[0]
    for channel in channel_list:
        if mock_mode == "fail" and channel == first_channel:
            steps.append({"channel": channel, "status": "failed", "attempt": 1, "mode": "mock"})
            overall = "degraded"
            continue
        if mock_mode == "retry" and channel == first_channel:
            steps.append({"channel": channel, "status": "failed", "attempt": 1, "mode": "mock"})
            steps.append({"channel": channel, "status": "delivered", "attempt": 2, "mode": "mock"})
            attempts = 2
            continue
        steps.append({"channel": channel, "status": "delivered", "attempt": 1, "mode": "mock"})
    return {"status": overall, "attempts": attempts, "deliverySteps": steps, "deliveryMode": "mock"}
