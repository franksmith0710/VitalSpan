"""内置可视化模板布局预设（对标 DataEase 模板市场视觉密度）。

内置模板 chart 的 SQL 须来自 ``official_demo_sql``，数据源占位 ``__demo:sample_db__``。
"""

from __future__ import annotations

import uuid
from typing import Any

from app.dashboard.templates.demo_datasource import TEMPLATE_DEMO_DATASOURCE_REF
from app.dashboard.templates.official_demo_sql import (
    SQL_DAILY_KPI,
    SQL_SALES_BY_CHANNEL,
    SQL_SALES_BY_PROVINCE,
    SQL_SALES_GEO_DRILL,
    SQL_SALES_TREND,
    SQL_TOP_CITIES,
)

SCREEN_BORDER_MARKER = "__vs_screen_border__"
SCREEN_CLOCK_MARKER = "__vs_screen_clock__"
SCREEN_TITLE_BAR_MARKER = "__vs_screen_title_bar__"

DECOR_GRADIENT_DARK: dict[str, str] = {
    "gradient-soft": "linear-gradient(160deg, #0f172a 0%, #1e293b 48%, #172554 100%)",
    "gradient-brand": "linear-gradient(135deg, #0f172a 0%, #1e1b4b 55%, #0f172a 100%)",
    "gradient-radial": (
        "radial-gradient(ellipse 90% 70% at 50% -10%, #312e81 0%, #0f172a 55%, #020617 100%)"
    ),
}

DECOR_GRADIENT_LIGHT: dict[str, str] = {
    "gradient-soft": "linear-gradient(160deg, #eff6ff 0%, #f8fafc 45%, #fef3c7 100%)",
    "gradient-brand": "linear-gradient(135deg, #eef2ff 0%, #f8fafc 52%, #ffffff 100%)",
    "gradient-radial": (
        "radial-gradient(ellipse 90% 70% at 50% -10%, #e0e7ff 0%, #f8fafc 50%, #ffffff 100%)"
    ),
}


def _wid() -> str:
    return str(uuid.uuid4())


def _chart(
    *,
    chart_type: str,
    title: str,
    sql: str,
    dimensions: list[dict[str, str]] | None = None,
    metrics: list[dict[str, str]] | None = None,
    de_style: dict[str, Any] | None = None,
    data_source_ref: str | None = TEMPLATE_DEMO_DATASOURCE_REF,
    **geo: Any,
) -> dict[str, Any]:
    wid = _wid()
    cfg: dict[str, Any] = {
        "chartType": chart_type,
        "mode": "sql",
        "chartId": wid,
        "sql": sql,
    }
    if dimensions:
        cfg["dimensions"] = dimensions
    if metrics:
        cfg["metrics"] = metrics
    if data_source_ref:
        cfg["dataSourceId"] = data_source_ref
    if de_style:
        cfg["nativeBody"] = {"deStyle": de_style}
    return {
        "id": wid,
        "type": "chart",
        "title": title,
        "chartConfig": cfg,
        **geo,
    }


def _border(variant: str, accent: str | None = None, **geo: Any) -> dict[str, Any]:
    wid = _wid()
    border_style: dict[str, Any] = {"variant": variant}
    if accent:
        border_style["accentColor"] = accent
    return {
        "id": wid,
        "type": "text",
        "title": "边框装饰",
        "textConfig": {
            "content": SCREEN_BORDER_MARKER,
            "variant": "plain",
            "screenStyle": {"border": border_style},
        },
        **geo,
    }


def _clock(**geo: Any) -> dict[str, Any]:
    wid = _wid()
    return {
        "id": wid,
        "type": "text",
        "title": "时钟",
        "textConfig": {"content": SCREEN_CLOCK_MARKER, "variant": "plain"},
        **geo,
    }


def _title_bar(accent: str | None = None, **geo: Any) -> dict[str, Any]:
    wid = _wid()
    text_config: dict[str, Any] = {
        "content": SCREEN_TITLE_BAR_MARKER,
        "variant": "plain",
    }
    if accent:
        text_config["screenStyle"] = {"titleBar": {"accentColor": accent}}
    return {
        "id": wid,
        "type": "text",
        "title": "标题装饰",
        "textConfig": text_config,
        **geo,
    }


def _accent_canvas_gradient(accent: str, canvas: str) -> str:
    """模板画布底色：accent 光晕 + 深色底，与 SVG 底图叠加。"""
    return (
        f"radial-gradient(ellipse 100% 85% at 50% -5%, {accent}40 0%, "
        f"{canvas} 42%, #020617 100%)"
    )


