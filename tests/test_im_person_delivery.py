"""IM person delivery: bind account → send that id; unbound → fail, no group fallback."""
from __future__ import annotations

import uuid as uuid_mod

from app.auth.models import AuthUser, Base, get_meta_engine, get_meta_session
from app.auth.schemas import UserUpdate
from app.auth.users import im_bindings, service as user_service
from app.core.config import get_settings
from app.reports.scheduler.channels import work_notice
from app.reports.scheduler.channels.dispatch import deliver_to_channels
from app.reports.scheduler.recipients import resolve_im_targets
from app.reports.scheduler.schemas import ScheduleRecipientIn

_AUDIT = {"actor_id": "dev", "actor_username": "dev", "trace_id": "im-person"}


def _session():
    engine = get_meta_engine()
    Base.metadata.create_all(engine)
    return get_meta_session()


def _make_user(session, username: str | None = None) -> AuthUser:
    user = AuthUser(username=username or f"u_{uuid_mod.uuid4().hex[:12]}")
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def test_resolve_im_targets_returns_bound_account():
    session = _session()
    try:
        user = _make_user(session)
        im_bindings.upsert_accounts(session, user.id, {"dingtalk": "ding-alice"})
        session.commit()
        targets, missing = resolve_im_targets(
            session,
            [ScheduleRecipientIn(type="user", value=user.username)],
            "dingtalk",
        )
        assert targets == [(user.username, "ding-alice")]
        assert missing == []
    finally:
        session.close()


def test_resolve_im_targets_missing_binding_named():
    session = _session()
    try:
        user = _make_user(session)
        targets, missing = resolve_im_targets(
            session,
            [ScheduleRecipientIn(type="user", value=user.username)],
            "dingtalk",
        )
        assert targets == []
        assert missing == [user.username]
    finally:
        session.close()


def test_email_only_cannot_use_im():
    session = _session()
    try:
        targets, missing = resolve_im_targets(
            session,
            [ScheduleRecipientIn(type="email", value="a@example.com")],
            "wecom",
        )
        assert targets == []
        assert any("邮箱" in item or "纯邮箱" in item for item in missing)
    finally:
        session.close()


def test_unbound_im_fails_and_skips_group_webhook(monkeypatch):
    monkeypatch.setattr(
        work_notice,
        "send_work_notices",
        lambda *a, **k: (_ for _ in ()).throw(AssertionError("must not send person notice")),
    )
    result = deliver_to_channels(
        ["dingtalk"],
        artifact_ref="storage://x",
        artifact_kind="standard_render",
        recipient_emails=[],
        attachments=[],
        mock_mode=None,
        settings=get_settings(),
        im_targets={"dingtalk": []},
        im_missing={"dingtalk": ["alice"]},
        notify_group=False,
    )
    step = result["deliverySteps"][0]
    assert step["status"] == "failed"
    assert "alice" in step["error"]
    assert "不会改发到群" in step["error"]
    assert all(s.get("mode") != "group_webhook" for s in result["deliverySteps"])
    assert result["status"] != "delivered"


def test_bound_account_sent_to_that_id(monkeypatch):
    seen: dict = {}

    def fake_send(channel, *, account_ids, **kwargs):
        seen["ids"] = list(account_ids)
        return {"channel": channel, "status": "delivered", "mode": "work_notice", "to": account_ids}

    monkeypatch.setattr(work_notice, "send_work_notices", fake_send)
    result = deliver_to_channels(
        ["dingtalk"],
        artifact_ref="storage://x",
        artifact_kind="standard_render",
        recipient_emails=[],
        attachments=[],
        mock_mode=None,
        settings=get_settings(),
        im_targets={"dingtalk": [("alice", "ding-1")]},
        im_missing={"dingtalk": []},
        notify_group=False,
    )
    assert seen["ids"] == ["ding-1"]
    assert result["deliverySteps"][0]["status"] == "delivered"
    assert result["status"] == "delivered"


def test_notify_group_true_adds_webhook_step(monkeypatch):
    monkeypatch.setattr(
        work_notice,
        "send_work_notices",
        lambda channel, **kwargs: {
            "channel": channel,
            "status": "delivered",
            "mode": "work_notice",
            "to": kwargs.get("account_ids"),
        },
    )
    hooks: list[str] = []

    def fake_hook(channel, settings, *, summary, artifact_ref):
        hooks.append(channel)
        return {"channel": f"{channel}_group", "status": "delivered", "mode": "group_webhook"}

    monkeypatch.setattr(
        "app.reports.scheduler.channels.dispatch._send_group_webhook",
        fake_hook,
    )
    result = deliver_to_channels(
        ["dingtalk"],
        artifact_ref="storage://x",
        artifact_kind="standard_render",
        recipient_emails=[],
        attachments=[],
        mock_mode=None,
        settings=get_settings(),
        im_targets={"dingtalk": [("alice", "ding-1")]},
        im_missing={"dingtalk": []},
        notify_group=True,
    )
    assert hooks == ["dingtalk"]
    modes = [s.get("mode") for s in result["deliverySteps"]]
    assert "work_notice" in modes
    assert "group_webhook" in modes


def test_group_webhook_does_not_replace_missing_person(monkeypatch):
    monkeypatch.setattr(
        work_notice,
        "send_work_notices",
        lambda *a, **k: (_ for _ in ()).throw(AssertionError("no person send")),
    )

    def fake_hook(channel, settings, *, summary, artifact_ref):
        return {"channel": f"{channel}_group", "status": "delivered", "mode": "group_webhook"}

    monkeypatch.setattr(
        "app.reports.scheduler.channels.dispatch._send_group_webhook",
        fake_hook,
    )
    result = deliver_to_channels(
        ["dingtalk"],
        artifact_ref="storage://x",
        artifact_kind="standard_render",
        recipient_emails=[],
        attachments=[],
        mock_mode=None,
        settings=get_settings(),
        im_targets={"dingtalk": []},
        im_missing={"dingtalk": ["bob"]},
        notify_group=True,
    )
    person = next(s for s in result["deliverySteps"] if s.get("mode") == "work_notice")
    assert person["status"] == "failed"
    assert result["status"] == "degraded"


def test_update_user_im_accounts_roundtrip():
    session = _session()
    try:
        user = _make_user(session)
        updated = user_service.update_user(
            session,
            user.id,
            UserUpdate(imAccounts={"dingtalk": "ding-9", "wecom": "wx-9"}),
            **_AUDIT,
        )
        accounts = im_bindings.list_accounts(session, updated.id)
        assert accounts["dingtalk"] == "ding-9"
        assert accounts["wecom"] == "wx-9"
        user_service.update_user(
            session,
            user.id,
            UserUpdate(imAccounts={"dingtalk": ""}),
            **_AUDIT,
        )
        accounts = im_bindings.list_accounts(session, user.id)
        assert "dingtalk" not in accounts
        assert accounts["wecom"] == "wx-9"
    finally:
        session.close()
