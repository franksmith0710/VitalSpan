"""存量 chartConfig 迁移 — 与 FE migrateChartTypes 对齐。"""

from __future__ import annotations

from app.schemas.chart_view import ChartViewConfigLayout
from app.viz.migrate_chart_types import migrate_chart_config, migrate_layout_chart_configs


def test_migrate_bar_stacked_to_bar_stack():
    out = migrate_chart_config({"chartType": "bar", "styleVariant": "stacked"})
    assert out["chartType"] == "bar-stack"
    assert out["styleVariant"] == "default"


def test_migrate_line_stacked_to_area_stack():
    out = migrate_chart_config({"chartType": "line", "styleVariant": "stacked"})
    assert out["chartType"] == "area-stack"
    assert out["styleVariant"] == "default"


def test_layout_shell_accepts_legacy_stacked_variants():
    cfg = ChartViewConfigLayout.model_validate(
        {"chartType": "line", "styleVariant": "stacked", "dimensions": [], "metrics": []},
    )
    assert cfg.chart_type == "area-stack"
    assert cfg.style_variant == "default"


def test_migrate_layout_widgets():
    layout = migrate_layout_chart_configs(
        {
            "version": 1,
            "widgets": [
                {
                    "id": "w1",
                    "type": "chart",
                    "chartConfig": {"chartType": "bar", "styleVariant": "stacked"},
                },
            ],
        },
    )
    cfg = layout["widgets"][0]["chartConfig"]
    assert cfg["chartType"] == "bar-stack"
