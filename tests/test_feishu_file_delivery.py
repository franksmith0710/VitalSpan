"""Tests for Feishu IM file attachment delivery."""
from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from app.reports.scheduler.channels.im_sdk import feishu
from app.reports.scheduler.channels.im_sdk.feishu_common import (
    feishu_receive_id_type,
    feishu_upload_file_type,
)
from app.reports.scheduler.channels.im_sdk.feishu_files_http import deliver_feishu_as_user_http
from app.reports.scheduler.channels.im_sdk.feishu_user import deliver_feishu_as_user


def test_feishu_push_scopes_include_message_and_file():
    from app.reports.scheduler.channels.im_sdk.feishu_common import FEISHU_PUSH_SCOPE_PARTS

    assert "im:message" in FEISHU_PUSH_SCOPE_PARTS
    assert "im:message.send_as_user" in FEISHU_PUSH_SCOPE_PARTS
    assert "im:resource" in FEISHU_PUSH_SCOPE_PARTS
    assert "offline_access" in FEISHU_PUSH_SCOPE_PARTS


def test_feishu_receive_id_type_open_id():
    assert feishu_receive_id_type("ou_abc") == "open_id"
    assert feishu_receive_id_type("4gxxx") == "user_id"


@pytest.mark.parametrize(
    ("filename", "mime", "expected"),
    [
        ("report.pdf", "application/pdf", "pdf"),
        ("book.xls", "application/vnd.ms-excel", "xls"),
        ("data.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "stream"),
    ],
)
def test_feishu_upload_file_type(filename: str, mime: str, expected: str):
    assert feishu_upload_file_type(filename, mime) == expected


def test_deliver_feishu_as_user_http_uploads_and_sends():
    with patch(
        "app.reports.scheduler.channels.im_sdk.feishu_files_http.upload_feishu_file_http",
        side_effect=["fk1", "fk2"],
    ) as upload:
        with patch(
            "app.reports.scheduler.channels.im_sdk.feishu_files_http.send_feishu_text_http",
        ) as send_text:
            with patch(
                "app.reports.scheduler.channels.im_sdk.feishu_files_http.send_feishu_file_http",
            ) as send_file:
                deliver_feishu_as_user_http(
                    access_token="tok",
                    account_ids=["ou_a", "4g_b"],
                    text="报告已生成",
                    attachments=[
                        (b"%PDF", "application/pdf", "a.pdf"),
                        (b"excel", "application/vnd.ms-excel", "b.xls"),
                    ],
                )
    assert upload.call_count == 2
    assert send_text.call_count == 2
    assert send_file.call_count == 4


def test_deliver_feishu_as_user_delegates():
    with patch("app.reports.scheduler.channels.im_sdk.feishu_user.deliver_feishu_as_user_http") as deliver:
        deliver_feishu_as_user(
            access_token="tok",
            account_ids=["u1"],
            text="hi",
            attachments=[(b"x", "application/pdf", "x.pdf")],
        )
    deliver.assert_called_once()


def test_deliver_feishu_as_app_uses_sdk_for_files():
    mock_client = MagicMock()
    file_resp = MagicMock()
    file_resp.success.return_value = True
    file_resp.data.file_key = "fk_pdf"
    msg_resp = MagicMock()
    msg_resp.success.return_value = True
    mock_client.im.v1.file.create.return_value = file_resp
    mock_client.im.v1.message.create.return_value = msg_resp
    with patch("app.reports.scheduler.channels.im_sdk.feishu.lark.Client") as builder:
        builder.builder.return_value.app_id.return_value.app_secret.return_value.timeout.return_value.build.return_value = (
            mock_client
        )
        feishu.deliver_feishu_as_app(
            app_id="cli",
            app_secret="sec",
            account_ids=["ou_recv"],
            text="报告",
            attachments=[(b"%PDF-1.4", "application/pdf", "report.pdf")],
        )
    mock_client.im.v1.file.create.assert_called_once()
    assert mock_client.im.v1.message.create.call_count == 2
