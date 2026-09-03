"""Shared Feishu IM helpers for work-notice delivery."""

from __future__ import annotations

FeishuAttachment = tuple[bytes, str, str]

FEISHU_PUSH_SCOPES = "offline_access im:message.send_as_user im:message im:resource"


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
