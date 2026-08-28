"""Tests for IM SDK credential probes."""
from __future__ import annotations

from unittest.mock import MagicMock, patch

from app.core.config import get_settings
from app.reports.scheduler.channels.im_sdk import probe
from app.reports.scheduler.channels.work_notice import probe_im_apps


def test_probe_im_apps_unconfigured_without_credentials(monkeypatch):
    monkeypatch.setattr(get_settings(), "dingtalk_app_key", None)
    monkeypatch.setattr(get_settings(), "dingtalk_app_secret", None)
    monkeypatch.setattr(get_settings(), "dingtalk_agent_id", None)
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
    monkeypatch.setattr(settings, "wecom_corp_id", None)
    monkeypatch.setattr(settings, "wecom_secret", None)
    monkeypatch.setattr(settings, "wecom_agent_id", None)
    probe.reset_im_probe_cache_for_tests()
    with patch("app.reports.scheduler.channels.im_sdk.probe.probe_feishu_token"):
        result = probe_im_apps(settings, force_refresh=True)
    assert result["feishu"]["configured"] is True
    assert result["feishu"]["error"] is None


def test_probe_im_apps_surfaces_sdk_error(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "wecom_corp_id", "corp")
    monkeypatch.setattr(settings, "wecom_secret", "sec")
    monkeypatch.setattr(settings, "wecom_agent_id", "100")
    probe.reset_im_probe_cache_for_tests()
    with patch(
        "app.reports.scheduler.channels.im_sdk.probe.probe_wecom_token",
        side_effect=RuntimeError("invalid corpsecret"),
    ):
        result = probe_im_apps(settings, force_refresh=True)
    assert result["wecom"]["configured"] is False
    assert "invalid corpsecret" in (result["wecom"]["error"] or "")


def test_probe_im_apps_uses_cache(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "feishu_app_id", "cli")
    monkeypatch.setattr(settings, "feishu_app_secret", "sec")
    monkeypatch.setattr(settings, "dingtalk_app_key", None)
    monkeypatch.setattr(settings, "dingtalk_app_secret", None)
    monkeypatch.setattr(settings, "dingtalk_agent_id", None)
    monkeypatch.setattr(settings, "wecom_corp_id", None)
    monkeypatch.setattr(settings, "wecom_secret", None)
    monkeypatch.setattr(settings, "wecom_agent_id", None)
    probe.reset_im_probe_cache_for_tests()
    mock_probe = MagicMock(return_value={"channel": "feishu", "skipped": False, "ok": True, "error": None})
    with patch("app.reports.scheduler.channels.im_sdk.probe.probe_channel_credentials", mock_probe):
        probe_im_apps(settings, force_refresh=True)
        probe_im_apps(settings, force_refresh=False)
    assert mock_probe.call_count == 1
