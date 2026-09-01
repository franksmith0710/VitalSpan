"""Tests for IM platform config service (DB SoR / cleared semantics)."""
from __future__ import annotations

import uuid
from unittest.mock import patch

import pytest
from sqlalchemy.orm import Session

from app.auth.models import Base, get_meta_engine
from app.core.platform_config.email_service import PlatformConfigError
from app.core.platform_config.im_connect_model import PlatformImConnectConfig
from app.core.platform_config import im_service
from app.core.platform_config.schemas import ImDeliveryConfigPut


@pytest.fixture()
def meta_session() -> Session:
    engine = get_meta_engine()
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
        session.rollback()


def test_clear_im_config_ignores_env(monkeypatch, meta_session: Session):
    monkeypatch.setattr(
        "app.core.config.get_settings",
        lambda: type(
            "S",
            (),
            {
                "wecom_corp_id": "corp",
                "wecom_secret": "sec",
                "wecom_agent_id": "1",
                "dingtalk_app_key": None,
                "dingtalk_app_secret": None,
                "dingtalk_agent_id": None,
                "feishu_app_id": None,
                "feishu_app_secret": None,
            },
        )(),
    )
    row = meta_session.get(PlatformImConnectConfig, "wecom")
    if row is None:
        row = PlatformImConnectConfig(channel="wecom", state="cleared")
        meta_session.add(row)
    else:
        row.state = "cleared"
    meta_session.commit()
    out = im_service.get_im_config(meta_session, "wecom", probe=False)
    assert out.source == "none"
    assert out.configured is False


def test_save_im_config_requires_secret(meta_session: Session):
    payload = ImDeliveryConfigPut(
        callbackDomain="example.com",
        corpId="corp",
        agentId="100",
    )
    with pytest.raises(PlatformConfigError) as exc:
        im_service.save_im_config(
            meta_session,
            "wecom",
            payload,
            actor_id=str(uuid.uuid4()),
            actor_username="admin",
            trace_id="t",
        )
    assert exc.value.code == "PLATFORM_IM_SECRET_REQUIRED"


def test_save_im_config_probe_failure(meta_session: Session):
    payload = ImDeliveryConfigPut(
        callbackDomain="example.com",
        corpId="corp",
        agentId="100",
        secret="sec",
    )
    with patch(
        "app.core.platform_config.im_service.probe_im_credentials_bundle_from_payload",
        return_value={"ok": False, "error": "bad secret"},
    ):
        with pytest.raises(PlatformConfigError) as exc:
            im_service.save_im_config(
                meta_session,
                "wecom",
                payload,
                actor_id=str(uuid.uuid4()),
                actor_username="admin",
                trace_id="t",
            )
    assert exc.value.code == "PLATFORM_IM_PROBE_FAILED"


def test_dingtalk_delivery_mode_forced_to_group_webhook():
    payload = ImDeliveryConfigPut(
        deliveryMode="user_delegated",
        webhookUrl="https://oapi.dingtalk.com/robot/send?access_token=abc",
    )
    assert im_service._delivery_mode(None, payload, channel="dingtalk") == "group_webhook"
    fields = im_service._validate_put("dingtalk", payload, "group_webhook")
    assert fields["webhook_url"].startswith("https://oapi.dingtalk.com/robot/send")


def test_probe_from_payload_group_webhook_posts():
    with patch(
        "app.reports.scheduler.channels.im_sdk.group_webhook.post_group_webhook",
        return_value={"status": "delivered"},
    ) as post:
        result = im_service.probe_im_credentials_bundle_from_payload(
            "dingtalk",
            "",
            {"webhook_url": "https://oapi.dingtalk.com/robot/send?access_token=abc"},
            delivery_mode="group_webhook",
        )
    post.assert_called_once()
    assert result["ok"] is True


def test_validate_put_dingtalk_rejects_bad_webhook():
    payload = ImDeliveryConfigPut(webhookUrl="https://example.com/hook")
    with pytest.raises(PlatformConfigError) as exc:
        im_service._validate_put("dingtalk", payload, "group_webhook")
    assert exc.value.code == "PLATFORM_IM_WEBHOOK_INVALID"
