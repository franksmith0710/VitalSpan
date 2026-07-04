"""M5 VIEW-001 + M6 GOV/API companion r30 — VIEW-001/GOV-001/GOV-002/API-001/API-002."""
from __future__ import annotations

import os
import uuid

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.views.schemas import ViewError
from app.views.validate import validate_dashboard_view

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
