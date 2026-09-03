"""Tests for Feishu post-bind capability probe."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import httpx

from app.auth.im_oauth.feishu_capability import probe_feishu_user_delivery


def _mock_client(*, get_json=None, post_json=None, get_status=200, post_status=200):
    client = MagicMock()
    get_resp = MagicMock()
    get_resp.json.return_value = get_json or {"code": 0, "data": {"user_id": "u1", "open_id": "ou_x"}}
    get_resp.status_code = get_status
    client.get.return_value = get_resp

    post_resp = MagicMock()
    post_resp.json.return_value = post_json or {"code": 0}
    post_resp.status_code = post_status
    client.post.return_value = post_resp

    client.__enter__ = MagicMock(return_value=client)
    client.__exit__ = MagicMock(return_value=False)
    return client


def test_probe_ready_when_upload_ok():
    with patch("app.auth.im_oauth.feishu_capability.httpx.Client", side_effect=[_mock_client(), _mock_client()]):
        probe = probe_feishu_user_delivery(access_token="tok", account_id="u1", app_id="cli_x")
    assert probe.ready is True
    assert probe.message == "飞书推送权限已就绪"


def test_probe_needs_admin_for_employee_id():
    info_json = {
        "code": 99991679,
        "msg": "Unauthorized. contact:user.employee_id:readonly",
    }
    with patch(
        "app.auth.im_oauth.feishu_capability.httpx.Client",
        return_value=_mock_client(get_json=info_json),
    ):
        probe = probe_feishu_user_delivery(access_token="tok", account_id="ou_abc", app_id="cli_app")
    assert probe.ready is False
    assert probe.needs_admin is True
    assert probe.admin_portal_url == "https://open.feishu.cn/app/cli_app/auth"


def test_probe_suggests_reauth_for_missing_im_scope():
    upload_json = {
        "code": 99991679,
        "msg": "Unauthorized. privileges: ['im:resource']",
    }
    with patch(
        "app.auth.im_oauth.feishu_capability.httpx.Client",
        side_effect=[
            _mock_client(),
            _mock_client(post_json=upload_json, post_status=403),
        ],
    ):
        probe = probe_feishu_user_delivery(access_token="tok", account_id="u1", app_id="cli_app")
    assert probe.ready is False
    assert probe.needs_admin is False
    assert probe.suggested_scope is not None
    assert "im:resource" in probe.suggested_scope
