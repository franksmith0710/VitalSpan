"""Unit tests for IM SDK adapters (mocked vendor clients)."""
from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from app.reports.scheduler.channels.im_sdk import dingtalk, feishu


def test_send_feishu_text_calls_lark_sdk():
    with patch("app.reports.scheduler.channels.im_sdk.feishu.deliver_feishu_as_app") as deliver:
        feishu.send_feishu_text(
            app_id="cli",
            app_secret="sec",
            account_ids=["u1", "u2"],
            text="hello",
        )
    deliver.assert_called_once_with(
        app_id="cli",
        app_secret="sec",
        account_ids=["u1", "u2"],
        text="hello",
        attachments=[],
    )


def test_send_feishu_text_raises_on_sdk_failure():
    with patch(
        "app.reports.scheduler.channels.im_sdk.feishu.deliver_feishu_as_app",
        side_effect=RuntimeError("permission denied"),
    ):
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
