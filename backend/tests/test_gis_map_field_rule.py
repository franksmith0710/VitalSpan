from __future__ import annotations

from uuid import uuid4

import pytest

from app.schemas.chart_view import ChartViewError, validate_chart_view_config


def _gis_od_payload(*, dimensions: list[dict[str, str]], axes: dict | None = None) -> dict:
    payload: dict = {
        "chartType": "gis-map",
        "styleVariant": "default",
        "mode": "dataset",
        "dataSourceId": str(uuid4()),
        "configId": str(uuid4()),
        "dimensions": dimensions,
        "metrics": [],
        "nativeBody": {"gisProject": {"flow": {"enabled": True}}},
    }
    if axes is not None:
        payload["axes"] = axes
    return payload


def test_gis_map_od_four_dimensions_passes_validate() -> None:
    cfg = validate_chart_view_config(
        _gis_od_payload(
            dimensions=[
                {"field": "from_lng"},
                {"field": "from_lat"},
                {"field": "to_lng"},
                {"field": "to_lat"},
            ],
        ),
    )
    assert cfg.chart_type == "gis-map"
    assert len(cfg.dimensions) == 4


def test_gis_map_od_five_dimensions_with_label_passes_validate() -> None:
    cfg = validate_chart_view_config(
        _gis_od_payload(
            dimensions=[
                {"field": "from_lng"},
                {"field": "from_lat"},
                {"field": "to_lng"},
                {"field": "to_lat"},
                {"field": "route_name"},
            ],
        ),
    )
    assert len(cfg.dimensions) == 5


def test_gis_map_od_axes_projection_overrides_stale_dimensions() -> None:
    cfg = validate_chart_view_config(
        _gis_od_payload(
            dimensions=[{"field": "from_lng"}],
            axes={
                "xAxis": [{"field": "from_lng"}],
                "xAxisExt": [{"field": "from_lat"}],
                "drill": [
                    {"field": "to_lng"},
                    {"field": "to_lat"},
                    {"field": "route_name"},
                ],
                "yAxis": [{"field": "weight"}],
            },
        ),
    )
    assert [d.field for d in cfg.dimensions] == [
        "from_lng",
        "from_lat",
        "to_lng",
        "to_lat",
        "route_name",
    ]
    assert cfg.metrics[0].field == "weight"


def test_gis_map_registry_allows_od_slot_count() -> None:
    from app.viz.registry import export_chart_type_catalog, get_spec

    rule = get_spec("gis-map").field_rule
    assert rule.max_dimensions >= 5
    assert rule.max_metrics >= 1
    assert rule.min_metrics == 0

    catalog = export_chart_type_catalog()
    exported = next(item for item in catalog if item["type"] == "gis-map")
    assert exported["fieldRule"]["maxDimensions"] >= 5
