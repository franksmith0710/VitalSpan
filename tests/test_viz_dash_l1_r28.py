"""M5 VIZ/DASH L1 kickoff r28 smoke — VIZ-001~002 + DASH-001~003."""
from __future__ import annotations

import os
import uuid

import pytest
from pydantic import ValidationError
from sqlalchemy import text

from app.core.config import get_settings
from app.dashboard.models import Dashboard
from app.dashboard.service import DashboardError, create_dashboard, get_dashboard, update_layout
from app.datasources.models import Base, get_meta_engine, get_meta_session
from app.schemas.chart_view import ChartViewConfig, ChartViewError, validate_chart_view_config

_DASH_SQLITE_URL = "sqlite+pysqlite:///file:viz_dash_r28?mode=memory&cache=shared&uri=true"


@pytest.fixture(scope="module", autouse=True)
def dash_r28_sqlite_env():
    previous = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = _DASH_SQLITE_URL
    get_settings.cache_clear()
    from app.auth.models import get_meta_engine as auth_get_meta_engine

    get_meta_engine.cache_clear()
    auth_get_meta_engine.cache_clear()
    engine = get_meta_engine()
    Base.metadata.create_all(engine)
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM dashboards"))
    yield
    if previous is None:
        os.environ.pop("DATABASE_URL", None)
    else:
        os.environ["DATABASE_URL"] = previous
    get_settings.cache_clear()
    get_meta_engine.cache_clear()
    auth_get_meta_engine.cache_clear()


@pytest.fixture
def db_session():
    session = get_meta_session()
    try:
        yield session
        session.rollback()
        session.execute(text("DELETE FROM dashboards"))
        session.commit()
    finally:
        session.close()


@pytest.fixture
def auth_user_id() -> uuid.UUID:
    return uuid.UUID("00000000-0000-4000-8000-000000000001")


def test_chart_view_table_sql_valid():
    """T-VIZ-R28-001-01: 合法 table+sql 配置 model_validate 成功。"""
    cfg = validate_chart_view_config(
        {
            "chartType": "table",
            "dataSourceId": str(uuid.uuid4()),
            "mode": "sql",
            "sql": "SELECT 1 AS id",
        }
    )
    assert cfg.chart_type == "table"


def test_chart_view_missing_datasource():
    """T-VIZ-R28-001-02: 缺 dataSourceId → ChartViewError CHART_MISSING_DATASOURCE。"""
    with pytest.raises(ChartViewError) as exc:
        validate_chart_view_config(
            {"chartType": "table", "mode": "sql", "sql": "SELECT 1"}
        )
    assert exc.value.code == "CHART_MISSING_DATASOURCE"
    assert exc.value.status == 422


def test_chart_view_invalid_type():
    """T-VIZ-R28-001-03: chartType=pie → CHART_INVALID_TYPE。"""
    with pytest.raises(ChartViewError) as exc:
        validate_chart_view_config(
            {
                "chartType": "pie",
                "dataSourceId": str(uuid.uuid4()),
                "mode": "sql",
                "sql": "SELECT 1",
            }
        )
    assert exc.value.code == "CHART_INVALID_TYPE"


def test_chart_view_binding_conflict():
    """T-VIZ-R28-001-04: bindingId + sql 同存 → CHART_BINDING_CONFLICT。"""
    with pytest.raises(ChartViewError) as exc:
        validate_chart_view_config(
            {
                "chartType": "table",
                "bindingId": str(uuid.uuid4()),
                "dataSourceId": str(uuid.uuid4()),
                "mode": "sql",
                "sql": "SELECT 1",
            }
        )
    assert exc.value.code == "CHART_BINDING_CONFLICT"


def test_chart_view_camel_round_trip():
    """T-VIZ-R28-001-05: JSON camelCase ↔ snake 一致。"""
    ds = uuid.uuid4()
    raw = {
        "chartType": "line",
        "dataSourceId": str(ds),
        "mode": "sql",
        "sql": "SELECT 1 AS x, 2 AS y",
        "dimensions": [{"field": "x", "label": "X"}],
        "metrics": [{"field": "y"}],
    }
    cfg = validate_chart_view_config(raw)
    dumped = cfg.model_dump(by_alias=True, mode="json")
    assert dumped["chartType"] == "line"
    assert dumped["dataSourceId"] == str(ds)


def test_post_charts_validate_rejects_invalid(client, auth_headers):
    """T-VIZ-R28-001-06: POST /api/v1/charts/validate 非法 → 422 结构化 body。"""
    resp = client.post(
        "/api/v1/charts/validate",
        json={"chartType": "pie"},
        headers=auth_headers,
    )
    assert resp.status_code == 422
    body = resp.json()
    assert body["code"] == "CHART_INVALID_TYPE"


def test_create_dashboard_success(db_session, auth_user_id):
    """T-DASH-R28-001-01: POST 创建 → 返回 id。"""
    out = create_dashboard(db_session, name="销售看板", slug="sales", created_by=auth_user_id)
    assert out.name == "销售看板"
    assert out.slug == "sales"


def test_duplicate_slug_conflict(db_session, auth_user_id):
    """T-DASH-R28-001-05: 重复 slug → DASH_SLUG_CONFLICT。"""
    create_dashboard(db_session, name="A", slug="dup", created_by=auth_user_id)
    with pytest.raises(DashboardError) as exc:
        create_dashboard(db_session, name="B", slug="dup", created_by=auth_user_id)
    assert exc.value.code == "DASH_SLUG_CONFLICT"
    assert exc.value.status == 409


def test_dashboard_crud_smoke(client, auth_headers):
    """T-DASH-R28-001-01~04: CRUD + layout round-trip。"""
    create = client.post(
        "/api/v1/dashboards",
        json={"name": "测试看板", "slug": "test-dash"},
        headers=auth_headers,
    )
    assert create.status_code == 201
    dash_id = create.json()["id"]
    layout = {
        "version": 1,
        "widgets": [{
            "id": str(uuid.uuid4()),
            "type": "chart",
            "title": "表",
            "colSpan": 6,
            "rowSpan": 1,
            "order": 0,
            "chartConfig": {
                "chartType": "table",
                "dataSourceId": str(uuid.uuid4()),
                "mode": "sql",
                "sql": "SELECT 1 AS id",
            },
        }],
        "globalFilters": [],
    }
    put_layout = client.put(
        f"/api/v1/dashboards/{dash_id}/layout",
        json={"layoutJson": layout},
        headers=auth_headers,
    )
    assert put_layout.status_code == 200
    got = client.get(f"/api/v1/dashboards/{dash_id}", headers=auth_headers)
    assert got.json()["layoutJson"]["widgets"][0]["chartConfig"]["chartType"] == "table"


def test_dashboard_layout_invalid_chart(client, auth_headers):
    """T-DASH-R28-001-06: 非法 chartType → 422 DASH_INVALID_LAYOUT。"""
    create = client.post(
        "/api/v1/dashboards",
        json={"name": "X", "slug": "x-invalid"},
        headers=auth_headers,
    )
    dash_id = create.json()["id"]
    resp = client.put(
        f"/api/v1/dashboards/{dash_id}/layout",
        json={"layoutJson": {"version": 1, "widgets": [{
            "id": str(uuid.uuid4()), "type": "chart", "title": "t",
            "colSpan": 6, "rowSpan": 1, "order": 0,
            "chartConfig": {"chartType": "pie"},
        }], "globalFilters": []}},
        headers=auth_headers,
    )
    assert resp.status_code == 422
    assert resp.json()["code"] == "DASH_INVALID_LAYOUT"
