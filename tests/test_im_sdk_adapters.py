"""Unit tests for IM SDK adapters (mocked vendor clients)."""
from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from app.reports.scheduler.channels.im_sdk import dingtalk, feishu


def test_send_feishu_text_calls_lark_sdk():
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.success.return_value = True
    mock_client.im.v1.message.create.return_value = mock_response
    with patch("app.reports.scheduler.channels.im_sdk.feishu.lark.Client") as builder:
        builder.builder.return_value.app_id.return_value.app_secret.return_value.timeout.return_value.build.return_value = (
            mock_client
        )
        feishu.send_feishu_text(
            app_id="cli",
            app_secret="sec",
            account_ids=["u1", "u2"],
            text="hello",
        )
    assert mock_client.im.v1.message.create.call_count == 2


def test_send_feishu_text_raises_on_sdk_failure():
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.success.return_value = False
    mock_response.msg = "permission denied"
    mock_response.code = 999
    mock_client.im.v1.message.create.return_value = mock_response
    with patch("app.reports.scheduler.channels.im_sdk.feishu.lark.Client") as builder:
        builder.builder.return_value.app_id.return_value.app_secret.return_value.timeout.return_value.build.return_value = (
            mock_client
        )
        with pytest.raises(RuntimeError, match="permission denied"):
            feishu.send_feishu_text(
                app_id="cli",
                app_secret="sec",
                account_ids=["u1"],
                text="hello",
            )


def test_send_dingtalk_text_calls_asyncsend_v2():
    mock_client = MagicMock()
    with patch("app.reports.scheduler.channels.im_sdk.dingtalk.AppKeyClient", return_value=mock_client):
        dingtalk.send_dingtalk_text(
            app_key="key",
            app_secret="sec",
            agent_id="123",
            account_ids=["d1"],
            text="hello",
        )
    mock_client.message.asyncsend_v2.assert_called_once()
    args, kwargs = mock_client.message.asyncsend_v2.call_args
    assert kwargs.get("userid_list") == ["d1"] or args[2] == ["d1"]
