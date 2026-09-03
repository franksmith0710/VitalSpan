"""Feishu IM send as user (user_access_token)."""

from __future__ import annotations

from app.reports.scheduler.channels.im_sdk.feishu_common import FeishuAttachment
from app.reports.scheduler.channels.im_sdk.feishu_files_http import deliver_feishu_as_user_http


def send_feishu_text_as_user(*, access_token: str, account_ids: list[str], text: str) -> None:
    deliver_feishu_as_user(
        access_token=access_token,
        account_ids=account_ids,
        text=text,
        attachments=[],
    )


def deliver_feishu_as_user(
    *,
    access_token: str,
    account_ids: list[str],
    text: str,
    attachments: list[FeishuAttachment],
) -> None:
    deliver_feishu_as_user_http(
        access_token=access_token,
        account_ids=account_ids,
        text=text,
        attachments=attachments,
    )
