"""政企风格内置模板布局（10 套，绑定 gov_* 演示库视图）。"""

from __future__ import annotations

from typing import Any

from app.dashboard.templates.presets import (
    _border,
    _chart,
    _clock,
    _dash_style,
    _screen_style,
    _title_bar,
)

SQL_GOV_KPI = (
    "SELECT metric_name, AVG(value) AS avg_value\n"
    "FROM gov_service_metrics\n"
    "WHERE metric_code IN ('cases_handled', 'online_rate', 'response_time')\n"
    "  AND stat_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)\n"
    "GROUP BY metric_name"
)
SQL_GOV_DEPT_SAT = (
    "SELECT department, AVG(value) AS avg_score\n"
    "FROM gov_service_metrics\n"
    "WHERE metric_code = 'satisfaction'\n"
    "GROUP BY department\n"
    "ORDER BY avg_score DESC"
)
SQL_GOV_SAT_TREND = (
    "SELECT stat_date AS day, AVG(value) AS avg_score\n"
    "FROM gov_service_metrics\n"
    "WHERE metric_code = 'satisfaction'\n"
    "GROUP BY stat_date\n"
    "ORDER BY day"
)
SQL_GOV_BUDGET = (
    "SELECT category, spent_amount AS total\n"
    "FROM gov_budget_items\n"
    "WHERE fiscal_year = 2025\n"
    "ORDER BY total DESC"
)
SQL_GOV_BUDGET_COMPARE = (
    "SELECT category, budget_amount AS budget, spent_amount AS spent\n"
    "FROM gov_budget_items\n"
    "WHERE fiscal_year = 2025"
)
SQL_GOV_INCIDENT = (
    "SELECT incident_type, SUM(count) AS total\n"
    "FROM gov_incidents\n"
    "GROUP BY incident_type\n"
    "ORDER BY total DESC"
)
SQL_GOV_REGION = (
    "SELECT province, city, district, SUM(service_volume) AS total\n"
    "FROM v_gov_region_service\n"
    "GROUP BY province, city, district"
)
SQL_GOV_GRID = (
    "SELECT grid_name, event_count, resolved_count\n"
    "FROM gov_grid_stats\n"
    "ORDER BY event_count DESC\n"
    "LIMIT 10"
)
SQL_GOV_INVEST = (
    "SELECT industry, SUM(investment_amount) AS total\n"
    "FROM gov_investment\n"
    "GROUP BY industry\n"
    "ORDER BY total DESC"
)
SQL_GOV_ECO = (
    "SELECT monitor_point, AVG(index_value) AS avg_index\n"
    "FROM gov_eco_monitor\n"
    "WHERE monitor_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)\n"
    "GROUP BY monitor_point"
)


def _gov_screen(
    *,
    accent: str = "#6366f1",
    canvas: str = "#0f172a",
    bg: str = "/template-assets/backgrounds/screen-gov-indigo.svg",
    decor: str = "gradient-soft",
) -> dict[str, Any]:
    return _screen_style(accent=accent, canvas=canvas, decor=decor, bg_image=bg)


def _gov_dash(*, accent: str = "#4f46e5", scheme: str = "light") -> dict[str, Any]:
    canvas = "#f1f5f9" if scheme == "light" else "#0f172a"
    return _dash_style(scheme=scheme, accent=accent, decor="gradient-soft", canvas=canvas)


def build_gov_smart_city_screen() -> dict[str, Any]:
    """智慧城市运行监测：地图主视觉 + 两侧指标 + 底部趋势。"""
    return {
        "version": 2,
        "canvas": {"width": 1920, "height": 1080},
        "widgets": [
            _title_bar(x=460, y=32, width=1000, height=80, order=0),
            _clock(x=1680, y=40, width=200, height=56, order=1),
            _border("border-2", x=340, y=168, width=1240, height=680, order=5),
            _chart(
                chart_type="map",
                title="城市运行态势",
                sql=SQL_GOV_REGION,
                dimensions=[{"field": "province"}, {"field": "city"}, {"field": "district"}],
                metrics=[{"field": "total"}],
                x=360, y=188, width=1200, height=640, order=2,
            ),
            _chart(
                chart_type="bar",
                title="部门满意度",
                sql=SQL_GOV_DEPT_SAT,
                dimensions=[{"field": "department"}],
                metrics=[{"field": "avg_score"}],
                x=64, y=188, width=260, height=300, order=3,
            ),
            _chart(
                chart_type="line",
                title="满意度趋势",
                sql=SQL_GOV_SAT_TREND,
                dimensions=[{"field": "day"}],
                metrics=[{"field": "avg_score"}],
                x=1596, y=188, width=260, height=300, order=4,
            ),
            _chart(
                chart_type="kpi",
                title="政务核心 KPI",
                sql=SQL_GOV_KPI,
                dimensions=[{"field": "metric_name"}],
                metrics=[{"field": "avg_value"}],
                x=64, y=880, width=1792, height=120, order=6,
            ),
        ],
        "globalFilters": [],
        "styleConfig": _gov_screen(accent="#2563eb", bg="/template-assets/backgrounds/screen-cyber-blue.svg"),
    }


