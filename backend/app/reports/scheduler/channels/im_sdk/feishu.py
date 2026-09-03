"""Feishu work-notice via official lark-oapi SDK."""

from __future__ import annotations

import json
from io import BytesIO

import lark_oapi as lark
from lark_oapi.api.im.v1 import (
    CreateFileRequest,
    CreateFileRequestBody,
    CreateMessageRequest,
    CreateMessageRequestBody,
)

from app.reports.scheduler.channels.im_sdk.feishu_common import (
    FeishuAttachment,
    feishu_receive_id_type,
    feishu_upload_file_type,
)

_TIMEOUT_SECONDS = 30


def _client(app_id: str, app_secret: str) -> lark.Client:
    return (
        lark.Client.builder()
        .app_id(app_id)
        .app_secret(app_secret)
        .timeout(_TIMEOUT_SECONDS)
        .build()
    )


def _raise_on_fail(response) -> None:
    if not response.success():
        raise RuntimeError(response.msg or str(response.code))


def _upload_file(client: lark.Client, *, filename: str, mime: str, data: bytes) -> str:
    request = (
        CreateFileRequest.builder()
        .request_body(
            CreateFileRequestBody.builder()
            .file_type(feishu_upload_file_type(filename, mime))
            .file_name(filename)
            .file(BytesIO(data))
            .build()
        )
        .build()
    )
    response = client.im.v1.file.create(request)
    _raise_on_fail(response)
    if not response.data or not response.data.file_key:
        raise RuntimeError("飞书上传文件未返回 file_key")
    return str(response.data.file_key)


def _send_message(
    client: lark.Client,
    *,
    account_id: str,
    msg_type: str,
    content: str,
) -> None:
    request = (
        CreateMessageRequest.builder()
        .receive_id_type(feishu_receive_id_type(account_id))
        .request_body(
            CreateMessageRequestBody.builder()
            .receive_id(account_id)
            .msg_type(msg_type)
            .content(content)
            .build()
        )
        .build()
    )
    response = client.im.v1.message.create(request)
    _raise_on_fail(response)


def send_feishu_text(*, app_id: str, app_secret: str, account_ids: list[str], text: str) -> None:
    deliver_feishu_as_app(
        app_id=app_id,
        app_secret=app_secret,
        account_ids=account_ids,
        text=text,
        attachments=[],
    )


def deliver_feishu_as_app(
    *,
    app_id: str,
    app_secret: str,
    account_ids: list[str],
    text: str,
    attachments: list[FeishuAttachment],
) -> None:
    client = _client(app_id, app_secret)
    file_keys = [_upload_file(client, filename=name, mime=mime, data=data) for data, mime, name in attachments]
    for account_id in account_ids:
        _send_message(
            client,
            account_id=account_id,
            msg_type="text",
            content=json.dumps({"text": text}, ensure_ascii=False),
        )
        for file_key in file_keys:
            _send_message(
                client,
                account_id=account_id,
                msg_type="file",
                content=json.dumps({"file_key": file_key}, ensure_ascii=False),
            )
