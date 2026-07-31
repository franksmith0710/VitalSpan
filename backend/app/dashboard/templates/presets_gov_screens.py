"""政企数据大屏 L3 布局（对标 ds-03/04/05 DataEase 密度）。"""

from __future__ import annotations

from typing import Any

from app.dashboard.templates import presets_gov_sql as sql
from app.dashboard.templates.presets_gov_assets import (
    COMMUNITY_BG,
    DIGITAL_COCKPIT_BG,
    ECO_MONITOR_BG,
    EMERGENCY_BG,
    SMART_CITY_BG,
)
from app.dashboard.templates.presets import (
    _border,
    _chart,
    _chart_de_style_for_accent,
    _clock,
    _materialize_screen_style,
    _title_bar,
)

# L3 1920×1080 坐标（标题 88 + 主区 660 + 底表 240）
_L3 = {
    "left_x": 40,
    "left_w": 420,
    "center_x": 480,
    "center_w": 960,
    "right_x": 1460,
    "right_w": 420,
    "row1_y": 100,
    "row1_h": 320,
    "row2_y": 440,
    "row2_h": 320,
    "map_y": 100,
    "map_h": 660,
    "bottom_y": 780,
    "bottom_h": 260,
    "bottom_x": 40,
    "bottom_w": 1840,
}


def _panel_border(
    variant: str,
    accent: str,
    x: int,
    y: int,
    w: int,
    h: int,
    order: int,
) -> dict[str, Any]:
    return _border(variant, accent=accent, x=x, y=y, width=w, height=h, order=order)


def _gov_chart(
    *,
    accent: str,
    palette: list[str],
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
        de_style=_chart_de_style_for_accent(accent, chart_type=chart_type, palette=palette),
        **geo,
    )


def _l3_chrome(accent: str) -> list[dict[str, Any]]:
    return [
        _title_bar(accent=accent, x=460, y=24, width=1000, height=72, order=0),
        _clock(x=1680, y=32, width=200, height=56, order=1),
        _panel_border("border-5", accent, 24, 12, 1872, 88, order=90),
    ]


def _l3_screen_style(
    *,
    accent: str,
    canvas: str = "#0f172a",
    bg: str,
    decor: str = "gradient-radial",
    palette: list[str],
) -> dict[str, Any]:
    style = _materialize_screen_style(
        accent=accent,
        canvas=canvas,
        decor=decor,
        bg_image=bg,
        palette_colors=palette,
    )
    widget = style.get("widgetStyle")
    if isinstance(widget, dict) and bg:
        widget["background"] = "rgba(15, 23, 42, 0.58)"
    return style


