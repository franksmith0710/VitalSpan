"""Shared Feishu IM helpers for work-notice delivery."""

from __future__ import annotations

FeishuAttachment = tuple[bytes, str, str]

# 用户 OAuth 一次授权应包含的完整 scope（定时推送：文字 + PDF/Excel 文件消息）。
# 邮件通道走 SMTP，不在此列。
FEISHU_PUSH_SCOPE_PARTS: tuple[str, ...] = (
    "offline_access",
    "im:message",
    "im:message.send_as_user",
    "im:resource",
)

FEISHU_PUSH_SCOPES = " ".join(FEISHU_PUSH_SCOPE_PARTS)


def normalize_feishu_push_scopes(extra: str | None = None) -> str:
    """合并额外 hint，但始终保留完整推送 bundle（避免只弹单项补授权）。"""
    parts = list(FEISHU_PUSH_SCOPE_PARTS)
    if extra:
        for token in extra.split():
            value = token.strip()
            if value and value not in parts:
                parts.append(value)
    return " ".join(parts)


def feishu_receive_id_type(account_id: str) -> str:
    if account_id.startswith("ou_"):
        return "open_id"
    return "user_id"


def feishu_upload_file_type(filename: str, mime: str) -> str:
    lower = filename.lower()
    mime_lower = (mime or "").lower()
    if lower.endswith(".pdf") or mime_lower == "application/pdf":
        return "pdf"
    if lower.endswith(".xls") or mime_lower == "application/vnd.ms-excel":
        return "xls"
    if lower.endswith((".xlsx", ".xlsm")) or "spreadsheet" in mime_lower or "excel" in mime_lower:
        return "stream"
    return "stream"
