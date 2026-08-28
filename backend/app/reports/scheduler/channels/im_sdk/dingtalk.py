"""DingTalk work-notice via dingtalk-sdk (official top/open API)."""

from __future__ import annotations

from dingtalk.client import AppKeyClient
from dingtalk.model.message import TextBody

_TIMEOUT_SECONDS = 8
# AppKeyClient 构造需要 corp_id；oapi gettoken 仅使用 appkey/appsecret（与开放平台文档一致）。
_PLACEHOLDER_CORP_ID = "dingtalk"


def send_dingtalk_text(
    *,
    app_key: str,
    app_secret: str,
    agent_id: str,
    account_ids: list[str],
    text: str,
) -> None:
    client = AppKeyClient(
        _PLACEHOLDER_CORP_ID,
        app_key,
        app_secret,
        timeout=_TIMEOUT_SECONDS,
        auto_retry=True,
    )
    client.message.asyncsend_v2(
        TextBody(content=text),
        int(agent_id or "0"),
        userid_list=account_ids,
    )