def build_gov_digital_cockpit_screen() -> dict[str, Any]:
    """数字政府 KPI 驾驶舱：全宽趋势 + 四象限指标。"""
    return {
        "version": 2,
        "canvas": {"width": 1920, "height": 1080},
        "widgets": [
            _title_bar(x=480, y=24, width=960, height=72, order=0),
            _clock(x=1680, y=32, width=200, height=56, order=1),
            _border("border-5", x=80, y=120, width=1760, height=760, order=5),
            _chart(
                chart_type="line",
                title="公共服务满意度走势",
                sql=SQL_GOV_SAT_TREND,
                dimensions=[{"field": "day"}],
                metrics=[{"field": "avg_score"}],
                x=120, y=160, width=1680, height=420, order=2,
            ),
            _chart(
                chart_type="bar",
                title="部门效能",
                sql=SQL_GOV_DEPT_SAT,
                dimensions=[{"field": "department"}],
                metrics=[{"field": "avg_score"}],
                x=120, y=620, width=520, height=240, order=3,
            ),
            _chart(
                chart_type="pie",
                title="事件类型",
                sql=SQL_GOV_INCIDENT,
                dimensions=[{"field": "incident_type"}],
                metrics=[{"field": "total"}],
                x=700, y=620, width=520, height=240, order=4,
            ),
            _chart(
                chart_type="kpi",
                title="办件 KPI",
                sql=SQL_GOV_KPI,
                dimensions=[{"field": "metric_name"}],
                metrics=[{"field": "avg_value"}],
                x=1280, y=620, width=520, height=240, order=6,
            ),
        ],
        "globalFilters": [],
        "styleConfig": _gov_screen(accent="#6366f1"),
    }


def build_gov_emergency_command_screen() -> dict[str, Any]:
    """应急指挥调度中心：三栏 + 地图。"""
    return {
        "version": 2,
        "canvas": {"width": 1920, "height": 1080},
        "widgets": [
            _title_bar(x=560, y=16, width=800, height=72, order=0),
            _clock(x=1680, y=24, width=200, height=56, order=1),
            _border("border-3", x=32, y=104, width=552, height=420, order=6),
            _border("border-3", x=584, y=104, width=752, height=560, order=7),
            _border("border-3", x=1336, y=104, width=552, height=420, order=8),
            _chart(
                chart_type="bar",
                title="事件分类",
                sql=SQL_GOV_INCIDENT,
                dimensions=[{"field": "incident_type"}],
                metrics=[{"field": "total"}],
                x=48, y=128, width=520, height=380, order=2,
            ),
            _chart(
                chart_type="map",
                title="区域态势",
                sql=SQL_GOV_REGION,
                dimensions=[{"field": "province"}, {"field": "city"}, {"field": "district"}],
                metrics=[{"field": "total"}],
                x=600, y=128, width=720, height=520, order=3,
            ),
            _chart(
                chart_type="line",
                title="满意度监测",
                sql=SQL_GOV_SAT_TREND,
                dimensions=[{"field": "day"}],
                metrics=[{"field": "avg_score"}],
                x=1352, y=128, width=520, height=380, order=4,
            ),
            _chart(
                chart_type="table-info",
                title="网格待办",
                sql=SQL_GOV_GRID,
                dimensions=[{"field": "grid_name"}],
                metrics=[{"field": "event_count"}, {"field": "resolved_count"}],
                x=600, y=680, width=720, height=320, order=5,
            ),
        ],
        "globalFilters": [],
        "styleConfig": _gov_screen(
            accent="#dc2626",
            canvas="#1c0a0a",
            bg="/template-assets/backgrounds/screen-dataease-aurora.svg",
            decor="gradient-radial",
        ),
    }