def _materialize_screen_style(
    *,
    accent: str = "#22d3ee",
    canvas: str = "#0f172a",
    decor: str | None = "gradient-soft",
    bg_image: str | None = None,
    palette_colors: list[str] | None = None,
) -> dict[str, Any]:
    """写入 FE 可直接渲染的 styleConfig（渐变/底图/调色板）。"""
    style = _screen_style(accent=accent, canvas=canvas, decor=decor, bg_image=bg_image)
    style["canvasBackground"] = _accent_canvas_gradient(accent, canvas)
    if decor and decor in DECOR_GRADIENT_DARK and not bg_image:
        style["canvasBackground"] = DECOR_GRADIENT_DARK[decor]
    style["seriesGradient"] = True
    if palette_colors:
        style["paletteId"] = "custom"
        style["paletteColors"] = palette_colors
    widget = style.setdefault("widgetStyle", {})
    if isinstance(widget, dict):
        widget["background"] = f"{accent}12"
        widget["borderColor"] = f"{accent}80"
        widget["borderWidth"] = 1
        widget["borderEnabled"] = True
        widget["borderRadius"] = 10
    return style


def _materialize_dash_style(
    *,
    scheme: str = "light",
    accent: str = "#465fff",
    decor: str | None = "gradient-soft",
    canvas: str | None = None,
    palette_colors: list[str] | None = None,
) -> dict[str, Any]:
    is_dark = scheme == "dark"
    gradient_map = DECOR_GRADIENT_DARK if is_dark else DECOR_GRADIENT_LIGHT
    resolved_canvas = canvas
    if not resolved_canvas and decor and decor in gradient_map:
        resolved_canvas = gradient_map[decor]
    style = _dash_style(
        scheme=scheme,
        accent=accent,
        decor=decor,
        canvas=resolved_canvas,
    )
    if resolved_canvas:
        style["canvasBackgroundCustom"] = True
    style["seriesGradient"] = True
    if palette_colors:
        style["paletteId"] = "custom"
        style["paletteColors"] = palette_colors
    return style


def _chart_de_style_for_accent(
    accent: str,
    *,
    chart_type: str,
    palette: list[str] | None = None,
) -> dict[str, Any]:
    """模板默认 chart deStyle（深色大屏）。"""
    colors = palette or [accent, "#38bdf8", "#6366f1", "#34d399", "#fbbf24", "#f472b6"]
    de_style: dict[str, Any] = {
        "seriesGradient": True,
        "label": {"show": True, "color": "#cbd5e1", "fontSize": 12},
        "legend": {"show": True, "color": "#94a3b8", "fontSize": 11},
        "border": {"show": True, "color": f"{accent}59", "width": 1, "radius": 8},
    }
    if chart_type == "map":
        de_style["geo"] = {
            "mapArea": "china",
            "visualMap": True,
            "areaColor": f"{accent}22",
            "borderColor": accent,
        }
    if chart_type in ("bar", "line", "pie", "gauge", "word-cloud", "kpi"):
        de_style["paletteId"] = "custom"
        de_style["seriesColor"] = [
            {"name": f"series-{index}", "color": color}
            for index, color in enumerate(colors[:6])
        ]
    return de_style


def _screen_style(
    *,
    accent: str = "#22d3ee",
    canvas: str = "#020617",
    decor: str | None = "gradient-radial",
    bg_image: str | None = None,
) -> dict[str, Any]:
    style: dict[str, Any] = {
        "surfaceKind": "data-screen",
        "colorScheme": "dark",
        "canvasBackground": canvas,
        "canvasBackgroundCustom": True,
        "paletteId": "default",
        "gapPreset": "md",
        "widgetStyle": {
            "background": "rgba(15, 23, 42, 0.78)",
            "borderColor": f"{accent}59",
            "borderWidth": 1,
            "borderEnabled": True,
            "borderStyle": "solid",
            "borderRadius": 10,
        },
        "titleStyle": {"color": "#e2e8f0", "fontSize": 14, "fontWeight": 600},
        "chartLabelStyle": {"color": "#cbd5e1"},
    }
    if decor:
        style["canvasDecorPresetId"] = decor
    if bg_image:
        style["canvasBackgroundImage"] = bg_image
    return style


