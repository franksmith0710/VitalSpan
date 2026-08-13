from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage

from sqlalchemy.orm import Session

from app.core.platform_config.resolve import resolve_email_smtp
from app.core.platform_config.smtp_probe import connect_smtp, format_smtp_error, probe_smtp_connection
from app.core.platform_config.smtp_settings import SmtpSettings

logger = logging.getLogger(__name__)


_ARTIFACT_EMAIL: dict[str, tuple[str, str]] = {
    "visual_snapshot": (
        "VitalSpan 看板定时报告（可视化快照）",
        "见附件 PDF：看板/大屏画布可视化快照。",
    ),
    "layout_inventory": (
        "VitalSpan 看板定时报告（布局摘要预览）",
        "附件为看板组件布局清单 PDF/CSV（历史或降级产物），非图表渲染快照。\n\n下载引用：{ref}",
    ),
    "template_render": (
        "VitalSpan 报表定时报告",
        "报表已生成，附件引用如下：\n\n{ref}",
    ),
    "standard_render": (
        "VitalSpan 标准分析定时报告",
        "标准分析结果已生成，见附件 PDF。\n\n下载引用：{ref}",
    ),
}


def _send_smtp(
    artifact_ref: str,
    smtp: SmtpSettings,
    *,
    recipient_emails: list[str] | None = None,
    artifact_kind: str | None = None,
    attachment_bytes: bytes | None = None,
    attachment_filename: str | None = None,
    attachment_mime: str | None = None,
    attachments: list[tuple[bytes, str, str]] | None = None,
) -> dict:
    if not smtp.is_configured:
        return {
            "channel": "email",
            "status": "failed",
            "attempt": 1,
            "mode": "smtp",
            "error": "SMTP 未配置：请在系统管理 → 平台对接配置邮件发信。",
            "recipients": recipient_emails or [],
        }
    to_addrs = recipient_emails or [smtp.from_addr]
    subject, body_tpl = _ARTIFACT_EMAIL.get(
        artifact_kind or "",
        ("VitalSpan scheduled report", "Report artifact: {ref}"),
    )
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = smtp.from_addr
    msg["To"] = ", ".join(to_addrs)
    body = body_tpl.format(ref=artifact_ref) if "{ref}" in body_tpl else body_tpl
    msg.set_content(body)
    att_list = attachments or []
    if not att_list and attachment_bytes and attachment_filename:
        att_list = [(attachment_bytes, attachment_mime or "application/pdf", attachment_filename)]
    for att_bytes, att_mime, att_name in att_list:
        maintype, _, subtype = (att_mime or "application/pdf").partition("/")
        subtype = subtype or "octet-stream"
        msg.add_attachment(att_bytes, maintype=maintype, subtype=subtype, filename=att_name)
    try:
        with connect_smtp(smtp, timeout=5) as conn:
            if smtp.username and smtp.password:
                conn.login(smtp.username, smtp.password)
            conn.send_message(msg)
    except OSError as exc:
        error = format_smtp_error(exc, smtp)
        logger.warning("SMTP delivery failed: %s", error)
        return {
            "channel": "email",
            "status": "failed",
            "attempt": 1,
            "mode": "smtp",
            "error": error,
            "recipients": to_addrs,
        }
    except smtplib.SMTPAuthenticationError as exc:
        error = f"SMTP 认证失败：请检查发件账号与授权码。{exc.smtp_code}"
        return {
            "channel": "email",
            "status": "failed",
            "attempt": 1,
            "mode": "smtp",
            "error": error,
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


def probe_smtp_health(session: Session | None = None) -> dict:
    smtp = resolve_email_smtp(session)
    result = probe_smtp_connection(smtp)
    return result


def deliver_artifact(
    artifact_ref: str,
    channels: list[str],
    mock_mode: str | None,
    session: Session | None = None,
    *,
    recipient_emails: list[str] | None = None,
    artifact_kind: str | None = None,
    attachment_bytes: bytes | None = None,
    attachment_filename: str | None = None,
    attachment_mime: str | None = None,
) -> dict:
    channel_list = channels or ["email"]
    if mock_mode is not None:
        return _deliver_explicit_mock(channel_list, mock_mode)
    smtp = resolve_email_smtp(session)
    step = _send_smtp(
        artifact_ref,
        smtp,
        recipient_emails=recipient_emails,
        artifact_kind=artifact_kind,
        attachment_bytes=attachment_bytes,
        attachment_filename=attachment_filename,
        attachment_mime=attachment_mime,
    )
    steps = [step]
    overall = "delivered" if step["status"] == "delivered" else "degraded"
    error = step.get("error") if step["status"] != "delivered" else None
    return {
        "status": overall,
        "attempts": 1,
        "deliverySteps": steps,
        "deliveryMode": "smtp",
        "error": error,
        "source": smtp.source,
    }
