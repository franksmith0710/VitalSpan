"""政企风格内置模板：5 套数据大屏 + 5 套仪表板。"""

from __future__ import annotations

from typing import Any

from app.dashboard.templates import presets_gov_sql as sql
from app.dashboard.templates.presets_gov_assets import (
    COMMUNITY_BG,
    DIGITAL_COCKPIT_BG,
    ECO_MONITOR_BG,
    EFFICIENCY_BG,
    EMERGENCY_BG,
    FINANCE_BG,
    GRID_BG,
    INVESTMENT_BG,
    SATISFACTION_BG,
    SMART_CITY_BG,
)
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
                dimensions=[{"field": "指标"}], metrics=[{"field": "数值"}],
                colSpan=12, rowSpan=1, gridX=0, gridY=0, order=0,
            ),
            _gov_dash_chart(
                accent=accent, chart_type="bar", title="部门满意度",
                query=sql.SQL_GOV_DEPT_SAT,
                dimensions=[{"field": "部门"}], metrics=[{"field": "满意度"}],
                colSpan=7, rowSpan=5, gridX=0, gridY=1, order=1,
            ),
            _gov_dash_chart(
                accent=accent, chart_type="line", title="趋势",
                query=sql.SQL_GOV_SAT_TREND,
                dimensions=[{"field": "日期"}], metrics=[{"field": "满意度"}],
                colSpan=5, rowSpan=5, gridX=7, gridY=1, order=2,
            ),
        ],
        "globalFilters": [],
        "styleConfig": _materialize_dash_style(
            accent=accent,
            palette_colors=["#4f46e5", "#6366f1", "#818cf8", "#22d3ee", "#34d399"],
            bg_image=EFFICIENCY_BG,
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
                dimensions=[{"field": "事件类型"}], metrics=[{"field": "数量"}],
                colSpan=4, rowSpan=6, gridX=0, gridY=0, order=0,
            ),
            _gov_dash_chart(
                accent=accent, chart_type="bar", title="部门满意度",
                query=sql.SQL_GOV_DEPT_SAT,
                dimensions=[{"field": "部门"}], metrics=[{"field": "满意度"}],
                colSpan=5, rowSpan=6, gridX=4, gridY=0, order=1,
            ),
            _gov_dash_chart(
                accent=accent, chart_type="table-info", title="网格服务",
                query=sql.SQL_GOV_GRID,
                dimensions=[{"field": "网格"}],
                metrics=[{"field": "事件数"}, {"field": "已办结"}],
                colSpan=3, rowSpan=6, gridX=9, gridY=0, order=2,
            ),
        ],
        "globalFilters": [],
        "styleConfig": _materialize_dash_style(
            scheme="light", accent=accent,
            palette_colors=["#6366f1", "#818cf8", "#22d3ee", "#34d399"],
            bg_image=SATISFACTION_BG,
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
                dimensions=[{"field": "类别"}], metrics=[{"field": "支出金额"}],
                colSpan=7, rowSpan=4, gridX=0, gridY=0, order=0,
            ),
            _gov_dash_chart(
                accent=accent, chart_type="table-info", title="预算对比",
                query=sql.SQL_GOV_BUDGET_COMPARE,
                dimensions=[{"field": "类别"}],
                metrics=[{"field": "预算"}, {"field": "已支出"}],
                colSpan=5, rowSpan=4, gridX=7, gridY=0, order=1,
            ),
            _gov_dash_chart(
                accent=accent, chart_type="line", title="满意度参考",
                query=sql.SQL_GOV_SAT_TREND,
                dimensions=[{"field": "日期"}], metrics=[{"field": "满意度"}],
                colSpan=12, rowSpan=2, gridX=0, gridY=4, order=2,
            ),
        ],
        "globalFilters": [],
        "styleConfig": _materialize_dash_style(
            accent=accent,
            palette_colors=["#0d9488", "#14b8a6", "#2dd4bf", "#6366f1"],
            bg_image=FINANCE_BG,
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
                dimensions=[{"field": "省份"}, {"field": "城市"}, {"field": "区县"}],
                metrics=[{"field": "服务量"}],
                colSpan=7, rowSpan=5, gridX=0, gridY=0, order=0,
            ),
            _gov_dash_chart(
                accent=accent, chart_type="bar", title="产业投资",
                query=sql.SQL_GOV_INVEST,
                dimensions=[{"field": "产业"}], metrics=[{"field": "投资额"}],
                colSpan=5, rowSpan=5, gridX=7, gridY=0, order=1,
            ),
            _gov_dash_chart(
                accent=accent, chart_type="kpi", title="政务 KPI",
                query=sql.SQL_GOV_KPI,
                dimensions=[{"field": "指标"}], metrics=[{"field": "数值"}],
                colSpan=12, rowSpan=1, gridX=0, gridY=5, order=2,
            ),
        ],
        "globalFilters": [],
        "styleConfig": _materialize_dash_style(
            scheme="dark", accent=accent,
            palette_colors=["#2563eb", "#3b82f6", "#22d3ee", "#6366f1"],
            bg_image=INVESTMENT_BG,
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
                dimensions=[{"field": "网格"}],
                metrics=[{"field": "事件数"}, {"field": "已办结"}],
                colSpan=5, rowSpan=6, gridX=0, gridY=0, order=0,
            ),
            _gov_dash_chart(
                accent=accent, chart_type="map", title="区域热力",
                query=sql.SQL_GOV_REGION,
                dimensions=[{"field": "省份"}, {"field": "城市"}, {"field": "区县"}],
                metrics=[{"field": "服务量"}],
                colSpan=4, rowSpan=6, gridX=5, gridY=0, order=1,
            ),
            _gov_dash_chart(
                accent=accent, chart_type="bar", title="事件分类",
                query=sql.SQL_GOV_INCIDENT,
                dimensions=[{"field": "事件类型"}], metrics=[{"field": "数量"}],
                colSpan=3, rowSpan=6, gridX=9, gridY=0, order=2,
            ),
        ],
        "globalFilters": [],
        "styleConfig": _materialize_dash_style(
            accent=accent,
            palette_colors=["#475569", "#64748b", "#94a3b8", "#6366f1"],
            bg_image=GRID_BG,
        ),
    }
