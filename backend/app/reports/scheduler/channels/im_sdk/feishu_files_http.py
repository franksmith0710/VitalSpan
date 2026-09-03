"""Feishu IM file upload + send via REST (user_access_token)."""

from __future__ import annotations

import json

import httpx

from app.reports.scheduler.channels.im_sdk.feishu_common import (
    FeishuAttachment,
    feishu_receive_id_type,
    feishu_upload_file_type,
)

_TIMEOUT = 30.0
_FILES_URL = "https://open.feishu.cn/open-apis/im/v1/files"
_MESSAGES_URL = "https://open.feishu.cn/open-apis/im/v1/messages"


def _api_error(body: dict) -> str:
    return str(body.get("msg") or body.get("code") or "飞书接口错误")


def upload_feishu_file_http(
    *,
    access_token: str,
    filename: str,
    mime: str,
    data: bytes,
) -> str:
    file_type = feishu_upload_file_type(filename, mime)
    headers = {"Authorization": f"Bearer {access_token}"}
    with httpx.Client(timeout=_TIMEOUT) as client:
        resp = client.post(
            _FILES_URL,
            headers=headers,
            data={"file_type": file_type, "file_name": filename},
            files={"file": (filename, data, mime or "application/octet-stream")},
        )
        body = resp.json()
    if resp.status_code >= 400 or body.get("code") not in (0, None):
        raise RuntimeError(_api_error(body))
    file_key = (body.get("data") or {}).get("file_key")
    if not file_key:
        raise RuntimeError("飞书上传文件未返回 file_key")
    return str(file_key)


def send_feishu_text_http(
    *,
    access_token: str,
    account_id: str,
    text: str,
) -> None:
    receive_id_type = feishu_receive_id_type(account_id)
    content = json.dumps({"text": text}, ensure_ascii=False)
    with httpx.Client(timeout=_TIMEOUT) as client:
        resp = client.post(
            _MESSAGES_URL,
            params={"receive_id_type": receive_id_type},
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            json={
                "receive_id": account_id,
                "msg_type": "text",
                "content": content,
            },
        )
        body = resp.json()
    if resp.status_code >= 400 or body.get("code") not in (0, None):
        raise RuntimeError(_api_error(body))


def send_feishu_file_http(
    *,
    access_token: str,
    account_id: str,
    file_key: str,
) -> None:
    receive_id_type = feishu_receive_id_type(account_id)
    content = json.dumps({"file_key": file_key}, ensure_ascii=False)
    with httpx.Client(timeout=_TIMEOUT) as client:
        resp = client.post(
            _MESSAGES_URL,
            params={"receive_id_type": receive_id_type},
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            json={
                "receive_id": account_id,
                "msg_type": "file",
                "content": content,
            },
        )
        body = resp.json()
    if resp.status_code >= 400 or body.get("code") not in (0, None):
        raise RuntimeError(_api_error(body))


def deliver_feishu_as_user_http(
    *,
    access_token: str,
    account_ids: list[str],
    text: str,
    attachments: list[FeishuAttachment],
) -> None:
    file_keys: list[str] = []
    for data, mime, filename in attachments:
        file_keys.append(
            upload_feishu_file_http(
                access_token=access_token,
                filename=filename,
                mime=mime,
                data=data,
            )
        )
    for account_id in account_ids:
        send_feishu_text_http(access_token=access_token, account_id=account_id, text=text)
        for file_key in file_keys:
            send_feishu_file_http(
                access_token=access_token,
                account_id=account_id,
                file_key=file_key,
            )
