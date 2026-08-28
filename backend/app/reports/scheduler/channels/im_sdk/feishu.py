"""Feishu work-notice via official lark-oapi SDK."""

from __future__ import annotations

import json

import lark_oapi as lark
from lark_oapi.api.im.v1 import CreateMessageRequest, CreateMessageRequestBody

_TIMEOUT_SECONDS = 8


def send_feishu_text(*, app_id: str, app_secret: str, account_ids: list[str], text: str) -> None:
    client = (
        lark.Client.builder()
        .app_id(app_id)
        .app_secret(app_secret)
        .timeout(_TIMEOUT_SECONDS)
        .build()
    )
    for account_id in account_ids:
        request = (
            CreateMessageRequest.builder()
            .receive_id_type("user_id")
            .request_body(
                CreateMessageRequestBody.builder()
                .receive_id(account_id)
                .msg_type("text")
                .content(json.dumps({"text": text}, ensure_ascii=False))
                .build()
            )
            .build()
        )
        response = client.im.v1.message.create(request)
        if not response.success():
            raise RuntimeError(response.msg or str(response.code))
