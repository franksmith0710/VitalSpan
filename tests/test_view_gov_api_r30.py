"""M5 VIEW-001 + M6 GOV/API companion r30 — VIEW-001/GOV-001/GOV-002/API-001/API-002."""
from __future__ import annotations

import os
import uuid

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.views.schemas import ViewError
from app.views.validate import validate_dashboard_view
from app.main import app

_R30_SQLITE_URL = "sqlite+pysqlite:///file:view_gov_r30?mode=memory&cache=shared&uri=true"
AUTH = {"Authorization": "Bearer dev"}


def _valid_layout(widget_id: str | None = None) -> dict:
    wid = widget_id or str(uuid.uuid4())
    return {
        "version": 1,
        "widgets": [
            {
                "id": wid,
                "type": "chart",
                "title": "KPI",
                "colSpan": 12,
                "order": 0,
                "chartConfig": {
                    "chartType": "table",
                    "dataSourceId": str(uuid.uuid4()),
                    "mode": "sql",
                    "sql": "SELECT 1",
                },
            }
        ],
        "globalFilters": [],
    }


def test_view_valid_layout_and_name():
    """T-VIEW-R30-001-01: 合法 layout + name → validate_dashboard_view 成功。"""
    view = validate_dashboard_view({"name": "Main", "layout": _valid_layout()})
    assert view.name == "Main"
    assert view.layout.version == 1


def test_view_empty_widgets_allowed():
    """T-VIEW-R30-001-02: layout.widgets=[] → 200。"""
    view = validate_dashboard_view(
        {"name": "Empty", "layout": {"version": 1, "widgets": [], "globalFilters": []}}
    )
    assert view.layout.widgets == []


def test_view_invalid_chart_type():
    """T-VIEW-R30-001-03: 非法 chartType → 422。"""
    layout = _valid_layout()
    layout["widgets"][0]["chartConfig"]["chartType"] = "pie"
    with pytest.raises(ViewError) as exc:
        validate_dashboard_view({"name": "Bad", "layout": layout})
    assert exc.value.status == 422


def test_view_unknown_chart_ref_via_chart_id():
    """T-VIEW-R30-001-04: chartConfig.chartId 指向不存在 widget → VIEW_UNKNOWN_CHART_REF。"""
    other = str(uuid.uuid4())
    layout = _valid_layout()
    layout["widgets"][0]["chartConfig"]["chartId"] = other
    with pytest.raises(ViewError) as exc:
        validate_dashboard_view({"name": "Ref", "layout": layout})
    assert exc.value.code == "VIEW_UNKNOWN_CHART_REF"


@pytest.fixture(scope="module", autouse=True)
def r30_sqlite_env():
    previous = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = _R30_SQLITE_URL
    get_settings.cache_clear()
    from app.auth.models import get_meta_engine as auth_engine
    from app.datasources.models import Base, get_meta_engine
    import app.governance.catalog.models  # noqa: F401 — register ORM tables

    get_meta_engine.cache_clear()
    auth_engine.cache_clear()
    engine = get_meta_engine()
    Base.metadata.create_all(engine)
    yield
    if previous is None:
        os.environ.pop("DATABASE_URL", None)
    else:
        os.environ["DATABASE_URL"] = previous
    get_settings.cache_clear()
    get_meta_engine.cache_clear()
    auth_engine.cache_clear()


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def db_session():
    from app.datasources.models import get_meta_session
    from sqlalchemy import text

    session = get_meta_session()
    try:
        yield session
        session.rollback()
        session.execute(text("DELETE FROM dashboards"))
        session.commit()
    finally:
        session.close()


def test_view_default_view_self_ref():
    """T-VIEW-R30-001-05: defaultViewId == id → VIEW_DEFAULT_SELF_REF。"""
    vid = uuid.uuid4()
    with pytest.raises(ViewError) as exc:
        validate_dashboard_view(
            {"id": str(vid), "name": "Self", "defaultViewId": str(vid), "layout": _valid_layout()}
        )
    assert exc.value.code == "VIEW_DEFAULT_SELF_REF"


def test_views_validate_api_invalid(client):
    """T-VIEW-R30-001-06: POST /views/validate 非法 → 422 结构化 body。"""
    resp = client.post(
        "/api/v1/views/validate",
        headers=AUTH,
        json={
            "name": "Bad",
            "layout": {
                "version": 1,
                "widgets": [{"id": str(uuid.uuid4()), "type": "chart", "title": "X", "colSpan": 12}],
            },
        },
    )
    assert resp.status_code == 422
    body = resp.json()
    assert "code" in body and "message" in body


def test_dashboard_layout_put_regression(client, db_session):
    """T-VIEW-R30-001-07/08: PUT layout 合法 200；重复 widget → DASH_DUPLICATE_WIDGET。"""
    from app.dashboard.service import create_dashboard, update_layout

    dash = create_dashboard(db_session, name="R30 Dash")
    layout = _valid_layout()
    out = update_layout(db_session, dash.id, layout)
    assert out.layout_json["widgets"]
    dup = layout.copy()
    dup["widgets"] = [layout["widgets"][0], layout["widgets"][0]]
    resp = client.put(
        f"/api/v1/dashboards/{dash.id}/layout",
        headers=AUTH,
        json={"layoutJson": dup},
    )
    assert resp.status_code == 422
    assert resp.json()["code"] == "DASH_DUPLICATE_WIDGET"