def _dash_style(
    *,
    scheme: str = "light",
    accent: str = "#465fff",
    decor: str | None = "gradient-radial",
    canvas: str | None = None,
) -> dict[str, Any]:
    is_dark = scheme == "dark"
    style: dict[str, Any] = {
        "surfaceKind": "dashboard",
        "colorScheme": scheme,
        "paletteId": "default",
        "gapPreset": "md",
        "widgetStyle": {
            "background": "#ffffff" if not is_dark else "#1e293b",
            "borderColor": "#e4e7ec" if not is_dark else "#334155",
            "borderWidth": 1,
            "borderEnabled": True,
            "borderStyle": "solid",
            "borderRadius": 12,
        },
        "titleStyle": {"color": "#1d2939" if not is_dark else "#f2f4f7", "fontSize": 14, "fontWeight": 600},
        "chartLabelStyle": {"color": "#667085" if not is_dark else "#98a2b3"},
    }
    if canvas:
        style["canvasBackground"] = canvas
        style["canvasBackgroundCustom"] = True
    if decor:
        style["canvasDecorPresetId"] = decor
    return style


def build_screen_blank_layout() -> dict[str, Any]:
    return {
        "version": 2,
        "canvas": {"width": 1920, "height": 1080},
        "widgets": [],
        "globalFilters": [],
        "styleConfig": _screen_style(decor="gradient-radial"),
    }


def build_command_center_layout() -> dict[str, Any]:
    left = _chart(
        chart_type="bar",
        title="渠道销售",
        sql=SQL_SALES_BY_CHANNEL,
        dimensions=[{"field": "渠道"}],
        metrics=[{"field": "销售额"}],
        x=48,
        y=128,
        width=520,
        height=380,
        order=2,
    )
    center = _chart(
        chart_type="map",
        title="区域销售地图",
        sql=SQL_SALES_GEO_DRILL,
        dimensions=[
            {"field": "省份"},
            {"field": "城市"},
            {"field": "区县"},
        ],
        metrics=[{"field": "销售额"}],
        x=600,
        y=128,
        width=720,
        height=520,
        order=3,
    )
    right = _chart(
        chart_type="line",
        title="销售趋势",
        sql=SQL_SALES_TREND,
        dimensions=[{"field": "日期"}],
        metrics=[{"field": "销售额"}],
        x=1352,
        y=128,
        width=520,
        height=380,
        order=4,
    )
    bottom = _chart(
        chart_type="pie",
        title="省份占比",
        sql=SQL_SALES_BY_PROVINCE,
        dimensions=[{"field": "省份"}],
        metrics=[{"field": "销售额"}],
        x=600,
        y=680,
        width=720,
        height=320,
        order=5,
    )
    widgets = [
        _title_bar(x=560, y=16, width=800, height=72, order=0),
        _clock(x=1680, y=24, width=200, height=56, order=1),
        _border("border-3", x=32, y=104, width=552, height=420, order=6),
        _border("border-3", x=584, y=104, width=752, height=560, order=7),
        _border("border-3", x=1336, y=104, width=552, height=420, order=8),
        left,
        center,
        right,
        bottom,
    ]
    return {
        "version": 2,
        "canvas": {"width": 1920, "height": 1080},
        "widgets": widgets,
        "globalFilters": [],
        "styleConfig": _screen_style(
            accent="#22d3ee",
            canvas="#020617",
            decor="gradient-radial",
            bg_image="/template-assets/backgrounds/screen-dataease-aurora.svg",
        ),
    }


def build_tech_blue_layout() -> dict[str, Any]:
    main = _chart(
        chart_type="line",
        title="核心指标趋势",
        sql=SQL_SALES_TREND,
        dimensions=[{"field": "日期"}],
        metrics=[{"field": "销售额"}],
        x=120,
        y=160,
        width=1680,
        height=780,
        order=2,
    )
    kpi_left = _chart(
        chart_type="bar",
        title="渠道对比",
        sql=SQL_SALES_BY_CHANNEL,
        dimensions=[{"field": "渠道"}],
        metrics=[{"field": "销售额"}],
        x=120,
        y=960,
        width=520,
        height=80,
        order=3,
    )
    kpi_right = _chart(
        chart_type="pie",
        title="区域结构",
        sql=SQL_SALES_BY_PROVINCE,
        dimensions=[{"field": "省份"}],
        metrics=[{"field": "销售额"}],
        x=1280,
        y=960,
        width=520,
        height=80,
        order=4,
    )
    return {
        "version": 2,
        "canvas": {"width": 1920, "height": 1080},
        "widgets": [
            _title_bar(x=480, y=20, width=960, height=80, order=0),
            _clock(x=1680, y=28, width=200, height=56, order=1),
            _border("border-5", x=80, y=120, width=1760, height=840, order=5),
            main,
            kpi_left,
            kpi_right,
        ],
        "globalFilters": [],
        "styleConfig": _screen_style(
            accent="#38bdf8",
            canvas="#0c1222",
            decor="gradient-brand",
            bg_image="/template-assets/backgrounds/screen-dataease-aurora.svg",
        ),
    }


