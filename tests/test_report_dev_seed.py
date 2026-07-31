"""G3 dev seed + G1 recipients smoke tests."""
from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

from app.auth.deps import UserContext
from app.core.config import get_settings
from app.main import app as fastapi_app
from app.reports.catalog import service as catalog_service
from app.reports.prefab import service as prefab_service
from app.reports.scheduler import service as scheduler_service
from app.reports.templates import service as template_service
from jwt_auth import AUTH

_SQLITE = "sqlite+pysqlite:///file:report_dev_seed?mode=memory&cache=shared&uri=true"


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
def _reset_memory_stores():
    catalog_service._nodes.clear()
    template_service._store.clear()
    prefab_service._store.clear()
    scheduler_service._schedules.clear()
    yield
    catalog_service._nodes.clear()
    template_service._store.clear()
    prefab_service._store.clear()
    scheduler_service._schedules.clear()


@pytest.fixture
def client() -> TestClient:
    return TestClient(fastapi_app)


def test_dev_seed_idempotent_without_mysql(monkeypatch):
    from app.auth.models import get_meta_session
    from app.reports import dev_seed

    monkeypatch.setattr(dev_seed, "_resolve_or_create_datasource", lambda _s: None)
    session = get_meta_session()
    try:
        first = dev_seed.seed_dev_reports(session)
        second = dev_seed.seed_dev_reports(session)
    finally:
        session.close()
    assert first["prefab"] >= 1
    assert second["prefab"] >= 1


def test_schedule_with_recipients_and_source_fields(client: TestClient):
    from app.reports.catalog.schemas import CatalogNodeCreate

    admin = UserContext(id="1", username="admin", roles=["admin"])
    node = catalog_service.create_node(
        CatalogNodeCreate(name="Tpl", nodeType="template", templateKind="pdf"),
        admin,
    )
    resp = client.post(
        "/api/v1/reports/schedules",
        headers=AUTH,
        json={
            "catalogNodeId": str(node.id),
            "cron": "0 8 * * 1",
            "recipients": [{"type": "role", "value": "admin"}],
        },
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["sourceType"] == "template"
    assert body["sourceId"] == str(node.id)
    assert body["recipients"][0]["value"] == "admin"


def test_dashboard_export_job(client: TestClient):
    dash = client.post(
        "/api/v1/dashboards",
        headers=AUTH,
        json={"name": "Export Dash", "description": "seed"},
    )
    assert dash.status_code == 201, dash.text
    dash_id = dash.json()["id"]
    job = client.post(
        f"/api/v1/dashboards/{dash_id}/export-jobs",
        headers=AUTH,
        json={"format": "pdf"},
    )
    assert job.status_code == 201, job.text
    assert job.json()["status"] == "ready"
    dl = client.get(job.json()["downloadUrl"], headers=AUTH)
    assert dl.status_code == 200
    assert len(dl.content) > 0
