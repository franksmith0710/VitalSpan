"""G5 dashboard schedule creation."""
from __future__ import annotations

import os
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import app as fastapi_app
from app.reports.scheduler import service as scheduler_service
from jwt_auth import AUTH

_SQLITE = "sqlite+pysqlite:///file:report_dash_sched?mode=memory&cache=shared&uri=true"


@pytest.fixture(scope="module", autouse=True)
def _sqlite():
    prev = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = _SQLITE
    get_settings.cache_clear()
    from app.auth.models import Base as AuthBase, get_meta_engine as auth_engine
    from app.datasources.models import Base, get_meta_engine
    from app.query.models import Base as QueryBase
    import app.auth.models  # noqa: F401
    import app.dashboard.models  # noqa: F401
    import app.reports.models  # noqa: F401

    get_meta_engine.cache_clear()
    auth_engine.cache_clear()
    engine = get_meta_engine()
    Base.metadata.create_all(engine)
    AuthBase.metadata.create_all(engine)
    QueryBase.metadata.create_all(engine)
    yield
    os.environ["DATABASE_URL"] = prev if prev else os.environ.pop("DATABASE_URL", None)
    get_settings.cache_clear()
    get_meta_engine.cache_clear()
    auth_engine.cache_clear()
    fastapi_app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def _reset_schedules():
    from app.dashboard.export_jobs import reset_export_jobs_for_tests
    from app.dashboard.export_token import reset_export_tokens_for_tests
    from app.reports.persistence.store import reset_metadata_for_tests
    from app.reports.scheduler import executor as scheduler_executor
    from app.reports.scheduler.store import reset_schedules_for_tests

    reset_metadata_for_tests()
    reset_schedules_for_tests()
    scheduler_executor._EXECUTION_LOG.clear()
    scheduler_executor._EXECUTION_BY_ID.clear()
    scheduler_executor._HISTORY.clear()
    reset_export_jobs_for_tests()
    reset_export_tokens_for_tests()
    yield
    reset_metadata_for_tests()
    reset_schedules_for_tests()
    scheduler_executor._EXECUTION_LOG.clear()
    scheduler_executor._EXECUTION_BY_ID.clear()
    scheduler_executor._HISTORY.clear()
    reset_export_jobs_for_tests()
    reset_export_tokens_for_tests()


def _dash_with_widget(name: str, description: str) -> dict:
    return {"name": name, "description": description}


def _layout_with_widget() -> dict:
    return {
        "version": 1,
        "widgets": [{
            "id": str(__import__("uuid").uuid4()),
            "type": "text",
            "title": "Placeholder",
            "textConfig": {"content": "export probe"},
            "colSpan": 6,
            "rowSpan": 2,
        }],
    }


def _create_dashboard_with_widget(client: TestClient, *, name: str, description: str) -> str:
    dash = client.post(
        "/api/v1/dashboards",
        headers=AUTH,
        json=_dash_with_widget(name, description),
    )
    assert dash.status_code == 201, dash.text
    dash_id = dash.json()["id"]
    layout = client.put(
        f"/api/v1/dashboards/{dash_id}/layout",
        headers=AUTH,
        json={"layoutJson": _layout_with_widget()},
    )
    assert layout.status_code == 200, layout.text
    return dash_id


@pytest.fixture(autouse=True)
def _mock_visual_pdf(monkeypatch):
    fake_pdf = b"%PDF-1.4 schedule visual\n" + b"y" * 600

    def _fake_render(dashboard_id, *, token, surface="dashboard"):
        return fake_pdf

    monkeypatch.setattr(
        "app.dashboard.export_jobs.render_dashboard_visual_pdf",
        _fake_render,
    )


@pytest.fixture
def client() -> TestClient:
    return TestClient(fastapi_app)