def test_gov_categories_three(client):
    """T-GOV-R30-001-01: GET categories → 恰好 3 条 CAT-01/02/03。"""
    resp = client.get("/api/v1/gov/catalog/categories", headers=AUTH)
    assert resp.status_code == 200
    codes = {item["code"] for item in resp.json()["items"]}
    assert codes == {"CAT-01", "CAT-02", "CAT-03"}


def test_gov_create_entry_ok(client):
    """T-GOV-R30-001-02: POST entry categoryCodes CAT-02 → 201。"""
    resp = client.post(
        "/api/v1/gov/catalog/entries",
        headers=AUTH,
        json={
            "name": "Aggregate stats",
            "httpMethod": "GET",
            "path": "/api/v1/stats/aggregate",
            "categoryCodes": ["CAT-02"],
            "status": "active",
        },
    )
    assert resp.status_code == 201
    assert resp.json()["categoryCodes"] == ["CAT-02"]


def test_gov_create_entry_invalid_category(client):
    """T-GOV-R30-001-03: categoryCodes CAT-99 → 400 CATALOG_INVALID_CATEGORY。"""
    resp = client.post(
        "/api/v1/gov/catalog/entries",
        headers=AUTH,
        json={"name": "Bad", "httpMethod": "GET", "path": "/x", "categoryCodes": ["CAT-99"]},
    )
    assert resp.status_code == 400
    assert resp.json()["code"] == "CATALOG_INVALID_CATEGORY"


def test_gov_list_entries_filter(client):
    """T-GOV-R30-001-04: GET entries ?category=CAT-01 过滤。"""
    client.post(
        "/api/v1/gov/catalog/entries",
        headers=AUTH,
        json={
            "name": "E1",
            "httpMethod": "GET",
            "path": "/api/v1/entities/x",
            "categoryCodes": ["CAT-01"],
            "status": "active",
        },
    )
    client.post(
        "/api/v1/gov/catalog/entries",
        headers=AUTH,
        json={
            "name": "E2",
            "httpMethod": "GET",
            "path": "/api/v1/stats",
            "categoryCodes": ["CAT-02"],
            "status": "active",
        },
    )
    resp = client.get("/api/v1/gov/catalog/entries?category=CAT-01", headers=AUTH)
    assert resp.status_code == 200
    for item in resp.json()["items"]:
        assert "CAT-01" in item["categoryCodes"]


def _create_entry(client, *, path: str, status: str = "active") -> str:
    resp = client.post(
        "/api/v1/gov/catalog/entries",
        headers=AUTH,
        json={
            "name": "Reg",
            "httpMethod": "POST",
            "path": path,
            "categoryCodes": ["CAT-01"],
            "status": status,
        },
    )
    assert resp.status_code == 201
    return resp.json()["id"]


def test_bus_register_active_succeeded(client):
    """T-GOV-R30-002-01: active entry → 201 status=succeeded + traceId。"""
    eid = _create_entry(client, path="/api/v1/query/execute")
    resp = client.post("/api/v1/gov/bus/register", headers=AUTH, json={"catalogEntryId": eid})
    assert resp.status_code == 201
    body = resp.json()
    assert body["status"] == "succeeded"
    assert body["traceId"]


def test_bus_register_draft_not_publishable(client):
    """T-GOV-R30-002-02: draft → 400 BUS_ENTRY_NOT_PUBLISHABLE。"""
    eid = _create_entry(client, path="/api/v1/x", status="draft")
    resp = client.post("/api/v1/gov/bus/register", headers=AUTH, json={"catalogEntryId": eid})
    assert resp.status_code == 400
    assert resp.json()["code"] == "BUS_ENTRY_NOT_PUBLISHABLE"


def test_bus_register_not_found(client):
    """T-GOV-R30-002-03: 不存在 entryId → 404 CATALOG_ENTRY_NOT_FOUND。"""
    resp = client.post(
        "/api/v1/gov/bus/register",
        headers=AUTH,
        json={"catalogEntryId": str(uuid.uuid4())},
    )
    assert resp.status_code == 404
    assert resp.json()["code"] == "CATALOG_ENTRY_NOT_FOUND"


def test_bus_register_force_fail(client):
    """T-GOV-R30-002-04: path 含 force-fail → 502 BUS_REGISTRATION_REJECTED。"""
    eid = _create_entry(client, path="/api/v1/force-fail/demo")
    resp = client.post("/api/v1/gov/bus/register", headers=AUTH, json={"catalogEntryId": eid})
    assert resp.status_code == 502
    assert resp.json()["code"] == "BUS_REGISTRATION_REJECTED"
