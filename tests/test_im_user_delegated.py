"""Tests for IM user_delegated delivery mode."""
from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock, patch

import pytest

from app.auth.im_oauth.device_code.feishu import DeviceAuthPending, DeviceAuthTokens, poll_feishu_device_token
from app.auth.im_oauth.im_user_token import check_im_owner_sender_ready, get_user_access_token
from app.auth.im_oauth.service import complete_feishu_device_auth_session, start_feishu_device_auth_session
from app.core.crypto.credentials import encrypt_credential
from app.core.platform_config import im_service
from app.core.platform_config.im_credentials import ImCredentials
from app.core.platform_config.schemas import ImDeliveryConfigPut
from app.reports.scheduler.channels import work_notice
from app.reports.scheduler.channels.im_sdk.probe import probe_im_credentials_bundle


def test_probe_user_delegated_skips_gettoken():
    creds = ImCredentials(
        channel="feishu",
        source="db",
        delivery_mode="user_delegated",
        app_id="cli_test",
        app_secret="sec",
    )
    with patch("app.reports.scheduler.channels.im_sdk.probe.probe_feishu_token") as probe_token:
        result = probe_im_credentials_bundle(creds)
    probe_token.assert_not_called()
    assert result["ok"] is True


def test_probe_user_delegated_dingtalk_probes_gettoken():
    creds = ImCredentials(
        channel="dingtalk",
        source="db",
        delivery_mode="user_delegated",
        app_key="k",
        app_secret="s",
        agent_id="1",
    )
    with patch("app.reports.scheduler.channels.im_sdk.probe.probe_dingtalk_token") as probe_token:
        result = probe_im_credentials_bundle(creds)
    probe_token.assert_called_once()
    assert result["ok"] is True


def test_probe_im_credentials_bundle_from_payload_user_delegated():
    result = im_service.probe_im_credentials_bundle_from_payload(
        "feishu",
        "",
        {"app_id": "cli", "app_secret": "sec"},
        delivery_mode="user_delegated",
    )
    assert result["ok"] is True


def test_validate_put_user_delegated_feishu_no_callback():
    payload = ImDeliveryConfigPut(deliveryMode="user_delegated", appId="cli_test")
    fields = im_service._validate_put("feishu", payload, "user_delegated")
    assert fields == {"app_id": "cli_test"}


def test_get_user_access_token_refresh():
    user_id = uuid.uuid4()
    creds = ImCredentials(
        channel="feishu",
        source="db",
        delivery_mode="user_delegated",
        app_id="cli",
        app_secret="sec",
    )
    expires_at = datetime.now(UTC) - timedelta(minutes=1)
    token_blob = encrypt_credential(
        json.dumps(
            {
                "access_token": "old",
                "refresh_token": "rt_1",
                "expires_at": expires_at.isoformat(),
            },
            ensure_ascii=False,
        )
    )
    row = MagicMock()
    row.token_encrypted = token_blob
    session = MagicMock()
    session.scalar.return_value = row
    with patch("app.auth.im_oauth.im_user_token.resolve_im_credentials", return_value=creds):
        with patch("app.auth.im_oauth.im_user_token._refresh_feishu_token") as refresh:
            refresh.return_value = ("new_access", "rt_2", 7200)
            token = get_user_access_token(session, user_id, "feishu")
    assert token == "new_access"
    assert session.flush.call_count >= 1
    session.commit.assert_not_called()


def test_send_work_notices_user_delegated():
    owner_id = uuid.uuid4()
    creds = ImCredentials(
        channel="feishu",
        source="db",
        delivery_mode="user_delegated",
        app_id="cli",
        app_secret="sec",
    )
    session = MagicMock()
    with patch("app.reports.scheduler.channels.work_notice.resolve_im_credentials", return_value=creds):
        with patch(
            "app.reports.scheduler.channels.work_notice.owner_has_send_token",
            return_value=(True, None),
        ):
            with patch(
                "app.reports.scheduler.channels.work_notice.get_user_access_token",
                return_value="ua_token",
            ):
                with patch("app.reports.scheduler.channels.work_notice.send_feishu_text_as_user") as send_user:
                    result = work_notice.send_work_notices(
                    "feishu",
                    account_ids=["ou_recv"],
                    summary="报告",
                    artifact_ref="storage://x",
                    owner_id=owner_id,
                    session=session,
                )
    send_user.assert_called_once()
    assert result["status"] == "delivered"
    assert result["mode"] == "user_delegated"


