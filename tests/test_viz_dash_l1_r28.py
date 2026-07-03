"""M5 VIZ/DASH L1 kickoff r28 smoke — VIZ-001~002 + DASH-001~003."""
from __future__ import annotations

import uuid

import pytest
from pydantic import ValidationError

from app.schemas.chart_view import ChartViewConfig, ChartViewError, validate_chart_view_config


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
