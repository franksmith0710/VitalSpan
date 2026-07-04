"""M5 VIZ/DASH quality push r29 — VIZ-001~002 + DASH-001~003."""
from __future__ import annotations

import os
import time
import uuid

import pytest
from sqlalchemy import text

from app.core.config import get_settings
from app.dashboard.models import Dashboard
from app.dashboard.service import create_dashboard, get_dashboard, update_layout
from app.datasources.models import Base, get_meta_engine, get_meta_session
from app.schemas.chart_view import ChartViewError, validate_chart_view_config

_DASH_SQLITE_URL = "sqlite+pysqlite:///file:viz_dash_r29?mode=memory&cache=shared&uri=true"


@pytest.fixture(scope="module", autouse=True)
def dash_r29_sqlite_env():
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


def _chart_table_config(ds_id: str | None = None) -> dict:
    return {
        "chartType": "table",
        "dataSourceId": ds_id or str(uuid.uuid4()),
        "mode": "sql",
        "sql": "SELECT 1",
    }


def test_chart_view_oversized_dimension_field():
    """T-VIZ-R29-001-01: dimensions[].field >128 → 422 + fields。"""
    with pytest.raises(ChartViewError) as exc:
        validate_chart_view_config(
            {
                "chartType": "table",
                "dataSourceId": str(uuid.uuid4()),
                "mode": "sql",
                "sql": "SELECT 1",
                "dimensions": [{"field": "x" * 129}],
            }
        )
    assert exc.value.code == "CHART_INVALID"
    assert any(f.get("field") == "dimensions" for f in exc.value.fields)


def test_chart_view_too_many_filters():
    """T-VIZ-R29-001-02: filters 超 16 项 → 422。"""
    filters = [
        {"field": f"f{i}", "operator": "eq", "value": "1"} for i in range(17)
    ]
    with pytest.raises(ChartViewError) as exc:
        validate_chart_view_config(
            {
                "chartType": "table",
                "dataSourceId": str(uuid.uuid4()),
                "mode": "sql",
                "sql": "SELECT 1",
                "filters": filters,
            }
        )
    assert exc.value.status == 422
    assert exc.value.fields


def test_chart_view_line_missing_metrics_fields():
    """T-VIZ-R29-001-03: line 缺 metrics → fields 含 metrics。"""
    with pytest.raises(ChartViewError) as exc:
        validate_chart_view_config(
            {
                "chartType": "line",
                "dataSourceId": str(uuid.uuid4()),
                "mode": "sql",
                "sql": "SELECT 1 AS x",
                "dimensions": [{"field": "x"}],
                "metrics": [],
            }
        )
    assert exc.value.code == "CHART_MISSING_SERIES"
    assert any("metrics" in (f.get("field") or "") for f in exc.value.fields)


def test_post_charts_validate_fields_detail(client, auth_headers):
    """T-VIZ-R29-001-04: POST validate 非法 → detail.fields 数组。"""
    resp = client.post(
        "/api/v1/charts/validate",
        json={
            "chartType": "line",
            "dataSourceId": str(uuid.uuid4()),
            "mode": "sql",
            "sql": "SELECT 1",
            "dimensions": [{"field": "x"}],
        },
        headers=auth_headers,
    )
    assert resp.status_code == 422
    body = resp.json()
    assert body["code"] == "CHART_MISSING_SERIES"
    assert body["detail"] is not None
    assert "fields" in body["detail"]
    assert isinstance(body["detail"]["fields"], list)


def test_chart_view_validate_performance_smoke():
    """T-VIZ-R29-001-05: 连续 100 次 validate <1s。"""
    payload = {
        "chartType": "table",
        "dataSourceId": str(uuid.uuid4()),
        "mode": "sql",
        "sql": "SELECT 1",
        "dimensions": [{"field": f"d{i}"} for i in range(8)],
    }
    start = time.perf_counter()
    for _ in range(100):
        validate_chart_view_config(payload)
    assert time.perf_counter() - start < 1.0


