"""T2: filter widget layout schema round-trip + global filter controlType."""

from __future__ import annotations

import uuid

from app.dashboard.global_filters.schemas import FilterBinding
from app.dashboard.schemas import DashboardLayout, FilterWidgetConfig, LayoutWidget


def test_layout_widget_defaults_missing_type_to_chart():
    wid = uuid.uuid4()
    raw = {
        "id": str(wid),
        "title": "旧图",
        "colSpan": 6,
        "rowSpan": 2,
        "order": 0,
        "chartConfig": {
            "chartType": "bar",
            "dataSourceId": str(uuid.uuid4()),
            "mode": "sql",
            "sql": "select 1",
            "dimensions": [{"field": "x"}],
            "metrics": [{"field": "y"}],
        },
    }
    widget = LayoutWidget.model_validate(raw)
    assert widget.type == "chart"
    assert widget.chart_config is not None


def test_filter_widget_round_trip():
    wid = uuid.uuid4()
    layout = DashboardLayout.model_validate(
        {
            "version": 1,
            "widgets": [
                {
                    "id": str(wid),
                    "type": "filter",
                    "title": "区域",
                    "colSpan": 4,
                    "rowSpan": 2,
                    "order": 0,
                    "filterConfig": {
                        "filterId": str(wid),
                        "dimensionRef": "region",
                        "controlType": "select",
                        "options": [{"label": "华东", "value": "east"}],
                        "parameterKey": "region",
                    },
                }
            ],
            "globalFilters": [],
        }
    )
    dumped = layout.model_dump(by_alias=True, mode="json")
    again = DashboardLayout.model_validate(dumped)
    assert again.widgets[0].type == "filter"
    assert again.widgets[0].filter_config is not None
    assert again.widgets[0].filter_config.control_type == "select"
    assert again.widgets[0].filter_config.options[0].value == "east"


def test_filter_binding_defaults_control_type_text():
    binding = FilterBinding.model_validate(
        {"filterId": "f1", "dimensionRef": "region_code", "defaultValue": "all"}
    )
    assert binding.control_type == "text"


def test_filter_widget_config_model():
    cfg = FilterWidgetConfig.model_validate(
        {
            "filterId": "f1",
            "dimensionRef": "dt",
            "controlType": "date",
            "defaultValue": "2026-07-10",
        }
    )
    assert cfg.control_type == "date"