def build_gov_eco_monitor_screen() -> dict[str, Any]:
    """生态环境监测大屏。"""
    return {
        "version": 2,
        "canvas": {"width": 1920, "height": 1080},
        "widgets": [
            _title_bar(x=460, y=36, width=1000, height=80, order=0),
            _clock(x=1680, y=44, width=200, height=56, order=1),
            _border("border-2", x=80, y=140, width=1760, height=780, order=5),
            _chart(
                chart_type="map",
                title="区域生态指数",
                sql=SQL_GOV_REGION,
                dimensions=[{"field": "province"}, {"field": "city"}, {"field": "district"}],
                metrics=[{"field": "total"}],
                x=480, y=180, width=960, height=560, order=2,
            ),
            _chart(
                chart_type="bar",
                title="监测站点",
                sql=SQL_GOV_ECO,
                dimensions=[{"field": "monitor_point"}],
                metrics=[{"field": "avg_index"}],
                x=100, y=180, width=360, height=560, order=3,
            ),
            _chart(
                chart_type="line",
                title="满意度参考",
                sql=SQL_GOV_SAT_TREND,
                dimensions=[{"field": "day"}],
                metrics=[{"field": "avg_score"}],
                x=1460, y=180, width=360, height=560, order=4,
            ),
            _chart(
                chart_type="pie",
                title="支出结构",
                sql=SQL_GOV_BUDGET,
                dimensions=[{"field": "category"}],
                metrics=[{"field": "total"}],
                x=100, y=780, width=560, height=120, order=6,
            ),
        ],
        "globalFilters": [],
        "styleConfig": _gov_screen(
            accent="#059669",
            canvas="#041016",
            bg="/template-assets/backgrounds/screen-emerald-grid.svg",
            decor="gradient-radial",
        ),
    }


def build_gov_community_screen() -> dict[str, Any]:
    """社区治理一张图。"""
    return {
        "version": 2,
        "canvas": {"width": 1920, "height": 1080},
        "widgets": [
            _title_bar(x=500, y=28, width=920, height=76, order=0),
            _clock(x=1680, y=36, width=200, height=56, order=1),
            _chart(
                chart_type="table-info",
                title="网格事件明细",
                sql=SQL_GOV_GRID,
                dimensions=[{"field": "grid_name"}],
                metrics=[{"field": "event_count"}, {"field": "resolved_count"}],
                x=64, y=140, width=560, height=880, order=2,
            ),
            _chart(
                chart_type="map",
                title="社区分布",
                sql=SQL_GOV_REGION,
                dimensions=[{"field": "province"}, {"field": "city"}, {"field": "district"}],
                metrics=[{"field": "total"}],
                x=680, y=140, width=560, height=520, order=3,
            ),
            _chart(
                chart_type="bar",
                title="部门服务",
                sql=SQL_GOV_DEPT_SAT,
                dimensions=[{"field": "department"}],
                metrics=[{"field": "avg_score"}],
                x=1280, y=140, width=576, height=520, order=4,
            ),
            _chart(
                chart_type="line",
                title="满意度变化",
                sql=SQL_GOV_SAT_TREND,
                dimensions=[{"field": "day"}],
                metrics=[{"field": "avg_score"}],
                x=680, y=700, width=1176, height=320, order=5,
            ),
        ],
        "globalFilters": [],
        "styleConfig": _gov_screen(accent="#7c3aed", bg="/template-assets/backgrounds/screen-tech-grid.svg"),
    }


def build_gov_efficiency_dashboard() -> dict[str, Any]:
    """政务效能分析看板。"""
    return {
        "version": 1,
        "widgets": [
            _chart(
                chart_type="kpi",
                title="政务 KPI",
                sql=SQL_GOV_KPI,
                dimensions=[{"field": "metric_name"}],
                metrics=[{"field": "avg_value"}],
                colSpan=12, rowSpan=1, gridX=0, gridY=0, order=0,
            ),
            _chart(
                chart_type="bar",
                title="部门满意度",
                sql=SQL_GOV_DEPT_SAT,
                dimensions=[{"field": "department"}],
                metrics=[{"field": "avg_score"}],
                colSpan=7, rowSpan=5, gridX=0, gridY=1, order=1,
            ),
            _chart(
                chart_type="line",
                title="趋势",
                sql=SQL_GOV_SAT_TREND,
                dimensions=[{"field": "day"}],
                metrics=[{"field": "avg_score"}],
                colSpan=5, rowSpan=5, gridX=7, gridY=1, order=2,
            ),
        ],
        "globalFilters": [],
        "styleConfig": _gov_dash(accent="#4f46e5"),
    }


