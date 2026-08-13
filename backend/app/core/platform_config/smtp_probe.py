from __future__ import annotations

import smtplib
import uuid

from app.core.platform_config.smtp_settings import SmtpSettings


def connect_smtp(smtp: SmtpSettings, *, timeout: int) -> smtplib.SMTP:
    host = smtp.host
    port = smtp.port
    if port == 465:
        conn = smtplib.SMTP_SSL(host, port, timeout=timeout)
        conn.ehlo()
        return conn
    conn = smtplib.SMTP(host, port, timeout=timeout)
    conn.ehlo()
    if port == 587:
        conn.starttls()
        conn.ehlo()
    return conn


def format_smtp_error(exc: OSError, smtp: SmtpSettings) -> str:
    host = smtp.host
    port = smtp.port
    if isinstance(exc, ConnectionRefusedError) or "Connection refused" in str(exc):
        hint = (
            "请在系统管理 → 平台对接配置邮件 SMTP，或本地启动 MailHog。"
            if smtp.source == "env"
            else "请在系统管理 → 平台对接检查邮件 SMTP 配置。"
        )
        return f"邮件投递失败：无法连接 SMTP {host}:{port}。{hint}"
    if "timed out" in str(exc).lower():
        return f"邮件投递失败：连接 SMTP {host}:{port} 超时，请检查网络与防火墙。"
    return f"邮件投递失败：{exc}"


def probe_smtp_connection(smtp: SmtpSettings, *, timeout: int = 8) -> dict:
    if not smtp.is_configured:
        return {
            "status": "unconfigured",
            "host": smtp.host or None,
            "port": smtp.port or None,
            "source": smtp.source,
            "error": "SMTP 未配置：请在系统管理 → 平台对接配置邮件发信。",
        }
    try:
        with connect_smtp(smtp, timeout=timeout) as conn:
            if smtp.username and smtp.password:
                conn.login(smtp.username, smtp.password)
    except OSError as exc:
        return {
            "status": "unreachable",
            "host": smtp.host,
            "port": smtp.port,
            "source": smtp.source,
            "error": format_smtp_error(exc, smtp),
        }
    except smtplib.SMTPAuthenticationError as exc:
        return {
            "status": "unreachable",
            "host": smtp.host,
            "port": smtp.port,
            "source": smtp.source,
            "error": f"SMTP 认证失败：请检查发件账号与授权码。{exc.smtp_code}",
        }
    return {
        "status": "reachable",
        "host": smtp.host,
        "port": smtp.port,
        "source": smtp.source,
        "error": None,
    }