def build_gov_smart_city_screen() -> dict[str, Any]:
    """智慧城市运行监测 — ds-03 L3：gauge/柱 + 地图 + 词云/饼 + 整改底表。"""
    accent = "#22d3ee"
    p = _L3
    palette = ["#22d3ee", "#38bdf8", "#0ea5e9", "#6366f1", "#34d399", "#fbbf24"]
    widgets = [
        *_l3_chrome(accent),
        _panel_border("border-2", accent, p["left_x"], p["row1_y"], p["left_w"], p["row1_h"], 10),
        _panel_border("border-2", accent, p["left_x"], p["row2_y"], p["left_w"], p["row2_h"], 11),
        _panel_border("border-3", accent, p["center_x"], p["map_y"], p["center_w"], p["map_h"], 12),
        _panel_border("border-2", accent, p["right_x"], p["row1_y"], p["right_w"], p["row1_h"], 13),
        _panel_border("border-2", accent, p["right_x"], p["row2_y"], p["right_w"], p["row2_h"], 14),
        _panel_border("border-2", accent, p["bottom_x"], p["bottom_y"], p["bottom_w"], p["bottom_h"], 15),
        _gov_chart(
            accent=accent, palette=palette, chart_type="gauge", title="城市安全指数",
            query=sql.SQL_GOV_GAUGE_SAT, metrics=[{"field": "指数"}],
            x=p["left_x"] + 12, y=p["row1_y"] + 12, width=p["left_w"] - 24, height=p["row1_h"] - 24, order=2,
        ),
        _gov_chart(
            accent=accent, palette=palette, chart_type="bar", title="产业结构占比",
            query=sql.SQL_GOV_INVEST,
            dimensions=[{"field": "产业"}], metrics=[{"field": "投资额"}],
            x=p["left_x"] + 12, y=p["row2_y"] + 12, width=p["left_w"] - 24, height=p["row2_h"] - 24, order=3,
        ),
        _gov_chart(
            accent=accent, palette=palette, chart_type="map", title="全国城市运行态势",
            query=sql.SQL_GOV_REGION,
            dimensions=[{"field": "省份"}, {"field": "城市"}, {"field": "区县"}],
            metrics=[{"field": "服务量"}],
            x=p["center_x"] + 12, y=p["map_y"] + 12, width=p["center_w"] - 24, height=p["map_h"] - 24, order=4,
        ),
        _gov_chart(
            accent=accent, palette=palette, chart_type="word-cloud", title="部门热词",
            query=sql.SQL_GOV_HOTWORDS,
            dimensions=[{"field": "热词"}], metrics=[{"field": "权重"}],
            x=p["right_x"] + 12, y=p["row1_y"] + 12, width=p["right_w"] - 24, height=p["row1_h"] - 24, order=5,
        ),
        _gov_chart(
            accent=accent, palette=palette, chart_type="pie", title="事件类型",
            query=sql.SQL_GOV_INCIDENT,
            dimensions=[{"field": "事件类型"}], metrics=[{"field": "数量"}],
            x=p["right_x"] + 12, y=p["row2_y"] + 12, width=p["right_w"] - 24, height=p["row2_h"] - 24, order=6,
        ),
        _gov_chart(
            accent=accent, palette=palette, chart_type="table-info", title="发现问题及整改数据",
            query=sql.SQL_GOV_ISSUES,
            dimensions=[{"field": "问题类型"}, {"field": "地点"}],
            metrics=[{"field": "状态"}, {"field": "进度"}],
            x=p["bottom_x"] + 12, y=p["bottom_y"] + 12, width=p["bottom_w"] - 24, height=p["bottom_h"] - 24, order=7,
        ),
    ]
    return {
        "version": 2,
        "canvas": {"width": 1920, "height": 1080},
        "widgets": widgets,
        "globalFilters": [],
        "styleConfig": _l3_screen_style(
            accent=accent,
            canvas="#061018",
            bg=SMART_CITY_BG,
            palette=palette,
        ),
    }


def build_gov_digital_cockpit_screen() -> dict[str, Any]:
    """数字政府 KPI 驾驶舱 — 顶 KPI + 全宽趋势 + 三栏（无地图）。"""
    accent = "#6366f1"
    palette = ["#6366f1", "#818cf8", "#a5b4fc", "#22d3ee", "#34d399", "#fbbf24"]
    widgets = [
        *_l3_chrome(accent),
        _panel_border("border-5", accent, 40, 100, 1840, 120, 10),
        _panel_border("border-3", accent, 40, 240, 1840, 400, 11),
        _panel_border("border-2", accent, 40, 660, 580, 380, 12),
        _panel_border("border-2", accent, 660, 660, 580, 380, 13),
        _panel_border("border-2", accent, 1280, 660, 600, 380, 14),
        _gov_chart(
            accent=accent, palette=palette, chart_type="kpi", title="政务核心 KPI",
            query=sql.SQL_GOV_KPI,
            dimensions=[{"field": "指标"}], metrics=[{"field": "数值"}],
            x=56, y=116, width=1808, height=88, order=2,
        ),
        _gov_chart(
            accent=accent, palette=palette, chart_type="line", title="公共服务满意度走势",
            query=sql.SQL_GOV_SAT_TREND,
            dimensions=[{"field": "日期"}], metrics=[{"field": "满意度"}],
            x=56, y=256, width=1808, height=368, order=3,
        ),
        _gov_chart(
            accent=accent, palette=palette, chart_type="bar", title="部门效能",
            query=sql.SQL_GOV_DEPT_SAT,
            dimensions=[{"field": "部门"}], metrics=[{"field": "满意度"}],
            x=56, y=676, width=548, height=348, order=4,
        ),
        _gov_chart(
            accent=accent, palette=palette, chart_type="pie", title="事件类型",
            query=sql.SQL_GOV_INCIDENT,
            dimensions=[{"field": "事件类型"}], metrics=[{"field": "数量"}],
            x=676, y=676, width=548, height=348, order=5,
        ),
        _gov_chart(
            accent=accent, palette=palette, chart_type="gauge", title="综合满意度",
            query=sql.SQL_GOV_GAUGE_SAT, metrics=[{"field": "指数"}],
            x=1296, y=676, width=568, height=348, order=6,
        ),
    ]
    return {
        "version": 2,
        "canvas": {"width": 1920, "height": 1080},
        "widgets": widgets,
        "globalFilters": [],
        "styleConfig": _l3_screen_style(
            accent=accent,
            canvas="#0c0a1e",
            bg=DIGITAL_COCKPIT_BG,
            palette=palette,
        ),
    }