def build_gov_minimal_layout() -> dict[str, Any]:
    center_map = _chart(
        chart_type="map",
        title="全国销售分布",
        sql=SQL_SALES_GEO_DRILL,
        dimensions=[
            {"field": "省份"},
            {"field": "城市"},
            {"field": "区县"},
        ],
        metrics=[{"field": "销售额"}],
        x=360,
        y=200,
        width=1200,
        height=640,
        order=2,
    )
    left_kpi = _chart(
        chart_type="bar",
        title="重点城市",
        sql=SQL_TOP_CITIES,
        dimensions=[{"field": "城市"}],
        metrics=[{"field": "销售额"}],
        x=64,
        y=200,
        width=280,
        height=300,
        order=3,
    )
    right_kpi = _chart(
        chart_type="line",
        title="月度趋势",
        sql=SQL_SALES_TREND,
        dimensions=[{"field": "日期"}],
        metrics=[{"field": "销售额"}],
        x=1576,
        y=200,
        width=280,
        height=300,
        order=4,
    )
    return {
        "version": 2,
        "canvas": {"width": 1920, "height": 1080},
        "widgets": [
            _title_bar(x=460, y=40, width=1000, height=88, order=0),
            _clock(x=1680, y=48, width=200, height=56, order=1),
            _border("border-2", x=340, y=176, width=1240, height=688, order=5),
            left_kpi,
            center_map,
            right_kpi,
        ],
        "globalFilters": [],
        "styleConfig": {
            "surfaceKind": "data-screen",
            "colorScheme": "dark",
            "canvasBackground": "#0f172a",
            "canvasBackgroundCustom": True,
            "canvasDecorPresetId": "gradient-soft",
            "themeAccent": "#6366f1",
            "canvasBackgroundImage": "/template-assets/backgrounds/screen-gov-indigo.svg",
            "widgetStyle": {
                "background": "rgba(30, 41, 59, 0.85)",
                "borderColor": "rgba(99, 102, 241, 0.4)",
                "borderWidth": 1,
                "borderEnabled": True,
            },
            "titleStyle": {"color": "#f8fafc"},
        },
    }


def build_dash_blank_layout() -> dict[str, Any]:
    return {
        "version": 1,
        "widgets": [],
        "globalFilters": [],
        "styleConfig": _dash_style(decor="dots"),
    }


def build_dual_kpi_layout() -> dict[str, Any]:
    w1 = _chart(
        chart_type="bar",
        title="渠道销售对比",
        sql=SQL_SALES_BY_CHANNEL,
        dimensions=[{"field": "渠道"}],
        metrics=[{"field": "销售额"}],
        colSpan=6,
        rowSpan=5,
        gridX=0,
        gridY=1,
        order=1,
    )
    w2 = _chart(
        chart_type="line",
        title="销售趋势",
        sql=SQL_SALES_TREND,
        dimensions=[{"field": "日期"}],
        metrics=[{"field": "销售额"}],
        colSpan=6,
        rowSpan=5,
        gridX=6,
        gridY=1,
        order=2,
    )
    kpi = _chart(
        chart_type="kpi",
        title="核心 KPI",
        sql=SQL_DAILY_KPI,
        dimensions=[{"field": "指标"}],
        metrics=[{"field": "数值"}],
        colSpan=12,
        rowSpan=1,
        gridX=0,
        gridY=0,
        order=0,
    )
    return {
        "version": 1,
        "widgets": [kpi, w1, w2],
        "globalFilters": [],
        "styleConfig": _dash_style(
            accent="#465fff",
            decor="gradient-radial",
            canvas="#f8fafc",
        ),
    }


def build_triple_analysis_layout() -> dict[str, Any]:
    w_map = _chart(
        chart_type="map",
        title="区域分布",
        sql=SQL_SALES_GEO_DRILL,
        dimensions=[
            {"field": "省份"},
            {"field": "城市"},
            {"field": "区县"},
        ],
        metrics=[{"field": "销售额"}],
        colSpan=5,
        rowSpan=6,
        gridX=0,
        gridY=0,
        order=0,
    )
    w_pie = _chart(
        chart_type="pie",
        title="渠道结构",
        sql=SQL_SALES_BY_CHANNEL,
        dimensions=[{"field": "渠道"}],
        metrics=[{"field": "销售额"}],
        colSpan=4,
        rowSpan=6,
        gridX=5,
        gridY=0,
        order=1,
    )
    w_table = _chart(
        chart_type="table-info",
        title="城市 TOP10",
        sql=SQL_TOP_CITIES,
        dimensions=[{"field": "城市"}],
        metrics=[{"field": "销售额"}],
        colSpan=3,
        rowSpan=6,
        gridX=9,
        gridY=0,
        order=2,
    )
    return {
        "version": 1,
        "widgets": [w_map, w_pie, w_table],
        "globalFilters": [],
        "styleConfig": _dash_style(
            accent="#7c3aed",
            decor="gradient-soft",
            canvas="#ffffff",
        ),
    }


