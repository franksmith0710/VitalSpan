"""Tests for template demo datasource binding."""

from __future__ import annotations

import uuid

from app.dashboard.templates.demo_datasource import (
    TEMPLATE_DEMO_DATASOURCE_REF,
    bind_template_demo_datasources,
    repair_legacy_template_layout,
)
from app.dashboard.templates import presets
from app.dashboard.service import validate_layout
import uuid


def test_bind_template_demo_datasources_replaces_magic_ref() -> None:
    ds_id = uuid.uuid4()
    layout = {
        "version": 1,
        "widgets": [
            {
                "id": "w1",
                "type": "chart",
                "chartConfig": {
                    "chartId": "w1",
                    "chartType": "bar",
                    "dataSourceId": TEMPLATE_DEMO_DATASOURCE_REF,
                    "sql": "SELECT 1",
                },
            }
        ],
        "globalFilters": [],
    }
    bound = bind_template_demo_datasources(layout, ds_id)
    assert bound["widgets"][0]["chartConfig"]["dataSourceId"] == str(ds_id)


def test_repair_legacy_template_layout_normalizes_gap_and_chart_style() -> None:
    layout = {
        "version": 1,
        "widgets": [],
        "globalFilters": [],
        "styleConfig": {
            "gapPreset": "comfortable",
            "chartStyle": {"labelColor": "#abc"},
            "gap": 16,
        },
    }
    repaired = repair_legacy_template_layout(layout)
    assert repaired["styleConfig"]["gapPreset"] == "md"
    assert repaired["styleConfig"]["chartLabelStyle"] == {"color": "#abc"}
    assert "chartStyle" not in repaired["styleConfig"]


def test_builtin_preset_layout_validates_after_demo_bind() -> None:
    layout = presets.build_triple_analysis_layout()
    bound = bind_template_demo_datasources(layout, uuid.uuid4())
    validate_layout(bound)
