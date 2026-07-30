"""政企风格内置模板：5 套数据大屏 + 5 套仪表板。"""

from __future__ import annotations

from typing import Any

from app.dashboard.templates import presets_gov_sql as sql
from app.dashboard.templates.presets import (
    _chart,
    _chart_de_style_for_accent,
    _materialize_dash_style,
)
from app.dashboard.templates.presets_gov_screens import (
    build_gov_community_screen,
    build_gov_digital_cockpit_screen,
    build_gov_eco_monitor_screen,
    build_gov_emergency_command_screen,
    build_gov_smart_city_screen,
)

__all__ = [
    "build_gov_smart_city_screen",
    "build_gov_digital_cockpit_screen",
    "build_gov_emergency_command_screen",
    "build_gov_eco_monitor_screen",
    "build_gov_community_screen",
    "build_gov_efficiency_dashboard",
    "build_gov_satisfaction_dashboard",
    "build_gov_finance_dashboard",
    "build_gov_investment_dashboard",
    "build_gov_grid_dashboard",
]


def _gov_dash_chart(
    accent: str,
    chart_type: str,
    title: str,
    query: str,
    dimensions: list[dict[str, str]] | None = None,
    metrics: list[dict[str, str]] | None = None,
    **geo: Any,
) -> dict[str, Any]:
    return _chart(
        chart_type=chart_type,
        title=title,
        sql=query,
        dimensions=dimensions,
        metrics=metrics,
        de_style=_chart_de_style_for_accent(accent, chart_type=chart_type),
        **geo,
    )


def build_gov_efficiency_dashboard() -> dict[str, Any]:
    accent = "#4f46e5"
    return {
        "version": 1,
        "widgets": [
            _gov_dash_chart(
                accent=accent, chart_type="kpi", title="政务 KPI",
                query=sql.SQL_GOV_KPI,
                dimensions=[{"field": "metric_name"}], metrics=[{"field": "avg_value"}],
                colSpan=12, rowSpan=1, gridX=0, gridY=0, order=0,
            ),
            _gov_dash_chart(
                accent=accent, chart_type="bar", title="部门满意度",
                query=sql.SQL_GOV_DEPT_SAT,
                dimensions=[{"field": "department"}], metrics=[{"field": "avg_score"}],
                colSpan=7, rowSpan=5, gridX=0, gridY=1, order=1,
            ),
            _gov_dash_chart(
                accent=accent, chart_type="line", title="趋势",
                query=sql.SQL_GOV_SAT_TREND,
                dimensions=[{"field": "day"}], metrics=[{"field": "avg_score"}],
                colSpan=5, rowSpan=5, gridX=7, gridY=1, order=2,
            ),
        ],
        "globalFilters": [],
        "styleConfig": _materialize_dash_style(
            accent=accent,
            palette_colors=["#4f46e5", "#6366f1", "#818cf8", "#22d3ee", "#34d399"],
        ),
    }


def build_gov_satisfaction_dashboard() -> dict[str, Any]:
    accent = "#6366f1"
    return {
        "version": 1,
        "widgets": [
            _gov_dash_chart(
                accent=accent, chart_type="pie", title="事件占比",
                query=sql.SQL_GOV_INCIDENT,
                dimensions=[{"field": "incident_type"}], metrics=[{"field": "total"}],
                colSpan=4, rowSpan=6, gridX=0, gridY=0, order=0,
            ),
            _gov_dash_chart(
                accent=accent, chart_type="bar", title="部门满意度",
                query=sql.SQL_GOV_DEPT_SAT,
                dimensions=[{"field": "department"}], metrics=[{"field": "avg_score"}],
                colSpan=5, rowSpan=6, gridX=4, gridY=0, order=1,
            ),
            _gov_dash_chart(
                accent=accent, chart_type="table-info", title="网格服务",
                query=sql.SQL_GOV_GRID,
                dimensions=[{"field": "grid_name"}],
                metrics=[{"field": "event_count"}, {"field": "resolved_count"}],
                colSpan=3, rowSpan=6, gridX=9, gridY=0, order=2,
            ),
        ],
        "globalFilters": [],
        "styleConfig": _materialize_dash_style(
            scheme="light", accent=accent,
            palette_colors=["#6366f1", "#818cf8", "#22d3ee", "#34d399"],
        ),
    }


