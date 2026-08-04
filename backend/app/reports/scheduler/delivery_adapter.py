from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage

from app.core.config import Settings, get_settings

logger = logging.getLogger(__name__)


def _format_smtp_error(exc: OSError, settings: Settings) -> str:
    host = settings.rpt_smtp_host
    port = settings.rpt_smtp_port
    if isinstance(exc, ConnectionRefusedError) or "Connection refused" in str(exc):
        return (
            f"邮件投递失败：无法连接 SMTP {host}:{port}。"
            "本地开发请启动 MailHog（端口 1025）或配置 RPT_SMTP_* 环境变量。"
        )
    if "timed out" in str(exc).lower():
        return f"邮件投递失败：连接 SMTP {host}:{port} 超时，请检查网络与防火墙。"
    return f"邮件投递失败：{exc}"


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
}


def _send_smtp(
    artifact_ref: str,
    settings: Settings,
    *,
    recipient_emails: list[str] | None = None,
    artifact_kind: str | None = None,
    attachment_bytes: bytes | None = None,
    attachment_filename: str | None = None,
    attachment_mime: str | None = None,
    attachments: list[tuple[bytes, str, str]] | None = None,
) -> dict:
    to_addrs = recipient_emails or [settings.rpt_smtp_from]
    subject, body_tpl = _ARTIFACT_EMAIL.get(
        artifact_kind or "",
        ("VitalSpan scheduled report", "Report artifact: {ref}"),
    )
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.rpt_smtp_from
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
        with smtplib.SMTP(settings.rpt_smtp_host, settings.rpt_smtp_port, timeout=5) as smtp:
            if settings.rpt_smtp_user and settings.rpt_smtp_password:
                smtp.login(settings.rpt_smtp_user, settings.rpt_smtp_password)
            smtp.send_message(msg)
    except OSError as exc:
        error = _format_smtp_error(exc, settings)
        logger.warning("SMTP delivery failed: %s", error)
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


def probe_smtp_health(settings: Settings | None = None) -> dict:
    settings = settings or get_settings()
    host = settings.rpt_smtp_host.strip()
    port = settings.rpt_smtp_port
    if not host or not settings.rpt_smtp_from.strip():
        return {
            "status": "unconfigured",
            "host": host or None,
            "port": port,
            "error": "SMTP 未配置：请设置 RPT_SMTP_HOST 与 RPT_SMTP_FROM。",
        }
    try:
        with smtplib.SMTP(host, port, timeout=3) as smtp:
            smtp.ehlo()
    except OSError as exc:
        return {
            "status": "unreachable",
            "host": host,
            "port": port,
            "error": _format_smtp_error(exc, settings),
        }
    return {"status": "reachable", "host": host, "port": port, "error": None}


def deliver_artifact(
    artifact_ref: str,
    channels: list[str],
    mock_mode: str | None,
    settings: Settings | None = None,
    *,
    recipient_emails: list[str] | None = None,
    artifact_kind: str | None = None,
    attachment_bytes: bytes | None = None,
    attachment_filename: str | None = None,
    attachment_mime: str | None = None,
) -> dict:
    settings = settings or get_settings()
    channel_list = channels or ["email"]

    if mock_mode is not None:
        return _deliver_explicit_mock(channel_list, mock_mode)

    step = _send_smtp(
        artifact_ref,
        settings,
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
    }