def build_gov_emergency_command_screen() -> dict[str, Any]:
    """应急指挥调度中心 — 顶告警带 + 三栏态势 + 底网格待办。"""
    accent = "#f87171"
    p = _L3
    palette = ["#f87171", "#fb923c", "#fbbf24", "#ef4444", "#fca5a5", "#fdba74"]
    alert_y, alert_h = 100, 150
    main_y, main_h = 270, 490
    widgets = [
        *_l3_chrome(accent),
        _panel_border("border-5", accent, p["bottom_x"], alert_y, p["bottom_w"], alert_h, 10),
        _panel_border("border-2", accent, p["left_x"], main_y, p["left_w"], main_h, 11),
        _panel_border("border-3", accent, p["center_x"], main_y, p["center_w"], main_h, 12),
        _panel_border("border-2", accent, p["right_x"], main_y, p["right_w"], main_h, 13),
        _panel_border("border-2", accent, p["bottom_x"], p["bottom_y"], p["bottom_w"], p["bottom_h"], 14),
        _gov_chart(
            accent=accent, palette=palette, chart_type="table-info", title="实时告警滚动",
            query=sql.SQL_GOV_ALERTS,
            dimensions=[{"field": "地点"}], metrics=[{"field": "内容"}, {"field": "状态"}],
            x=p["bottom_x"] + 12, y=alert_y + 12, width=p["bottom_w"] - 24, height=alert_h - 24, order=2,
        ),
        _gov_chart(
            accent=accent, palette=palette, chart_type="bar", title="事件分类",
            query=sql.SQL_GOV_INCIDENT,
            dimensions=[{"field": "事件类型"}], metrics=[{"field": "数量"}],
            x=p["left_x"] + 12, y=main_y + 12, width=p["left_w"] - 24, height=main_h - 24, order=3,
        ),
        _gov_chart(
            accent=accent, palette=palette, chart_type="map", title="区域态势",
            query=sql.SQL_GOV_REGION,
            dimensions=[{"field": "省份"}, {"field": "城市"}, {"field": "区县"}],
            metrics=[{"field": "服务量"}],
            x=p["center_x"] + 12, y=main_y + 12, width=p["center_w"] - 24, height=main_h - 24, order=4,
        ),
        _gov_chart(
            accent=accent, palette=palette, chart_type="line", title="满意度监测",
            query=sql.SQL_GOV_SAT_TREND,
            dimensions=[{"field": "日期"}], metrics=[{"field": "满意度"}],
            x=p["right_x"] + 12, y=main_y + 12, width=p["right_w"] - 24, height=240, order=5,
        ),
        _gov_chart(
            accent=accent, palette=palette, chart_type="pie", title="支出结构",
            query=sql.SQL_GOV_BUDGET,
            dimensions=[{"field": "类别"}], metrics=[{"field": "支出金额"}],
            x=p["right_x"] + 12, y=main_y + 264, width=p["right_w"] - 24, height=main_h - 276, order=6,
        ),
        _gov_chart(
            accent=accent, palette=palette, chart_type="table-info", title="网格待办",
            query=sql.SQL_GOV_GRID,
            dimensions=[{"field": "网格"}],
            metrics=[{"field": "事件数"}, {"field": "已办结"}],
            x=p["bottom_x"] + 12, y=p["bottom_y"] + 12, width=p["bottom_w"] - 24, height=p["bottom_h"] - 24, order=7,
        ),
    ]
    return {
        "version": 2,
        "canvas": {"width": 1920, "height": 1080},
        "widgets": widgets,
        "globalFilters": [],
        "styleConfig": _l3_screen_style(
            accent=accent,
            canvas="#1c0a0a",
            bg=EMERGENCY_BG,
            decor="gradient-radial",
            palette=palette,
        ),
    }


