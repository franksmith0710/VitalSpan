"""Tests for /me/im-bindings API."""
from __future__ import annotations

from unittest.mock import patch

from app.auth.im_oauth.service import ImBindingsOut, ImBindingItemOut


def test_me_im_bindings_lists_channels(client, admin_auth_headers):
    items = [
        ImBindingItemOut(
            channel="wecom",
            label="企业微信",
            appConfigured=False,
            bound=False,
            deliverable=False,
        ),
        ImBindingItemOut(
            channel="dingtalk",
            label="钉钉",
            appConfigured=False,
            bound=False,
            deliverable=False,
        ),
        ImBindingItemOut(
            channel="feishu",
            label="飞书",
            appConfigured=False,
            bound=False,
            deliverable=False,
        ),
    ]
    with patch("app.api.v1.me_im_bindings.list_user_im_bindings", return_value=ImBindingsOut(items=items)):
        resp = client.get("/api/v1/me/im-bindings", headers=admin_auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["items"]) == 3


def test_me_im_bindings_authorize_requires_config(client, admin_auth_headers):
    with patch(
        "app.api.v1.me_im_bindings.start_authorize",
        side_effect=__import__(
            "app.auth.im_oauth.oauth", fromlist=["ImOAuthError"]
        ).ImOAuthError("IM_APP_NOT_CONFIGURED", "应用未配置", 422),
    ):
        resp = client.get(
            "/api/v1/me/im-bindings/wecom/authorize",
            headers=admin_auth_headers,
            follow_redirects=False,
        )
    assert resp.status_code == 422
    assert resp.json()["code"] == "IM_APP_NOT_CONFIGURED"


def test_im_oauth_callback_rejects_bad_state(client):
    resp = client.get(
        "/api/v1/auth/im/wecom/callback?code=abc&state=bad",
        follow_redirects=False,
    )
    assert resp.status_code == 302
    assert "status=error" in resp.headers["location"]