def build_sales_geo_screen_layout() -> dict[str, Any]:
    """销售地理大屏：地图居中 + 两侧指标。"""
    map_w = _chart(
        chart_type="map",
        title="销售地理分布",
        sql=SQL_SALES_GEO_DRILL,
        dimensions=[
            {"field": "省份"},
            {"field": "城市"},
            {"field": "区县"},
        ],
        metrics=[{"field": "销售额"}],
        x=480,
        y=140,
        width=960,
        height=720,
        order=2,
    )
    return {
        "version": 2,
        "canvas": {"width": 1920, "height": 1080},
        "widgets": [
            _title_bar(x=480, y=24, width=960, height=72, order=0),
            _clock(x=1680, y=32, width=200, height=56, order=1),
            _border("border-7", x=440, y=112, width=1040, height=776, order=5),
            _chart(
                chart_type="bar",
                title="省份 TOP",
                sql=SQL_SALES_BY_PROVINCE,
                dimensions=[{"field": "省份"}],
                metrics=[{"field": "销售额"}],
                x=48,
                y=140,
                width=400,
                height=340,
                order=3,
            ),
            _chart(
                chart_type="line",
                title="趋势",
                sql=SQL_SALES_TREND,
                dimensions=[{"field": "日期"}],
                metrics=[{"field": "销售额"}],
                x=48,
                y=520,
                width=400,
                height=340,
                order=4,
            ),
            map_w,
            _chart(
                chart_type="pie",
                title="渠道",
                sql=SQL_SALES_BY_CHANNEL,
                dimensions=[{"field": "渠道"}],
                metrics=[{"field": "销售额"}],
                x=1472,
                y=140,
                width=400,
                height=340,
                order=6,
            ),
            _chart(
                chart_type="bar",
                title="城市 TOP10",
                sql=SQL_TOP_CITIES,
                dimensions=[{"field": "城市"}],
                metrics=[{"field": "销售额"}],
                x=1472,
                y=520,
                width=400,
                height=340,
                order=7,
            ),
        ],
        "globalFilters": [],
        "styleConfig": _screen_style(
            accent="#34d399",
            canvas="#041016",
            decor="gradient-radial",
            bg_image="/template-assets/backgrounds/screen-emerald-grid.svg",
        ),
    }


def build_ops_dashboard_layout() -> dict[str, Any]:
    """运营分析看板：地图 + 趋势 + 明细表。"""
    return {
        "version": 1,
        "widgets": [
            _chart(
                chart_type="kpi",
                title="运营 KPI",
                sql=SQL_DAILY_KPI,
                dimensions=[{"field": "指标"}],
                metrics=[{"field": "数值"}],
                colSpan=12,
                rowSpan=1,
                gridX=0,
                gridY=0,
                order=0,
            ),
            _chart(
                chart_type="map",
                title="区域热力",
                sql=SQL_SALES_GEO_DRILL,
                dimensions=[
                    {"field": "省份"},
                    {"field": "城市"},
                    {"field": "区县"},
                ],
                metrics=[{"field": "销售额"}],
                colSpan=7,
                rowSpan=5,
                gridX=0,
                gridY=1,
                order=1,
            ),
            _chart(
                chart_type="line",
                title="销售走势",
                sql=SQL_SALES_TREND,
                dimensions=[{"field": "日期"}],
                metrics=[{"field": "销售额"}],
                colSpan=5,
                rowSpan=3,
                gridX=7,
                gridY=1,
                order=2,
            ),
            _chart(
                chart_type="table-info",
                title="城市明细",
                sql=SQL_TOP_CITIES,
                dimensions=[{"field": "城市"}],
                metrics=[{"field": "销售额"}],
                colSpan=5,
                rowSpan=2,
                gridX=7,
                gridY=4,
                order=3,
            ),
        ],
        "globalFilters": [],
        "styleConfig": _dash_style(
            scheme="light",
            accent="#0ea5e9",
            decor="grid",
            canvas="#f1f5f9",
        ),
    }