def test_create_dashboard_schedule(client: TestClient):
    dash_id = _create_dashboard_with_widget(client, name="Scheduled Dash", description="g5")
    resp = client.post(
        "/api/v1/reports/schedules",
        headers=AUTH,
        json={
            "sourceType": "dashboard",
            "sourceId": dash_id,
            "cron": "0 9 * * *",
            "recipients": [{"type": "role", "value": "admin"}],
        },
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["sourceType"] == "dashboard"
    assert body["sourceLabel"] == "Scheduled Dash"


def test_list_schedules_by_source_id(client: TestClient):
    dash_id = _create_dashboard_with_widget(client, name="Filter Dash", description="g5-list")
    client.post(
        "/api/v1/reports/schedules",
        headers=AUTH,
        json={
            "sourceType": "dashboard",
            "sourceId": dash_id,
            "cron": "0 9 * * *",
            "recipients": [{"type": "role", "value": "admin"}],
        },
    )
    resp = client.get(
        f"/api/v1/reports/schedules?sourceId={dash_id}&sourceType=dashboard",
        headers=AUTH,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 1
    assert body["items"][0]["sourceId"] == dash_id


def test_delivery_health_endpoint(client: TestClient):
    resp = client.get("/api/v1/reports/schedules/delivery-health", headers=AUTH)
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] in {"reachable", "unreachable", "unconfigured"}


def test_dashboard_execute_records_visual_snapshot_artifact(client: TestClient):
    dash_id = _create_dashboard_with_widget(client, name="Exec Dash", description="artifact-kind")
    sched = client.post(
        "/api/v1/reports/schedules",
        headers=AUTH,
        json={
            "sourceType": "dashboard",
            "sourceId": dash_id,
            "cron": "0 9 * * *",
            "recipients": [{"type": "role", "value": "admin"}],
        },
    )
    schedule_id = sched.json()["id"]
    client.post(
        f"/api/v1/reports/schedules/{schedule_id}/transition",
        headers=AUTH,
        json={"action": "schedule"},
    )
    exec_resp = client.post(
        f"/api/v1/reports/schedules/{schedule_id}/execute",
        headers={**AUTH, "Idempotency-Key": "artifact-kind-1", "X-Rpt-Semi-Real": "1"},
    )
    assert exec_resp.status_code == 200, exec_resp.text
    body = exec_resp.json()
    assert body.get("artifactKind") == "visual_snapshot"
    hist = client.get(f"/api/v1/reports/schedules/{schedule_id}/executions", headers=AUTH)
    assert hist.json()["items"][0]["artifactKind"] == "visual_snapshot"


def test_dashboard_execute_smtp_attaches_pdf(client: TestClient):
    dash_id = _create_dashboard_with_widget(client, name="Attach Dash", description="smtp-pdf")
    sched = client.post(
        "/api/v1/reports/schedules",
        headers=AUTH,
        json={
            "sourceType": "dashboard",
            "sourceId": dash_id,
            "cron": "0 9 * * *",
            "recipients": [{"type": "role", "value": "admin"}],
        },
    )
    schedule_id = sched.json()["id"]
    client.post(
        f"/api/v1/reports/schedules/{schedule_id}/transition",
        headers=AUTH,
        json={"action": "schedule"},
    )
    with patch("app.reports.scheduler.delivery_adapter.smtplib.SMTP") as smtp_cls:
        smtp_instance = smtp_cls.return_value.__enter__.return_value
        exec_resp = client.post(
            f"/api/v1/reports/schedules/{schedule_id}/execute",
            headers={**AUTH, "Idempotency-Key": "smtp-attach-1", "X-Rpt-Semi-Real": "1"},
        )
        assert exec_resp.status_code == 200, exec_resp.text
        body = exec_resp.json()
        assert body.get("status") == "semi_real_succeeded"
        assert body.get("deliverySteps")[0]["status"] == "delivered"
        smtp_instance.send_message.assert_called_once()
        msg = smtp_instance.send_message.call_args[0][0]
        attachments = list(msg.iter_attachments())
        assert len(attachments) == 1
        assert attachments[0].get_filename().endswith(".pdf")
        assert attachments[0].get_content().startswith(b"%PDF")


def test_patch_draft_schedule_updates_cron(client: TestClient):
    dash_id = _create_dashboard_with_widget(client, name="Patch Dash", description="patch")
    sched = client.post(
        "/api/v1/reports/schedules",
        headers=AUTH,
        json={
            "sourceType": "dashboard",
            "sourceId": dash_id,
            "cron": "0 9 * * *",
            "recipients": [{"type": "role", "value": "admin"}],
        },
    )
    schedule_id = sched.json()["id"]
    patch = client.patch(
        f"/api/v1/reports/schedules/{schedule_id}",
        headers=AUTH,
        json={"cron": "0 10 * * *", "name": "Morning Report"},
    )
    assert patch.status_code == 200, patch.text
    body = patch.json()
    assert body["cron"] == "0 10 * * *"
    assert body["name"] == "Morning Report"


def test_patch_non_draft_schedule_rejected(client: TestClient):
    dash_id = _create_dashboard_with_widget(client, name="Locked Dash", description="locked")
    sched = client.post(
        "/api/v1/reports/schedules",
        headers=AUTH,
        json={
            "sourceType": "dashboard",
            "sourceId": dash_id,
            "cron": "0 9 * * *",
            "recipients": [{"type": "role", "value": "admin"}],
        },
    )
    schedule_id = sched.json()["id"]
    client.post(
        f"/api/v1/reports/schedules/{schedule_id}/transition",
        headers=AUTH,
        json={"action": "schedule"},
    )
    patch = client.patch(
        f"/api/v1/reports/schedules/{schedule_id}",
        headers=AUTH,
        json={"cron": "0 11 * * *"},
    )
    assert patch.status_code == 400


def test_empty_dashboard_export_rejected(client: TestClient):
    dash = client.post(
        "/api/v1/dashboards",
        headers=AUTH,
        json=_dash_with_widget("Empty Dash", "no widgets"),
    )
    dash_id = dash.json()["id"]
    export = client.post(
        f"/api/v1/dashboards/{dash_id}/export-jobs",
        headers=AUTH,
        json={"format": "pdf"},
    )
    assert export.status_code == 422
    assert export.json()["code"] == "DASHBOARD_EXPORT_EMPTY"


def test_execute_wecom_webhook_delivered(client: TestClient, monkeypatch):
    monkeypatch.setenv("PUSH_WECOM_WEBHOOK", "https://example.com/wecom-hook")
    get_settings.cache_clear()
    dash_id = _create_dashboard_with_widget(client, name="WeCom Dash", description="wecom")
    sched = client.post(
        "/api/v1/reports/schedules",
        headers=AUTH,
        json={
            "sourceType": "dashboard",
            "sourceId": dash_id,
            "cron": "0 9 * * *",
            "recipients": [{"type": "role", "value": "admin"}],
            "deliveryChannels": ["wecom"],
        },
    )
    schedule_id = sched.json()["id"]
    client.post(
        f"/api/v1/reports/schedules/{schedule_id}/transition",
        headers=AUTH,
        json={"action": "schedule"},
    )
    with patch("app.reports.scheduler.channels.dispatch.httpx.Client") as client_cls:
        resp_mock = client_cls.return_value.__enter__.return_value.post.return_value
        resp_mock.raise_for_status = lambda: None
        exec_resp = client.post(
            f"/api/v1/reports/schedules/{schedule_id}/execute",
            headers={**AUTH, "Idempotency-Key": "wecom-1", "X-Rpt-Semi-Real": "1"},
        )
    assert exec_resp.status_code == 200, exec_resp.text
    body = exec_resp.json()
    assert body["status"] == "semi_real_succeeded"
    wecom_step = next(s for s in body["deliverySteps"] if s["channel"] == "wecom")
    assert wecom_step["status"] == "delivered"


def test_template_schedule_smtp_pdf_attachment(client: TestClient):
    """Template schedule execute → SMTP PDF attachment (RenderSpec renderer)."""
    import uuid

    tpl_key = f"sched-{uuid.uuid4().hex[:8]}"
    ds_id = str(uuid.uuid4())
    client.put(
        f"/api/v1/reports/templates/{tpl_key}",
        headers=AUTH,
        json={
            "templateKey": tpl_key,
            "format": "pdf",
            "displayName": "Schedule PDF",
            "blocks": [{"blockType": "table", "tableRef": "t1"}],
        },
    )
    node_id = client.post(
        "/api/v1/reports/catalog/nodes",
        headers=AUTH,
        json={
            "name": "Sched Template",
            "nodeType": "template",
            "templateKind": "pdf",
            "templateKey": tpl_key,
        },
    ).json()["id"]
    client.put(
        f"/api/v1/reports/catalog/nodes/{node_id}/extension",
        headers=AUTH,
        json={
            "catalogNodeId": node_id,
            "defaultDataSourceId": ds_id,
            "metrics": [{"key": "m1", "label": "M1", "expression": "SELECT 1 AS m1", "visible": True}],
            "filters": [],
            "changeNote": "init",
        },
    )
    sched = client.post(
        "/api/v1/reports/schedules",
        headers=AUTH,
        json={
            "sourceType": "template",
            "sourceId": node_id,
            "cron": "0 9 * * *",
            "recipients": [{"type": "role", "value": "admin"}],
            "attachmentFormats": ["pdf"],
        },
    )
    assert sched.status_code == 201, sched.text
    schedule_id = sched.json()["id"]
    client.post(
        f"/api/v1/reports/schedules/{schedule_id}/transition",
        headers=AUTH,
        json={"action": "schedule"},
    )
    with patch("app.reports.engine.execute.execute_query") as mock_q, patch(
        "app.reports.scheduler.delivery_adapter.smtplib.SMTP",
    ) as smtp_cls:
        from app.query.schemas import ExecuteResponse

        mock_q.return_value = ExecuteResponse(
            columns=["m1"], rows=[[1]], rowCount=1, truncated=False, traceId="t",
        )
        smtp_instance = smtp_cls.return_value.__enter__.return_value
        exec_resp = client.post(
            f"/api/v1/reports/schedules/{schedule_id}/execute",
            headers={**AUTH, "Idempotency-Key": "tpl-smtp-1", "X-Rpt-Semi-Real": "1"},
        )
        assert exec_resp.status_code == 200, exec_resp.text
        body = exec_resp.json()
        assert body.get("status") == "semi_real_succeeded"
        assert body.get("artifactKind") == "template_render"
        smtp_instance.send_message.assert_called_once()
        msg = smtp_instance.send_message.call_args[0][0]
        attachments = list(msg.iter_attachments())
        assert len(attachments) == 1
        assert attachments[0].get_filename().endswith(".pdf")
        assert attachments[0].get_content().startswith(b"%PDF")


def test_schedule_persists_with_db_store(client: TestClient, monkeypatch):
    monkeypatch.setenv("RPT_SCHEDULE_STORE", "db")
    get_settings.cache_clear()
    dash_id = _create_dashboard_with_widget(client, name="DB Store Dash", description="db")
    sched = client.post(
        "/api/v1/reports/schedules",
        headers=AUTH,
        json={
            "sourceType": "dashboard",
            "sourceId": dash_id,
            "cron": "0 9 * * *",
            "recipients": [{"type": "role", "value": "admin"}],
            "name": "Persisted Schedule",
        },
    )
    assert sched.status_code == 201, sched.text
    schedule_id = sched.json()["id"]
    fetched = client.get(f"/api/v1/reports/schedules/{schedule_id}", headers=AUTH)
    assert fetched.status_code == 200
    assert fetched.json()["name"] == "Persisted Schedule"