def test_layout_duplicate_widget_id(client, auth_headers):
    """T-DASH-R29-002-01: 重复 widget id → 422 DASH_DUPLICATE_WIDGET。"""
    created = client.post(
        "/api/v1/dashboards",
        json={"name": "Dup", "slug": "dup-widget"},
        headers=auth_headers,
    )
    dash_id = created.json()["id"]
    wid = str(uuid.uuid4())
    resp = client.put(
        f"/api/v1/dashboards/{dash_id}/layout",
        json={
            "layoutJson": {
                "version": 1,
                "widgets": [
                    {
                        "id": wid,
                        "type": "chart",
                        "title": "A",
                        "colSpan": 6,
                        "rowSpan": 1,
                        "order": 0,
                        "chartConfig": {
                            **_chart_table_config(),
                            "chartId": wid,
                        },
                    },
                    {
                        "id": wid,
                        "type": "chart",
                        "title": "B",
                        "colSpan": 6,
                        "rowSpan": 1,
                        "order": 1,
                        "chartConfig": {
                            **_chart_table_config(),
                            "chartId": wid,
                        },
                    },
                ],
                "globalFilters": [],
            }
        },
        headers=auth_headers,
    )
    assert resp.status_code == 422
    assert resp.json()["code"] == "DASH_DUPLICATE_WIDGET"


def test_layout_chart_id_mismatch(client, auth_headers):
    """T-DASH-R29-002-02: chartId ≠ widget.id → 422 DASH_CHART_ID_MISMATCH。"""
    created = client.post(
        "/api/v1/dashboards",
        json={"name": "Mismatch", "slug": "chart-id-mismatch"},
        headers=auth_headers,
    )
    dash_id = created.json()["id"]
    wid = str(uuid.uuid4())
    other_id = str(uuid.uuid4())
    resp = client.put(
        f"/api/v1/dashboards/{dash_id}/layout",
        json={
            "layoutJson": {
                "version": 1,
                "widgets": [
                    {
                        "id": wid,
                        "type": "chart",
                        "title": "A",
                        "colSpan": 6,
                        "rowSpan": 1,
                        "order": 0,
                        "chartConfig": {
                            **_chart_table_config(),
                            "chartId": other_id,
                        },
                    },
                ],
                "globalFilters": [],
            }
        },
        headers=auth_headers,
    )
    assert resp.status_code == 422
    assert resp.json()["code"] == "DASH_CHART_ID_MISMATCH"


def test_layout_missing_chart_config(client, auth_headers):
    """T-DASH-R29-002-03: chart 类型缺 chartConfig → 422 DASH_MISSING_CHART_CONFIG。"""
    created = client.post(
        "/api/v1/dashboards",
        json={"name": "NoCfg", "slug": "missing-chart-config"},
        headers=auth_headers,
    )
    dash_id = created.json()["id"]
    resp = client.put(
        f"/api/v1/dashboards/{dash_id}/layout",
        json={
            "layoutJson": {
                "version": 1,
                "widgets": [
                    {
                        "id": str(uuid.uuid4()),
                        "type": "chart",
                        "title": "A",
                        "colSpan": 6,
                        "rowSpan": 1,
                        "order": 0,
                        "chartConfig": None,
                    },
                ],
                "globalFilters": [],
            }
        },
        headers=auth_headers,
    )
    assert resp.status_code == 422
    assert resp.json()["code"] == "DASH_MISSING_CHART_CONFIG"


