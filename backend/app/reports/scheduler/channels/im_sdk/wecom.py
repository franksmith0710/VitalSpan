"""WeCom work-notice via wechatpy (wraps official REST APIs)."""

from __future__ import annotations

from wechatpy.enterprise import WeChatClient

_TIMEOUT_SECONDS = 8


def send_wecom_text(
    *,
    corp_id: str,
    secret: str,
    agent_id: str,
    account_ids: list[str],
    text: str,
) -> None:
    client = WeChatClient(corp_id, secret, timeout=_TIMEOUT_SECONDS)
    result = client.message.send_text(int(agent_id or "0"), account_ids, text)
    invalid = (result or {}).get("invaliduser") or ""
    if invalid and len([item for item in invalid.split("|") if item]) >= len(account_ids):
        raise RuntimeError(f"企业微信接收人无效：{invalid}")
