"""Feishu IM send as user (user_access_token)."""

from __future__ import annotations

import json

import httpx

_TIMEOUT = 8.0
_MESSAGES_URL = "https://open.feishu.cn/open-apis/im/v1/messages"


def send_feishu_text_as_user(*, access_token: str, account_ids: list[str], text: str) -> None:
    headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}
    content = json.dumps({"text": text}, ensure_ascii=False)
    with httpx.Client(timeout=_TIMEOUT) as client:
        for account_id in account_ids:
            resp = client.post(
                _MESSAGES_URL,
                params={"receive_id_type": "user_id"},
                headers=headers,
                json={
                    "receive_id": account_id,
                    "msg_type": "text",
                    "content": content,
                },
            )
            body = resp.json()
            if resp.status_code >= 400 or body.get("code") not in (0, None):
                raise RuntimeError(body.get("msg") or str(body.get("code")))
