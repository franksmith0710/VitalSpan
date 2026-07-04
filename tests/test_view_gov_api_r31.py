"""M5 VIEW-001 + M6 companion 质量推分 r31 — VIEW-001/GOV-002/GOV-001/API-001/API-002."""
from __future__ import annotations

import os
import uuid

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import app
from app.views.schemas import ViewError
from app.views.validate import validate_dashboard_view

_R31_SQLITE_URL = "sqlite+pysqlite:///file:view_gov_r31?mode=memory&cache=shared&uri=true"
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


def test_view_empty_widgets_allowed_r31():
    """T-VIEW-R31-001-01: layout.widgets=[] → 200 且 widgets==[]。"""
    view = validate_dashboard_view(
        {"name": "Empty", "layout": {"version": 1, "widgets": [], "globalFilters": []}}
    )
    assert view.layout.widgets == []


def test_view_colspan_bounds_r31():
    """T-VIEW-R31-001-02: colSpan=5 → VIEW_LAYOUT_BOUNDS + detail.fields 含 colSpan。"""
    layout = _valid_layout()
    layout["widgets"][0]["colSpan"] = 5
    with pytest.raises(ViewError) as exc:
        validate_dashboard_view({"name": "Bounds", "layout": layout})
    assert exc.value.code == "VIEW_LAYOUT_BOUNDS"
    assert any("colSpan" in f.get("field", "") for f in exc.value.fields)


def test_view_chart_ref_cycle_r31():
    """T-VIEW-R31-001-03: A→B→A chartRef → VIEW_CHART_REF_CYCLE。"""
    id_a, id_b = str(uuid.uuid4()), str(uuid.uuid4())
    layout = {
        "version": 1,
        "widgets": [
            {"id": id_a, "type": "chart", "title": "A", "colSpan": 12, "order": 0, "chartRef": id_b},
            {"id": id_b, "type": "chart", "title": "B", "colSpan": 12, "order": 1, "chartRef": id_a},
        ],
        "globalFilters": [],
    }
    with pytest.raises(ViewError) as exc:
        validate_dashboard_view({"name": "Cycle", "layout": layout})
    assert exc.value.code == "VIEW_CHART_REF_CYCLE"


@pytest.fixture(scope="module", autouse=True)
def r31_sqlite_env():
    previous = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = _R31_SQLITE_URL
    get_settings.cache_clear()
    from app.auth.models import get_meta_engine as auth_engine
    from app.datasources.models import Base, get_meta_engine
    import app.dashboard.models  # noqa: F401
    import app.datasources.models  # noqa: F401
    import app.governance.catalog.models  # noqa: F401

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


def test_views_validate_api_bounds_body_r31(client):
    """T-VIEW-R31-001-04: POST /views/validate colSpan 越界 → 422 code + detail.fields。"""
    layout = _valid_layout()
    layout["widgets"][0]["colSpan"] = 5
    resp = client.post("/api/v1/views/validate", headers=AUTH, json={"name": "Bad", "layout": layout})
    assert resp.status_code == 422
    body = resp.json()
    assert body["code"] == "VIEW_LAYOUT_BOUNDS"
    assert body["detail"] is not None
    assert isinstance(body["detail"]["fields"], list)


def test_dashboard_layout_put_regression_r31(client, db_session):
    """T-VIEW-R31-001-05: PUT layout 合法 200；重复 widget → DASH_DUPLICATE_WIDGET。"""
    from app.dashboard.service import create_dashboard, update_layout

    dash = create_dashboard(db_session, name="R31 Dash")
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


def test_view_unknown_chart_ref_regression_r31():
    """T-VIEW-R31-001-06: 未知 chartId → VIEW_UNKNOWN_CHART_REF（r30 回归）。"""
    other = str(uuid.uuid4())
    layout = _valid_layout()
    layout["widgets"][0]["chartConfig"]["chartId"] = other
    with pytest.raises(ViewError) as exc:
        validate_dashboard_view({"name": "Ref", "layout": layout})
    assert exc.value.code == "VIEW_UNKNOWN_CHART_REF"