def test_layout_empty_widgets_valid(client, auth_headers):
    """T-DASH-R29-003-03: 删除全部 widget 后空数组合法。"""
    created = client.post(
        "/api/v1/dashboards",
        json={"name": "Empty", "slug": "empty-widgets-r29"},
        headers=auth_headers,
    )
    dash_id = created.json()["id"]
    resp = client.put(
        f"/api/v1/dashboards/{dash_id}/layout",
        json={"layoutJson": {"version": 1, "widgets": [], "globalFilters": []}},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["layoutJson"]["widgets"] == []


def test_layout_max_32_widgets(client, auth_headers):
    """T-DASH-R29-003-04: 32 widgets 通过；33 → 422。"""
    created = client.post(
        "/api/v1/dashboards",
        json={"name": "Max", "slug": "max-widgets-r29"},
        headers=auth_headers,
    )
    dash_id = created.json()["id"]

    def make_widget(order: int) -> dict:
        wid = str(uuid.uuid4())
        return {
            "id": wid,
            "type": "chart",
            "title": f"W{order}",
            "colSpan": 6,
            "rowSpan": 1,
            "order": order,
            "chartConfig": {**_chart_table_config(), "chartId": wid},
        }

    ok_widgets = [make_widget(i) for i in range(32)]
    ok_resp = client.put(
        f"/api/v1/dashboards/{dash_id}/layout",
        json={"layoutJson": {"version": 1, "widgets": ok_widgets, "globalFilters": []}},
        headers=auth_headers,
    )
    assert ok_resp.status_code == 200

    too_many = [make_widget(i) for i in range(33)]
    resp = client.put(
        f"/api/v1/dashboards/{dash_id}/layout",
        json={"layoutJson": {"version": 1, "widgets": too_many, "globalFilters": []}},
        headers=auth_headers,
    )
    assert resp.status_code == 422


def test_layout_title_round_trip(db_session, auth_user_id):
    """T-DASH-R29-003-06: title/colSpan 保存后 GET 一致。"""
    out = create_dashboard(db_session, name="RT", slug="title-rt", created_by=auth_user_id)
    wid = str(uuid.uuid4())
    layout = {
        "version": 1,
        "widgets": [
            {
                "id": wid,
                "type": "chart",
                "title": "自定义标题",
                "colSpan": 8,
                "rowSpan": 2,
                "order": 0,
                "chartConfig": {**_chart_table_config(), "chartId": wid},
            },
        ],
        "globalFilters": [],
    }
    update_layout(db_session, out.id, layout)
    got = get_dashboard(db_session, out.id)
    widget = got.layout_json["widgets"][0]
    assert widget["title"] == "自定义标题"
    assert widget["colSpan"] == 8
    assert widget["rowSpan"] == 2


def test_dashboard_duplicate_name_allowed(client, auth_headers):
    """T-DASH-R29-001-01: 同名不同 slug → 201。"""
    r1 = client.post(
        "/api/v1/dashboards",
        json={"name": "Same", "slug": "same-a"},
        headers=auth_headers,
    )
    r2 = client.post(
        "/api/v1/dashboards",
        json={"name": "Same", "slug": "same-b"},
        headers=auth_headers,
    )
    assert r1.status_code == 201 and r2.status_code == 201


def test_list_dashboards_pagination(client, auth_headers):
    """T-DASH-R29-001-02: limit=2 offset=1 数学正确。"""
    for i in range(4):
        client.post(
            "/api/v1/dashboards",
            json={"name": f"P{i}", "slug": f"pag-{i}-{uuid.uuid4().hex[:8]}"},
            headers=auth_headers,
        )
    resp = client.get("/api/v1/dashboards?limit=2&offset=1", headers=auth_headers)
    body = resp.json()
    assert body["limit"] == 2 and body["offset"] == 1
    assert len(body["items"]) == 2
    assert body["total"] >= 4


def test_soft_deleted_not_in_list(client, auth_headers):
    """T-DASH-R29-001-03: DELETE 后 list 不含该 id。"""
    created = client.post(
        "/api/v1/dashboards",
        json={"name": "SoftDel", "slug": f"soft-del-{uuid.uuid4().hex[:8]}"},
        headers=auth_headers,
    )
    dash_id = created.json()["id"]
    client.delete(f"/api/v1/dashboards/{dash_id}", headers=auth_headers)
    resp = client.get("/api/v1/dashboards", headers=auth_headers)
    ids = [item["id"] for item in resp.json()["items"]]
    assert dash_id not in ids


def test_concurrent_name_patch_last_wins(client, auth_headers):
    """T-DASH-R29-001-04: 连续两次 PUT name 后者生效。"""
    created = client.post(
        "/api/v1/dashboards",
        json={"name": "A", "slug": f"cc-a-{uuid.uuid4().hex[:8]}"},
        headers=auth_headers,
    )
    dash_id = created.json()["id"]
    client.put(f"/api/v1/dashboards/{dash_id}", json={"name": "B"}, headers=auth_headers)
    client.put(f"/api/v1/dashboards/{dash_id}", json={"name": "C"}, headers=auth_headers)
    got = client.get(f"/api/v1/dashboards/{dash_id}", headers=auth_headers)
    assert got.json()["name"] == "C"


def test_chart_view_many_dimensions_boundary():
    """T-VIZ-R29-002-05: 8 dimensions 边界 validate 成功（性能代理）。"""
    cfg = validate_chart_view_config(
        {
            "chartType": "table",
            "dataSourceId": str(uuid.uuid4()),
            "mode": "sql",
            "sql": "SELECT 1",
            "dimensions": [{"field": f"d{i}"} for i in range(8)],
        }
    )
    assert len(cfg.dimensions) == 8
