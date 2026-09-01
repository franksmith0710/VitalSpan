"""DingTalk group webhook send, sign, SoR, and vendor envelope."""
from __future__ import annotations

from unittest.mock import MagicMock, patch

import httpx

from app.core.config import get_settings
from app.core.platform_config.im_credentials import empty_credentials
from app.reports.scheduler.channels.dispatch import _dingtalk_group_target
from app.reports.scheduler.channels.im_sdk.group_webhook import (
    dingtalk_signed_webhook_url,
    post_group_webhook,
)


def test_dingtalk_signed_url_adds_timestamp_and_sign():
    url = dingtalk_signed_webhook_url(
        "https://oapi.dingtalk.com/robot/send?access_token=a",
        "sec",
    )
    assert "timestamp=" in url
    assert "sign=" in url


def test_cleared_credentials_do_not_fall_back_to_env(monkeypatch):
    monkeypatch.setattr(
        "app.core.platform_config.im_resolve.resolve_im_credentials",
        lambda *a, **k: empty_credentials("dingtalk"),
    )
    settings = get_settings()
    monkeypatch.setattr(
        settings,
        "push_dingtalk_webhook",
        "https://oapi.dingtalk.com/robot/send?access_token=env",
    )
    url, secret = _dingtalk_group_target(settings, MagicMock())
    assert url is None
    assert secret is None


def test_post_group_webhook_retries_transport_error(monkeypatch):
    monkeypatch.setattr("app.reports.scheduler.channels.im_sdk.group_webhook.time.sleep", lambda *_: None)
    calls = {"n": 0}

    def fake_post(url, payload):
        calls["n"] += 1
        if calls["n"] == 1:
            raise httpx.ConnectError("boom")
        return 200, {"errcode": 0}

    monkeypatch.setattr(
        "app.reports.scheduler.channels.im_sdk.group_webhook._post_once",
        fake_post,
    )
    result = post_group_webhook(
        "dingtalk",
        get_settings(),
        summary="VitalSpan 连通性探测",
        artifact_ref="probe",
        webhook_url="https://oapi.dingtalk.com/robot/send?access_token=abc",
        max_attempts=3,
    )
    assert calls["n"] == 2
    assert result["status"] == "delivered"


def test_post_group_webhook_rejects_dingtalk_errcode():
    with patch(
        "app.reports.scheduler.channels.im_sdk.group_webhook._post_once",
        return_value=(200, {"errcode": 310000, "errmsg": "token expired"}),
    ):
        result = post_group_webhook(
            "dingtalk",
            get_settings(),
            summary="s",
            artifact_ref="r",
            webhook_url="https://oapi.dingtalk.com/robot/send?access_token=abc",
            max_attempts=1,
        )
    assert result["status"] == "failed"
    assert "token expired" in result["error"]


def test_post_group_webhook_rejects_feishu_code():
    with patch(
        "app.reports.scheduler.channels.im_sdk.group_webhook._post_once",
        return_value=(200, {"code": 19002, "msg": "bad"}),
    ):
        result = post_group_webhook(
            "feishu",
            get_settings(),
            summary="s",
            artifact_ref="r",
            webhook_url="https://open.feishu.cn/open-apis/bot/v2/hook/x",
            max_attempts=1,
        )
    assert result["status"] == "failed"
    assert "bad" in result["error"]