def build_gov_eco_monitor_screen() -> dict[str, Any]:
    """生态环境监测大屏 — 趋势主视觉 + 侧栏指标（弱化地图）。"""
    accent = "#34d399"
    p = _L3
    palette = ["#34d399", "#6ee7b7", "#10b981", "#059669", "#22d3ee", "#a7f3d0"]
    widgets = [
        *_l3_chrome(accent),
        _panel_border("border-2", accent, p["left_x"], p["row1_y"], p["left_w"], p["row1_h"], 10),
        _panel_border("border-2", accent, p["left_x"], p["row2_y"], p["left_w"], p["row2_h"], 11),
        _panel_border("border-3", accent, p["center_x"], p["map_y"], p["center_w"], p["map_h"], 12),
        _panel_border("border-2", accent, p["right_x"], p["row1_y"], p["right_w"], p["row1_h"], 13),
        _panel_border("border-2", accent, p["right_x"], p["row2_y"], p["right_w"], p["row2_h"], 14),
        _panel_border("border-2", accent, p["bottom_x"], p["bottom_y"], p["bottom_w"], p["bottom_h"], 15),
        _gov_chart(
            accent=accent, palette=palette, chart_type="gauge", title="水质达标率",
            query=sql.SQL_GOV_GAUGE_WATER, metrics=[{"field": "指数"}],
            x=p["left_x"] + 12, y=p["row1_y"] + 12, width=p["left_w"] - 24, height=p["row1_h"] - 24, order=2,
        ),
        _gov_chart(
            accent=accent, palette=palette, chart_type="bar", title="监测站点",
            query=sql.SQL_GOV_ECO,
            dimensions=[{"field": "监测点"}], metrics=[{"field": "指数"}],
            x=p["left_x"] + 12, y=p["row2_y"] + 12, width=p["left_w"] - 24, height=p["row2_h"] - 24, order=3,
        ),
        _gov_chart(
            accent=accent, palette=palette, chart_type="line", title="AQI 趋势（主视觉）",
            query=sql.SQL_GOV_ECO_TREND,
            dimensions=[{"field": "日期"}], metrics=[{"field": "指数"}],
            x=p["center_x"] + 12, y=p["map_y"] + 12, width=p["center_w"] - 24, height=p["map_h"] - 24, order=4,
        ),
        _gov_chart(
            accent=accent, palette=palette, chart_type="map", title="区域生态指数",
            query=sql.SQL_GOV_REGION,
            dimensions=[{"field": "省份"}, {"field": "城市"}, {"field": "区县"}],
            metrics=[{"field": "服务量"}],
            x=p["right_x"] + 12, y=p["row1_y"] + 12, width=p["right_w"] - 24, height=p["row1_h"] - 24, order=5,
        ),
        _gov_chart(
            accent=accent, palette=palette, chart_type="pie", title="支出结构",
            query=sql.SQL_GOV_BUDGET,
            dimensions=[{"field": "类别"}], metrics=[{"field": "支出金额"}],
            x=p["right_x"] + 12, y=p["row2_y"] + 12, width=p["right_w"] - 24, height=p["row2_h"] - 24, order=6,
        ),
        _gov_chart(
            accent=accent, palette=palette, chart_type="table-info", title="生态问题清单",
            query=sql.SQL_GOV_ISSUES,
            dimensions=[{"field": "问题类型"}, {"field": "地点"}],
            metrics=[{"field": "状态"}, {"field": "进度"}],
            x=p["bottom_x"] + 12, y=p["bottom_y"] + 12, width=p["bottom_w"] - 24, height=p["bottom_h"] - 24, order=7,
        ),
    ]
    return {
        "version": 2,
        "canvas": {"width": 1920, "height": 1080},
        "widgets": widgets,
        "globalFilters": [],
        "styleConfig": _l3_screen_style(
            accent=accent,
            canvas="#041016",
            bg=ECO_MONITOR_BG,
            palette=palette,
        ),
    }