def test_device_auth_complete_binds_user():
    user_id = uuid.uuid4()
    session = MagicMock()
    oauth_row = MagicMock()
    oauth_row.channel = "feishu"
    oauth_row.user_id = user_id
    oauth_row.redirect_after = json.dumps({"device_code": "dc", "interval": 5})
    oauth_row.expires_at = datetime.now(UTC) + timedelta(minutes=5)
    session.get.return_value = oauth_row
    creds = ImCredentials(
        channel="feishu",
        source="db",
        delivery_mode="user_delegated",
        app_id="cli",
        app_secret="sec",
    )
    with patch("app.auth.im_oauth.service.resolve_im_delivery_mode", return_value="user_delegated"):
        with patch("app.auth.im_oauth.service.resolve_im_credentials", return_value=creds):
            with patch("app.auth.im_oauth.service.poll_feishu_device_token") as poll:
                poll.return_value = DeviceAuthTokens(
                    access_token="ua",
                    refresh_token="rt",
                    expires_in=7200,
                    user_id="ou_bind",
                )
                with patch("app.auth.im_oauth.service.upsert_device_binding") as upsert:
                    done = complete_feishu_device_auth_session(
                        session,
                        user_id=user_id,
                        session_id="sess",
                    )
    assert done.status == "success"
    upsert.assert_called_once()
    session.delete.assert_called_once_with(oauth_row)
    session.commit.assert_called_once()


def test_device_auth_pending():
    user_id = uuid.uuid4()
    session = MagicMock()
    oauth_row = MagicMock()
    oauth_row.channel = "feishu"
    oauth_row.user_id = user_id
    oauth_row.redirect_after = json.dumps({"device_code": "dc", "interval": 5})
    oauth_row.expires_at = datetime.now(UTC) + timedelta(minutes=5)
    session.get.return_value = oauth_row
    creds = ImCredentials(
        channel="feishu",
        source="db",
        delivery_mode="user_delegated",
        app_id="cli",
        app_secret="sec",
    )
    with patch("app.auth.im_oauth.service.resolve_im_credentials", return_value=creds):
        with patch(
            "app.auth.im_oauth.service.poll_feishu_device_token",
            return_value=DeviceAuthPending(interval=5),
        ):
            done = complete_feishu_device_auth_session(
                session,
                user_id=user_id,
                session_id="sess",
            )
    assert done.status == "pending"
    assert done.interval == 5


def test_start_feishu_device_auth_session():
    user_id = uuid.uuid4()
    session = MagicMock()
    creds = ImCredentials(
        channel="feishu",
        source="db",
        delivery_mode="user_delegated",
        app_id="cli",
        app_secret="sec",
    )
    with patch("app.auth.im_oauth.service.resolve_im_delivery_mode", return_value="user_delegated"):
        with patch("app.auth.im_oauth.service.resolve_im_credentials", return_value=creds):
            with patch("app.auth.im_oauth.service.start_feishu_device_auth") as start:
                start.return_value = type(
                    "S",
                    (),
                    {
                        "device_code": "dc",
                        "user_code": "ABCD",
                        "verification_uri": "https://example.com",
                        "verification_uri_complete": "https://example.com?code=ABCD",
                        "expires_in": 240,
                        "interval": 5,
                    },
                )()
                out = start_feishu_device_auth_session(session, user_id=user_id)
    assert out.user_code == "ABCD"
    session.add.assert_called_once()
    session.commit.assert_called_once()


@pytest.mark.parametrize(
    "payload",
    [
        {"error": "authorization_pending", "interval": 3},
        {"code": 20094, "msg": "authorization pending"},
        {"msg": "slow_down please wait"},
    ],
)
def test_poll_feishu_device_token_pending_variants(payload):
    mock_resp = MagicMock()
    mock_resp.json.return_value = payload
    with patch("app.auth.im_oauth.device_code.feishu.httpx.Client") as client_cls:
        client_cls.return_value.__enter__.return_value.post.return_value = mock_resp
        result = poll_feishu_device_token(app_id="cli", app_secret="sec", device_code="dc")
    assert isinstance(result, DeviceAuthPending)


def test_check_im_owner_sender_ready_unbound():
    user_id = uuid.uuid4()
    session = MagicMock()
    session.scalar.return_value = None
    creds = ImCredentials(
        channel="feishu",
        source="db",
        delivery_mode="user_delegated",
        app_id="cli",
        app_secret="sec",
    )
    with patch("app.auth.im_oauth.im_user_token.resolve_im_credentials", return_value=creds):
        from app.auth.im_oauth.im_user_token import owner_has_send_token

        ready, error = owner_has_send_token(session, user_id, "feishu")
    assert ready is False
    assert "绑定" in (error or "")


def test_check_im_owner_sender_ready_map():
    user_id = uuid.uuid4()
    session = MagicMock()
    row = MagicMock()
    row.token_encrypted = encrypt_credential(
        json.dumps({"access_token": "tok", "refresh_token": "rt", "expires_at": ""}, ensure_ascii=False)
    )
    session.scalar.return_value = row
    creds = ImCredentials(
        channel="feishu",
        source="db",
        delivery_mode="user_delegated",
        app_id="cli",
        app_secret="sec",
    )
    with patch("app.auth.im_oauth.im_user_token.resolve_im_credentials", return_value=creds):
        with patch(
            "app.core.platform_config.im_resolve.resolve_im_delivery_mode",
            return_value="user_delegated",
        ):
            out = check_im_owner_sender_ready(session, user_id)
    assert out["feishu"]["ready"] is True
