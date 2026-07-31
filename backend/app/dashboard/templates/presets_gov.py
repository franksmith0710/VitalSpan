"""政企风格内置模板：5 套数据大屏 + 5 套仪表板。"""

from __future__ import annotations

from typing import Any

from app.dashboard.templates import presets_gov_sql as sql
from app.dashboard.templates.presets_gov_theme import (
    THEME_EFFICIENCY,
    THEME_FINANCE,
    THEME_GRID,
    THEME_INVESTMENT,
    THEME_SATISFACTION,
    GovDashTheme,
    build_gov_chart_de_style,
    build_gov_dash_style,
)
from app.dashboard.templates.presets import _chart
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
    theme: GovDashTheme,
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
        de_style=build_gov_chart_de_style(theme, chart_type),
        **geo,
    )


def _dash_layout(theme: GovDashTheme, widgets: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "version": 1,
        "widgets": widgets,
        "globalFilters": [],
        "styleConfig": build_gov_dash_style(theme),
    }


def build_gov_efficiency_dashboard() -> dict[str, Any]:
    theme = THEME_EFFICIENCY
    return _dash_layout(theme, [
        _gov_dash_chart(theme=theme, chart_type="kpi", title="政务 KPI",
            query=sql.SQL_GOV_KPI, dimensions=[{"field": "指标"}], metrics=[{"field": "数值"}],
            colSpan=12, rowSpan=1, gridX=0, gridY=0, order=0),
        _gov_dash_chart(theme=theme, chart_type="bar", title="部门满意度",
            query=sql.SQL_GOV_DEPT_SAT, dimensions=[{"field": "部门"}], metrics=[{"field": "满意度"}],
            colSpan=7, rowSpan=5, gridX=0, gridY=1, order=1),
        _gov_dash_chart(theme=theme, chart_type="line", title="满意度趋势",
            query=sql.SQL_GOV_SAT_TREND, dimensions=[{"field": "日期"}], metrics=[{"field": "满意度"}],
            colSpan=5, rowSpan=5, gridX=7, gridY=1, order=2),
    ])


def build_gov_satisfaction_dashboard() -> dict[str, Any]:
    theme = THEME_SATISFACTION
    return _dash_layout(theme, [
        _gov_dash_chart(theme=theme, chart_type="pie", title="事件占比",
            query=sql.SQL_GOV_INCIDENT, dimensions=[{"field": "事件类型"}], metrics=[{"field": "数量"}],
            colSpan=4, rowSpan=6, gridX=0, gridY=0, order=0),
        _gov_dash_chart(theme=theme, chart_type="bar", title="部门满意度",
            query=sql.SQL_GOV_DEPT_SAT, dimensions=[{"field": "部门"}], metrics=[{"field": "满意度"}],
            colSpan=5, rowSpan=6, gridX=4, gridY=0, order=1),
        _gov_dash_chart(theme=theme, chart_type="table-info", title="网格服务",
            query=sql.SQL_GOV_GRID, dimensions=[{"field": "网格"}],
            metrics=[{"field": "事件数"}, {"field": "已办结"}],
            colSpan=3, rowSpan=6, gridX=9, gridY=0, order=2),
    ])


def build_gov_finance_dashboard() -> dict[str, Any]:
    theme = THEME_FINANCE
    return _dash_layout(theme, [
        _gov_dash_chart(theme=theme, chart_type="bar", title="支出执行",
            query=sql.SQL_GOV_BUDGET, dimensions=[{"field": "类别"}], metrics=[{"field": "支出金额"}],
            colSpan=7, rowSpan=4, gridX=0, gridY=0, order=0),
        _gov_dash_chart(theme=theme, chart_type="table-info", title="预算对比",
            query=sql.SQL_GOV_BUDGET_COMPARE, dimensions=[{"field": "类别"}],
            metrics=[{"field": "预算"}, {"field": "已支出"}],
            colSpan=5, rowSpan=4, gridX=7, gridY=0, order=1),
        _gov_dash_chart(theme=theme, chart_type="line", title="满意度参考",
            query=sql.SQL_GOV_SAT_TREND, dimensions=[{"field": "日期"}], metrics=[{"field": "满意度"}],
            colSpan=12, rowSpan=2, gridX=0, gridY=4, order=2),
    ])


def build_gov_investment_dashboard() -> dict[str, Any]:
    theme = THEME_INVESTMENT
    return _dash_layout(theme, [
        _gov_dash_chart(theme=theme, chart_type="map", title="区域分布",
            query=sql.SQL_GOV_REGION,
            dimensions=[{"field": "省份"}, {"field": "城市"}, {"field": "区县"}], metrics=[{"field": "服务量"}],
            colSpan=7, rowSpan=5, gridX=0, gridY=0, order=0),
        _gov_dash_chart(theme=theme, chart_type="bar", title="产业投资",
            query=sql.SQL_GOV_INVEST, dimensions=[{"field": "产业"}], metrics=[{"field": "投资额"}],
            colSpan=5, rowSpan=5, gridX=7, gridY=0, order=1),
        _gov_dash_chart(theme=theme, chart_type="kpi", title="政务 KPI",
            query=sql.SQL_GOV_KPI, dimensions=[{"field": "指标"}], metrics=[{"field": "数值"}],
            colSpan=12, rowSpan=1, gridX=0, gridY=5, order=2),
    ])


def build_gov_grid_dashboard() -> dict[str, Any]:
    theme = THEME_GRID
    return _dash_layout(theme, [
        _gov_dash_chart(theme=theme, chart_type="table-info", title="网格事件",
            query=sql.SQL_GOV_GRID, dimensions=[{"field": "网格"}],
            metrics=[{"field": "事件数"}, {"field": "已办结"}],
            colSpan=5, rowSpan=6, gridX=0, gridY=0, order=0),
        _gov_dash_chart(theme=theme, chart_type="map", title="区域热力",
            query=sql.SQL_GOV_REGION,
            dimensions=[{"field": "省份"}, {"field": "城市"}, {"field": "区县"}], metrics=[{"field": "服务量"}],
            colSpan=4, rowSpan=6, gridX=5, gridY=0, order=1),
        _gov_dash_chart(theme=theme, chart_type="bar", title="事件分类",
            query=sql.SQL_GOV_INCIDENT, dimensions=[{"field": "事件类型"}], metrics=[{"field": "数量"}],
            colSpan=3, rowSpan=6, gridX=9, gridY=0, order=2),
    ])