def build_gov_satisfaction_dashboard() -> dict[str, Any]:
    """公共服务满意度看板。"""
    return {
        "version": 1,
        "widgets": [
            _chart(
                chart_type="pie",
                title="事件占比",
                sql=SQL_GOV_INCIDENT,
                dimensions=[{"field": "incident_type"}],
                metrics=[{"field": "total"}],
                colSpan=4, rowSpan=6, gridX=0, gridY=0, order=0,
            ),
            _chart(
                chart_type="bar",
                title="部门满意度",
                sql=SQL_GOV_DEPT_SAT,
                dimensions=[{"field": "department"}],
                metrics=[{"field": "avg_score"}],
                colSpan=5, rowSpan=6, gridX=4, gridY=0, order=1,
            ),
            _chart(
                chart_type="table-info",
                title="网格服务",
                sql=SQL_GOV_GRID,
                dimensions=[{"field": "grid_name"}],
                metrics=[{"field": "event_count"}, {"field": "resolved_count"}],
                colSpan=3, rowSpan=6, gridX=9, gridY=0, order=2,
            ),
        ],
        "globalFilters": [],
        "styleConfig": _gov_dash(accent="#6366f1", scheme="light"),
    }


def build_gov_finance_dashboard() -> dict[str, Any]:
    """财政收支概览。"""
    return {
        "version": 1,
        "widgets": [
            _chart(
                chart_type="bar",
                title="支出执行",
                sql=SQL_GOV_BUDGET,
                dimensions=[{"field": "category"}],
                metrics=[{"field": "total"}],
                colSpan=7, rowSpan=4, gridX=0, gridY=0, order=0,
            ),
            _chart(
                chart_type="table-info",
                title="预算对比",
                sql=SQL_GOV_BUDGET_COMPARE,
                dimensions=[{"field": "category"}],
                metrics=[{"field": "budget"}, {"field": "spent"}],
                colSpan=5, rowSpan=4, gridX=7, gridY=0, order=1,
            ),
            _chart(
                chart_type="line",
                title="满意度参考",
                sql=SQL_GOV_SAT_TREND,
                dimensions=[{"field": "day"}],
                metrics=[{"field": "avg_score"}],
                colSpan=12, rowSpan=2, gridX=0, gridY=4, order=2,
            ),
        ],
        "globalFilters": [],
        "styleConfig": _gov_dash(accent="#0d9488"),
    }


def build_gov_investment_dashboard() -> dict[str, Any]:
    """招商引资分析。"""
    return {
        "version": 1,
        "widgets": [
            _chart(
                chart_type="map",
                title="区域分布",
                sql=SQL_GOV_REGION,
                dimensions=[{"field": "province"}, {"field": "city"}, {"field": "district"}],
                metrics=[{"field": "total"}],
                colSpan=7, rowSpan=5, gridX=0, gridY=0, order=0,
            ),
            _chart(
                chart_type="bar",
                title="产业投资",
                sql=SQL_GOV_INVEST,
                dimensions=[{"field": "industry"}],
                metrics=[{"field": "total"}],
                colSpan=5, rowSpan=5, gridX=7, gridY=0, order=1,
            ),
            _chart(
                chart_type="kpi",
                title="政务 KPI",
                sql=SQL_GOV_KPI,
                dimensions=[{"field": "metric_name"}],
                metrics=[{"field": "avg_value"}],
                colSpan=12, rowSpan=1, gridX=0, gridY=5, order=2,
            ),
        ],
        "globalFilters": [],
        "styleConfig": _gov_dash(accent="#2563eb", scheme="dark"),
    }


def build_gov_grid_dashboard() -> dict[str, Any]:
    """基层网格化管理。"""
    return {
        "version": 1,
        "widgets": [
            _chart(
                chart_type="table-info",
                title="网格事件",
                sql=SQL_GOV_GRID,
                dimensions=[{"field": "grid_name"}],
                metrics=[{"field": "event_count"}, {"field": "resolved_count"}],
                colSpan=5, rowSpan=6, gridX=0, gridY=0, order=0,
            ),
            _chart(
                chart_type="map",
                title="区域热力",
                sql=SQL_GOV_REGION,
                dimensions=[{"field": "province"}, {"field": "city"}, {"field": "district"}],
                metrics=[{"field": "total"}],
                colSpan=4, rowSpan=6, gridX=5, gridY=0, order=1,
            ),
            _chart(
                chart_type="bar",
                title="事件分类",
                sql=SQL_GOV_INCIDENT,
                dimensions=[{"field": "incident_type"}],
                metrics=[{"field": "total"}],
                colSpan=3, rowSpan=6, gridX=9, gridY=0, order=2,
            ),
        ],
        "globalFilters": [],
        "styleConfig": _gov_dash(accent="#475569"),
    }