def build_gov_finance_dashboard() -> dict[str, Any]:
    accent = "#0d9488"
    return {
        "version": 1,
        "widgets": [
            _gov_dash_chart(
                accent=accent, chart_type="bar", title="支出执行",
                query=sql.SQL_GOV_BUDGET,
                dimensions=[{"field": "category"}], metrics=[{"field": "total"}],
                colSpan=7, rowSpan=4, gridX=0, gridY=0, order=0,
            ),
            _gov_dash_chart(
                accent=accent, chart_type="table-info", title="预算对比",
                query=sql.SQL_GOV_BUDGET_COMPARE,
                dimensions=[{"field": "category"}],
                metrics=[{"field": "budget"}, {"field": "spent"}],
                colSpan=5, rowSpan=4, gridX=7, gridY=0, order=1,
            ),
            _gov_dash_chart(
                accent=accent, chart_type="line", title="满意度参考",
                query=sql.SQL_GOV_SAT_TREND,
                dimensions=[{"field": "day"}], metrics=[{"field": "avg_score"}],
                colSpan=12, rowSpan=2, gridX=0, gridY=4, order=2,
            ),
        ],
        "globalFilters": [],
        "styleConfig": _materialize_dash_style(
            accent=accent,
            palette_colors=["#0d9488", "#14b8a6", "#2dd4bf", "#6366f1"],
        ),
    }


def build_gov_investment_dashboard() -> dict[str, Any]:
    accent = "#2563eb"
    return {
        "version": 1,
        "widgets": [
            _gov_dash_chart(
                accent=accent, chart_type="map", title="区域分布",
                query=sql.SQL_GOV_REGION,
                dimensions=[{"field": "province"}, {"field": "city"}, {"field": "district"}],
                metrics=[{"field": "total"}],
                colSpan=7, rowSpan=5, gridX=0, gridY=0, order=0,
            ),
            _gov_dash_chart(
                accent=accent, chart_type="bar", title="产业投资",
                query=sql.SQL_GOV_INVEST,
                dimensions=[{"field": "industry"}], metrics=[{"field": "total"}],
                colSpan=5, rowSpan=5, gridX=7, gridY=0, order=1,
            ),
            _gov_dash_chart(
                accent=accent, chart_type="kpi", title="政务 KPI",
                query=sql.SQL_GOV_KPI,
                dimensions=[{"field": "metric_name"}], metrics=[{"field": "avg_value"}],
                colSpan=12, rowSpan=1, gridX=0, gridY=5, order=2,
            ),
        ],
        "globalFilters": [],
        "styleConfig": _materialize_dash_style(
            scheme="dark", accent=accent,
            palette_colors=["#2563eb", "#3b82f6", "#22d3ee", "#6366f1"],
        ),
    }


def build_gov_grid_dashboard() -> dict[str, Any]:
    accent = "#475569"
    return {
        "version": 1,
        "widgets": [
            _gov_dash_chart(
                accent=accent, chart_type="table-info", title="网格事件",
                query=sql.SQL_GOV_GRID,
                dimensions=[{"field": "grid_name"}],
                metrics=[{"field": "event_count"}, {"field": "resolved_count"}],
                colSpan=5, rowSpan=6, gridX=0, gridY=0, order=0,
            ),
            _gov_dash_chart(
                accent=accent, chart_type="map", title="区域热力",
                query=sql.SQL_GOV_REGION,
                dimensions=[{"field": "province"}, {"field": "city"}, {"field": "district"}],
                metrics=[{"field": "total"}],
                colSpan=4, rowSpan=6, gridX=5, gridY=0, order=1,
            ),
            _gov_dash_chart(
                accent=accent, chart_type="bar", title="事件分类",
                query=sql.SQL_GOV_INCIDENT,
                dimensions=[{"field": "incident_type"}], metrics=[{"field": "total"}],
                colSpan=3, rowSpan=6, gridX=9, gridY=0, order=2,
            ),
        ],
        "globalFilters": [],
        "styleConfig": _materialize_dash_style(
            accent=accent,
            palette_colors=["#475569", "#64748b", "#94a3b8", "#6366f1"],
        ),
    }
