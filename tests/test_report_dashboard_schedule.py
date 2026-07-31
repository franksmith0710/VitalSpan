"""G5 dashboard schedule creation."""
from __future__ import annotations

import os

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
    from app.reports.scheduler import executor as scheduler_executor

    scheduler_service._schedules.clear()
    scheduler_executor._EXECUTION_LOG.clear()
    scheduler_executor._EXECUTION_BY_ID.clear()
    scheduler_executor._HISTORY.clear()
    yield
    scheduler_service._schedules.clear()
    scheduler_executor._EXECUTION_LOG.clear()
    scheduler_executor._EXECUTION_BY_ID.clear()
    scheduler_executor._HISTORY.clear()


@pytest.fixture
def client() -> TestClient:
    return TestClient(fastapi_app)


def test_create_dashboard_schedule(client: TestClient):
    dash = client.post(
        "/api/v1/dashboards",
        headers=AUTH,
        json={"name": "Scheduled Dash", "description": "g5"},
    )
    assert dash.status_code == 201
    dash_id = dash.json()["id"]
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
    dash = client.post(
        "/api/v1/dashboards",
        headers=AUTH,
        json={"name": "Filter Dash", "description": "g5-list"},
    )
    dash_id = dash.json()["id"]
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


def test_dashboard_execute_records_layout_inventory_artifact(client: TestClient):
    dash = client.post(
        "/api/v1/dashboards",
        headers=AUTH,
        json={"name": "Exec Dash", "description": "artifact-kind"},
    )
    assert dash.status_code == 201
    dash_id = dash.json()["id"]
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
    assert body.get("artifactKind") == "layout_inventory"
    hist = client.get(f"/api/v1/reports/schedules/{schedule_id}/executions", headers=AUTH)
    assert hist.json()["items"][0]["artifactKind"] == "layout_inventory"