def build_gov_community_screen() -> dict[str, Any]:
    """社区治理一张图 — 左表主视觉 + 中词云/柱 + 右满意度 + 底趋势（无地图）。"""
    accent = "#a78bfa"
    p = _L3
    palette = ["#a78bfa", "#c4b5fd", "#8b5cf6", "#22d3ee", "#34d399", "#f472b6"]
    widgets = [
        *_l3_chrome(accent),
        _panel_border("border-2", accent, p["left_x"], p["map_y"], p["left_w"], p["map_h"], 10),
        _panel_border("border-3", accent, p["center_x"], p["map_y"], p["center_w"], p["map_h"], 11),
        _panel_border("border-2", accent, p["right_x"], p["map_y"], p["right_w"], p["map_h"], 12),
        _panel_border("border-2", accent, p["bottom_x"], p["bottom_y"], p["bottom_w"], p["bottom_h"], 13),
        _gov_chart(
            accent=accent, palette=palette, chart_type="table-info", title="网格事件明细",
            query=sql.SQL_GOV_GRID,
            dimensions=[{"field": "网格"}],
            metrics=[{"field": "事件数"}, {"field": "已办结"}],
            x=p["left_x"] + 12, y=p["map_y"] + 12, width=p["left_w"] - 24, height=p["map_h"] - 24, order=2,
        ),
        _gov_chart(
            accent=accent, palette=palette, chart_type="word-cloud", title="治理热词",
            query=sql.SQL_GOV_HOTWORDS,
            dimensions=[{"field": "热词"}], metrics=[{"field": "权重"}],
            x=p["center_x"] + 12, y=p["map_y"] + 12, width=p["center_w"] - 24, height=400, order=3,
        ),
        _gov_chart(
            accent=accent, palette=palette, chart_type="bar", title="部门服务满意度",
            query=sql.SQL_GOV_DEPT_SAT,
            dimensions=[{"field": "部门"}], metrics=[{"field": "满意度"}],
            x=p["center_x"] + 12, y=p["map_y"] + 424, width=p["center_w"] - 24, height=224, order=4,
        ),
        _gov_chart(
            accent=accent, palette=palette, chart_type="gauge", title="综合满意度",
            query=sql.SQL_GOV_GAUGE_SAT, metrics=[{"field": "指数"}],
            x=p["right_x"] + 12, y=p["map_y"] + 12, width=p["right_w"] - 24, height=400, order=5,
        ),
        _gov_chart(
            accent=accent, palette=palette, chart_type="pie", title="事件类型",
            query=sql.SQL_GOV_INCIDENT,
            dimensions=[{"field": "事件类型"}], metrics=[{"field": "数量"}],
            x=p["right_x"] + 12, y=p["map_y"] + 424, width=p["right_w"] - 24, height=224, order=6,
        ),
        _gov_chart(
            accent=accent, palette=palette, chart_type="line", title="满意度变化",
            query=sql.SQL_GOV_SAT_TREND,
            dimensions=[{"field": "日期"}], metrics=[{"field": "满意度"}],
            x=p["bottom_x"] + 12, y=p["bottom_y"] + 12, width=p["bottom_w"] - 24, height=p["bottom_h"] - 24, order=7,
        ),
    ]
    return {
        "version": 2,
        "canvas": {"width": 1920, "height": 1080},
        "widgets": widgets,
        "globalFilters": [],
        "styleConfig": _l3_screen_style(
            accent=accent,
            canvas="#120a1e",
            bg=COMMUNITY_BG,
            palette=palette,
        ),
    }
