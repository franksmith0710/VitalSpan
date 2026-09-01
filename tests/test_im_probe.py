"""Tests for IM SDK credential probes."""
from __future__ import annotations

from unittest.mock import MagicMock, patch

from app.core.config import get_settings
from app.reports.scheduler.channels.im_sdk import probe
from app.reports.scheduler.channels.work_notice import probe_im_apps


def test_probe_im_apps_unconfigured_without_credentials(monkeypatch):
    monkeypatch.setattr(get_settings(), "dingtalk_app_key", None)
    monkeypatch.setattr(get_settings(), "dingtalk_app_secret", None)
    monkeypatch.setattr(get_settings(), "push_dingtalk_webhook", None)
    monkeypatch.setattr(get_settings(), "push_dingtalk_webhook", None)
    probe.reset_im_probe_cache_for_tests()
    result = probe_im_apps(get_settings(), force_refresh=True)
    assert result["dingtalk"]["configured"] is False
    assert result["dingtalk"]["error"] is None


def test_probe_im_apps_marks_configured_when_sdk_probe_ok(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "feishu_app_id", "cli")
    monkeypatch.setattr(settings, "feishu_app_secret", "sec")
    monkeypatch.setattr(settings, "dingtalk_app_key", None)
    monkeypatch.setattr(settings, "dingtalk_app_secret", None)
    monkeypatch.setattr(settings, "dingtalk_agent_id", None)
    probe.reset_im_probe_cache_for_tests()
    with patch("app.reports.scheduler.channels.im_sdk.probe.probe_im_credentials_bundle", return_value={"ok": True}):
        result = probe_im_apps(settings, force_refresh=True)
    assert result["feishu"]["configured"] is True
    assert result["feishu"]["error"] is None


def test_probe_im_apps_surfaces_sdk_error(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "feishu_app_id", "cli")
    monkeypatch.setattr(settings, "feishu_app_secret", "sec")
    monkeypatch.setattr(settings, "dingtalk_app_key", None)
    monkeypatch.setattr(settings, "dingtalk_app_secret", None)
    monkeypatch.setattr(settings, "dingtalk_agent_id", None)
    probe.reset_im_probe_cache_for_tests()
    with patch(
        "app.reports.scheduler.channels.im_sdk.probe.probe_im_credentials_bundle",
        return_value={"ok": False, "error": "invalid app secret"},
    ):
        result = probe_im_apps(settings, force_refresh=True)
    assert result["feishu"]["configured"] is False
    assert "invalid app secret" in (result["feishu"]["error"] or "")


def test_probe_dingtalk_group_webhook_posts_live():
    from app.core.platform_config.im_credentials import ImCredentials

    creds = ImCredentials(
        channel="dingtalk",
        source="db",
        delivery_mode="group_webhook",
        webhook_url="https://oapi.dingtalk.com/robot/send?access_token=abc",
    )
    with patch("app.reports.scheduler.channels.im_sdk.probe.probe_dingtalk_token") as probe_token:
        with patch(
            "app.reports.scheduler.channels.im_sdk.group_webhook.post_group_webhook",
            return_value={"status": "delivered"},
        ) as post:
            result = probe.probe_im_credentials_bundle(creds)
    probe_token.assert_not_called()
    post.assert_called_once()
    assert result["ok"] is True


def test_probe_im_apps_uses_cache(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "feishu_app_id", "cli")
    monkeypatch.setattr(settings, "feishu_app_secret", "sec")
    monkeypatch.setattr(settings, "dingtalk_app_key", None)
    monkeypatch.setattr(settings, "dingtalk_app_secret", None)
    monkeypatch.setattr(settings, "dingtalk_agent_id", None)
    probe.reset_im_probe_cache_for_tests()
    mock_probe = MagicMock(return_value={"ok": True})
    with patch("app.reports.scheduler.channels.im_sdk.probe.probe_im_credentials_bundle", mock_probe):
        probe_im_apps(settings, force_refresh=True)
        probe_im_apps(settings, force_refresh=False)
    assert mock_probe.call_count == 1
