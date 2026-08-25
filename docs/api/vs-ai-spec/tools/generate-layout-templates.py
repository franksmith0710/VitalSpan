#!/usr/bin/env python3
"""Generate layout template JSON files for DeepTalk compose (data-screen + dashboard)."""

from __future__ import annotations

import json
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "assets" / "layout-templates"


def dark_style(accent: str = "#22d3ee", canvas: str = "#041016") -> dict:
    return {
        "surfaceKind": "data-screen",
        "colorScheme": "dark",
        "scaleMode": "canvas",
        "gapPreset": "md",
        "widgetGap": 16,
        "pixelGutter": 24,
        "canvasBackground": canvas,
        "canvasBackgroundCustom": True,
        "canvasDecorPresetId": "gradient-radial",
        "refreshIntervalSec": 60,
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


def light_style() -> dict:
    return {
        "surfaceKind": "data-screen",
        "colorScheme": "light",
        "scaleMode": "canvas",
        "gapPreset": "md",
        "widgetGap": 16,
        "pixelGutter": 24,
        "canvasBackground": "#f8fafc",
        "canvasBackgroundCustom": True,
        "paletteId": "default",
        "refreshIntervalSec": 60,
        "widgetStyle": {
            "background": "#ffffff",
            "borderColor": "#e4e7ec",
            "borderWidth": 1,
            "borderEnabled": True,
            "borderStyle": "solid",
            "borderRadius": 12,
        },
        "titleStyle": {"color": "#1d2939", "fontSize": 14, "fontWeight": 600},
        "chartLabelStyle": {"color": "#667085"},
    }


def dash_style(*, scheme: str = "light", accent: str = "#465fff") -> dict:
    is_dark = scheme == "dark"
    style: dict = {
        "surfaceKind": "dashboard",
        "colorScheme": scheme,
        "scaleMode": "canvas",
        "gapPreset": "md",
        "widgetGap": 16,
        "pixelGutter": 24,
        "paletteId": "default",
        "widgetStyle": {
            "background": "#1e293b" if is_dark else "#ffffff",
            "borderColor": "#334155" if is_dark else "#e4e7ec",
            "borderWidth": 1,
            "borderEnabled": True,
            "borderStyle": "solid",
            "borderRadius": 12,
        },
        "titleStyle": {
            "color": "#f2f4f7" if is_dark else "#1d2939",
            "fontSize": 14,
            "fontWeight": 600,
        },
        "chartLabelStyle": {"color": "#98a2b3" if is_dark else "#667085"},
    }
    if is_dark:
        style["canvasBackground"] = "#0f172a"
        style["canvasBackgroundCustom"] = True
        style["canvasDecorPresetId"] = "gradient-radial"
        style["widgetStyle"]["borderColor"] = f"{accent}59"
    return style


def slot(kind: str, title: str, x: int, y: int, w: int, h: int, *, chart_type: str | None = None) -> dict:
    s: dict = {"type": kind, "title": title, "x": x, "y": y, "width": w, "height": h}
    if chart_type:
        s["defaultChartType"] = chart_type
    return s


SHELL_H = 88

CHART_TITLE_DEFAULTS: list[tuple[str, str]] = [
    ("趋势", "line"),
    ("占比", "pie-donut"),
    ("结构", "pie-donut"),
    ("雷达", "radar"),
    ("地图", "map"),
    ("明细", "table-info"),
    ("漏斗", "funnel"),
    ("关系", "graph"),
    ("物流", "sankey"),
    ("仪表", "gauge"),
    ("对比", "bar"),
    ("排名", "bar-horizontal"),
    ("KPI", "kpi"),
    ("指标", "kpi"),
    ("GMV", "kpi"),
    ("订单", "kpi"),
    ("访客", "kpi"),
    ("转化", "kpi"),
    ("面板", "bar"),
    ("区块", "bar"),
    ("主趋势", "line"),
    ("主图表", "line"),
    ("辅图", "bar"),
    ("柱状", "bar"),
    ("折线", "line"),
    ("饼", "pie"),
    ("环形", "pie-donut"),
    ("核心", "kpi"),
    ("销售", "kpi"),
    ("品类", "pie-donut"),
    ("省区", "sankey"),
    ("分布", "bar"),
    ("内置图", "bar"),
]


def infer_chart_type(title: str, existing: str | None = None) -> str:
    if existing:
        return existing
    for key, chart_type in CHART_TITLE_DEFAULTS:
        if key in title:
            return chart_type
    return "bar"


def shell_accent(style: dict) -> str:
    border = (style.get("widgetStyle") or {}).get("borderColor") or ""
    if isinstance(border, str) and border.startswith("#") and len(border) >= 7:
        return border[:7]
    return "#22d3ee"


def clamp_slots_to_canvas(slots: list[dict], canvas_h: int = 1080) -> None:
    if not slots:
        return
    for _ in range(48):
        max_bottom = max(int(s["y"]) + int(s["height"]) for s in slots)
        if max_bottom <= canvas_h:
            return
        overflow = max_bottom - canvas_h
        bottom = max(slots, key=lambda x: int(x["y"]) + int(x["height"]))
        min_h = 88 if bottom["type"] == "chart" else 64
        shrink = min(overflow, max(0, int(bottom["height"]) - min_h))
        if shrink > 0:
            bottom["height"] = int(bottom["height"]) - shrink
            continue
        min_y = SHELL_H if int(bottom["y"]) >= SHELL_H else 0
        move = min(overflow, int(bottom["y"]) - min_y)
        if move > 0:
            bottom["y"] = int(bottom["y"]) - move
            continue
        for s in slots:
            if int(s["height"]) > min_h:
                s["height"] = int(s["height"]) - 1
        else:
            break


def finalize_template(tpl: dict) -> dict:
    if tpl["surfaceKind"] == "data-screen":
        accent = shell_accent(tpl.get("styleConfig") or {})
        tpl.setdefault(
            "shell",
            {"title": tpl["name"], "clock": True, "accent": accent},
        )
        if tpl["slots"]:
            min_y = min(int(s["y"]) for s in tpl["slots"])
            if min_y < SHELL_H:
                for s in tpl["slots"]:
                    s["y"] = int(s["y"]) + SHELL_H
                clamp_slots_to_canvas(tpl["slots"], int(tpl.get("canvas", {}).get("height", 1080)))
    for s in tpl["slots"]:
        if s["type"] == "chart":
            s["defaultChartType"] = infer_chart_type(s["title"], s.get("defaultChartType"))
    tpl.setdefault("tags", [])
    if tpl["surfaceKind"] == "data-screen" and "de-style" not in tpl["tags"]:
        tpl["tags"].append("de-style")
    return tpl


TEMPLATES: list[dict] = [
    {
        "id": "gov-cockpit",
        "name": "政务 KPI 驾驶舱",
        "description": "四 KPI + 双行图表 + 全宽关系带；深色 cyan，48px 边距",
        "surfaceKind": "data-screen",
        "canvas": {"width": 1920, "height": 1080},
        "styleConfig": dark_style("#22d3ee"),
        "slots": [
            slot("chart", "核心指标 A", 48, 56, 438, 120, chart_type="kpi"),
            slot("chart", "核心指标 B", 510, 56, 438, 120, chart_type="kpi"),
            slot("chart", "核心指标 C", 972, 56, 438, 120, chart_type="kpi"),
            slot("chart", "核心指标 D", 1434, 56, 438, 120, chart_type="kpi"),
            slot("chart", "趋势分析", 48, 200, 900, 320, chart_type="line"),
            slot("chart", "结构占比", 972, 200, 900, 320, chart_type="pie-donut"),
            slot("chart", "区域对比", 48, 556, 900, 320, chart_type="bar"),
            slot("chart", "区域地图", 972, 556, 900, 320, chart_type="map"),
            slot("customViz", "AI 洞察", 48, 912, 1824, 120),
        ],
    },
    {
        "id": "sparse-three-tier",
        "name": "三阶疏朗",
        "description": "KPI 带 + 中行三列 + 底行双图 + 仪表带",
        "surfaceKind": "data-screen",
        "canvas": {"width": 1920, "height": 1080},
        "styleConfig": dark_style("#38bdf8"),
        "slots": [
            slot("chart", "指标一", 48, 48, 592, 100, chart_type="kpi"),
            slot("chart", "指标二", 664, 48, 592, 100, chart_type="kpi"),
            slot("chart", "指标三", 1280, 48, 592, 100, chart_type="kpi"),
            slot("chart", "左栏图表", 48, 172, 592, 340),
            slot("chart", "中栏图表", 664, 172, 592, 340),
            slot("chart", "右栏图表", 1280, 172, 592, 340),
            slot("customViz", "AI 趋势", 48, 536, 900, 300),
            slot("customViz", "AI 排名", 972, 536, 900, 300),
            slot("chart", "对比图", 48, 860, 900, 172),
            slot("chart", "分布图", 972, 860, 900, 172),
        ],
    },
    {
        "id": "map-hero",
        "name": "地图主角",
        "description": "居中大地图，左右辅图 + customViz",
        "surfaceKind": "data-screen",
        "canvas": {"width": 1920, "height": 1080},
        "styleConfig": dark_style("#34d399"),
        "slots": [
            slot("chart", "左上指标", 48, 48, 420, 200, chart_type="kpi"),
            slot("chart", "左下趋势", 48, 272, 420, 760),
            slot("chart", "区域地图", 492, 48, 936, 984, chart_type="map"),
            slot("chart", "右上占比", 1464, 48, 408, 472, chart_type="pie-donut"),
            slot("customViz", "AI 组件", 1464, 544, 408, 488),
        ],
    },
    {
        "id": "quad-spacious",
        "name": "四宫格留白",
        "description": "2×2 等大区块，56px 边距 + 32px 缝",
        "surfaceKind": "data-screen",
        "canvas": {"width": 1920, "height": 1080},
        "styleConfig": dark_style("#6366f1"),
        "slots": [
            slot("chart", "区块 A", 56, 56, 884, 464),
            slot("chart", "区块 B", 980, 56, 884, 464),
            slot("chart", "区块 C", 56, 556, 884, 464),
            slot("chart", "区块 D", 980, 556, 884, 464),
        ],
    },
    {
        "id": "asymmetric-editorial",
        "name": "不对称编辑排版",
        "description": "左侧主图 62%，右侧竖栈",
        "surfaceKind": "data-screen",
        "canvas": {"width": 1920, "height": 1080},
        "styleConfig": dark_style("#a78bfa"),
        "slots": [
            slot("chart", "主趋势", 48, 48, 1152, 984),
            slot("chart", "右上 KPI", 1224, 48, 648, 200, chart_type="kpi"),
            slot("chart", "右中占比", 1224, 272, 648, 280, chart_type="pie-donut"),
            slot("customViz", "AI 排名", 1224, 576, 648, 220),
            slot("chart", "右下仪表", 1224, 820, 648, 212, chart_type="gauge"),
        ],
    },
    {
        "id": "kpi-flow-banner",
        "name": "KPI 顶带 + 流向带",
        "description": "四 KPI + 全宽 sankey/graph + 四象限",
        "surfaceKind": "data-screen",
        "canvas": {"width": 1920, "height": 1080},
        "styleConfig": dark_style("#fbbf24", "#0f172a"),
        "slots": [
            slot("chart", "GMV", 48, 40, 438, 110, chart_type="kpi"),
            slot("chart", "订单", 510, 40, 438, 110, chart_type="kpi"),
            slot("chart", "访客", 972, 40, 438, 110, chart_type="kpi"),
            slot("chart", "转化", 1434, 40, 438, 110, chart_type="kpi"),
            slot("chart", "省区物流关系", 48, 170, 1824, 260, chart_type="sankey"),
            slot("chart", "品类占比", 48, 454, 900, 280, chart_type="pie-donut"),
            slot("chart", "区域地图", 972, 454, 900, 280, chart_type="map"),
            slot("chart", "漏斗", 48, 758, 900, 274, chart_type="funnel"),
            slot("chart", "关系图", 972, 758, 900, 274, chart_type="graph"),
        ],
    },
    {
        "id": "customviz-stage",
        "name": "CustomViz 舞台",
        "description": "上方双大 customViz + 下方四内置图",
        "surfaceKind": "data-screen",
        "canvas": {"width": 1920, "height": 1080},
        "styleConfig": dark_style("#f472b6"),
        "slots": [
            slot("customViz", "AI 主视觉 A", 48, 48, 900, 380),
            slot("customViz", "AI 主视觉 B", 972, 48, 900, 380),
            slot("customViz", "AI 主视觉 C", 48, 452, 900, 380),
            slot("chart", "内置图 A", 972, 452, 438, 380),
            slot("chart", "内置图 B", 1434, 452, 438, 380),
            slot("chart", "内置图 C", 972, 856, 438, 176),
            slot("chart", "内置图 D", 1434, 856, 438, 176),
        ],
    },
    {
        "id": "industrial-monitor",
        "name": "工业监控六宫格",
        "description": "3×2 等分面板，绿色工业 accent",
        "surfaceKind": "data-screen",
        "canvas": {"width": 1920, "height": 1080},
        "styleConfig": dark_style("#34d399", "#020617"),
        "slots": [
            slot("chart", "面板 1", 48, 48, 592, 480),
            slot("chart", "面板 2", 664, 48, 592, 480),
            slot("chart", "面板 3", 1280, 48, 592, 480),
            slot("chart", "面板 4", 48, 552, 592, 480),
            slot("chart", "面板 5", 664, 552, 592, 480),
            slot("chart", "面板 6", 1280, 552, 592, 480),
        ],
    },
    {
        "id": "finance-light",
        "name": "金融浅色看板风",
        "description": "浅色背景 + 疏朗五区",
        "surfaceKind": "data-screen",
        "canvas": {"width": 1920, "height": 1080},
        "styleConfig": light_style(),
        "slots": [
            slot("chart", "核心 KPI", 48, 48, 580, 140, chart_type="kpi"),
            slot("chart", "收益趋势", 652, 48, 1220, 340),
            slot("chart", "资产结构", 48, 212, 580, 340, chart_type="pie-donut"),
            slot("customViz", "AI 解读", 652, 412, 1220, 140),
            slot("chart", "风险雷达", 48, 580, 900, 452, chart_type="radar"),
            slot("chart", "明细表", 972, 580, 900, 452, chart_type="table-info"),
        ],
    },
    {
        "id": "minimal-demo",
        "name": "极简演示",
        "description": "仅 5 块，大留白，适合 POC",
        "surfaceKind": "data-screen",
        "canvas": {"width": 1920, "height": 1080},
        "styleConfig": dark_style("#818cf8", "#0b1020"),
        "slots": [
            slot("chart", "主 KPI", 560, 120, 800, 160, chart_type="kpi"),
            slot("chart", "主图表", 360, 320, 1200, 360),
            slot("chart", "辅图", 760, 700, 400, 160),
            slot("customViz", "AI 组件 A", 360, 880, 580, 152),
            slot("customViz", "AI 组件 B", 980, 880, 580, 152),
        ],
    },
    {
        "id": "de-classic-cockpit",
        "name": "DE 经典驾驶舱",
        "description": "对标 DataEase：顶栏+时钟+四 KPI+双行图+地图+洞察带；推荐默认",
        "surfaceKind": "data-screen",
        "tags": ["de-recommended", "de-style"],
        "canvas": {"width": 1920, "height": 1080},
        "styleConfig": dark_style("#22d3ee"),
        "shell": {"title": "数据分析驾驶舱", "accent": "#22d3ee", "clock": True},
        "slots": [
            slot("chart", "核心指标 A", 48, 144, 438, 120, chart_type="kpi"),
            slot("chart", "核心指标 B", 510, 144, 438, 120, chart_type="kpi"),
            slot("chart", "核心指标 C", 972, 144, 438, 120, chart_type="kpi"),
            slot("chart", "核心指标 D", 1434, 144, 438, 120, chart_type="kpi"),
            slot("chart", "趋势分析", 48, 288, 900, 300, chart_type="line"),
            slot("chart", "结构占比", 972, 288, 900, 300, chart_type="pie-donut"),
            slot("chart", "区域对比", 48, 612, 900, 300, chart_type="bar"),
            slot("chart", "区域地图", 972, 612, 900, 300, chart_type="map"),
            slot("customViz", "AI 洞察", 48, 936, 1824, 112),
        ],
    },
    {
        "id": "de-sales-command",
        "name": "DE 销售指挥墙",
        "description": "四 KPI + 宽趋势 + 饼图/地图 + 明细表；政企销售场景",
        "surfaceKind": "data-screen",
        "tags": ["de-recommended", "de-style", "sales"],
        "canvas": {"width": 1920, "height": 1080},
        "styleConfig": dark_style("#38bdf8", "#0c1222"),
        "shell": {"title": "销售指挥中枢", "accent": "#38bdf8", "clock": True},
        "slots": [
            slot("chart", "销售额 KPI", 48, 144, 438, 112, chart_type="kpi"),
            slot("chart", "订单量 KPI", 510, 144, 438, 112, chart_type="kpi"),
            slot("chart", "客单价 KPI", 972, 144, 438, 112, chart_type="kpi"),
            slot("chart", "转化率 KPI", 1434, 144, 438, 112, chart_type="kpi"),
            slot("chart", "销售趋势", 48, 280, 1824, 260, chart_type="line"),
            slot("chart", "渠道占比", 48, 564, 900, 280, chart_type="pie-donut"),
            slot("chart", "区域地图", 972, 564, 900, 280, chart_type="map"),
            slot("chart", "TOP 明细", 48, 868, 1824, 180, chart_type="table-info"),
        ],
    },
    {
        "id": "de-balanced-four",
        "name": "DE 四象限均衡",
        "description": "2×2 等分 + 固定柱/线/饼/雷达；最工整的通用样例",
        "surfaceKind": "data-screen",
        "tags": ["de-recommended", "de-style", "balanced"],
        "canvas": {"width": 1920, "height": 1080},
        "styleConfig": dark_style("#6366f1"),
        "shell": {"title": "运营分析大屏", "accent": "#6366f1", "clock": True},
        "slots": [
            slot("chart", "柱状对比", 48, 144, 900, 420, chart_type="bar"),
            slot("chart", "趋势折线", 972, 144, 900, 420, chart_type="line"),
            slot("chart", "结构占比", 48, 588, 900, 420, chart_type="pie-donut"),
            slot("chart", "多维雷达", 972, 588, 900, 420, chart_type="radar"),
        ],
    },
    {
        "id": "de-map-command",
        "name": "DE 地图指挥",
        "description": "居中大地图 + 侧栏 KPI/排名/占比；地理分析场景",
        "surfaceKind": "data-screen",
        "tags": ["de-recommended", "de-style", "map"],
        "canvas": {"width": 1920, "height": 1080},
        "styleConfig": dark_style("#34d399", "#020617"),
        "shell": {"title": "区域指挥地图", "accent": "#34d399", "clock": True},
        "slots": [
            slot("chart", "总览 KPI", 48, 144, 360, 120, chart_type="kpi"),
            slot("chart", "城市排名", 48, 288, 360, 360, chart_type="bar-horizontal"),
            slot("chart", "区域地图", 432, 144, 1056, 864, chart_type="map"),
            slot("chart", "品类占比", 1512, 144, 360, 360, chart_type="pie-donut"),
            slot("chart", "趋势迷你", 1512, 528, 360, 240, chart_type="line"),
            slot("customViz", "AI 洞察", 1512, 792, 360, 216),
        ],
    },
    {
        "id": "de-kpi-flow-wall",
        "name": "DE KPI 流向墙",
        "description": "四 KPI + 全宽 sankey + 四象限；流向/链路场景",
        "surfaceKind": "data-screen",
        "tags": ["de-recommended", "de-style", "flow"],
        "canvas": {"width": 1920, "height": 1080},
        "styleConfig": dark_style("#fbbf24", "#0f172a"),
        "shell": {"title": "业务流向大屏", "accent": "#fbbf24", "clock": True},
        "slots": [
            slot("chart", "GMV", 48, 144, 438, 100, chart_type="kpi"),
            slot("chart", "订单", 510, 144, 438, 100, chart_type="kpi"),
            slot("chart", "访客", 972, 144, 438, 100, chart_type="kpi"),
            slot("chart", "转化", 1434, 144, 438, 100, chart_type="kpi"),
            slot("chart", "省区物流关系", 48, 268, 1824, 240, chart_type="sankey"),
            slot("chart", "品类占比", 48, 532, 900, 260, chart_type="pie-donut"),
            slot("chart", "区域地图", 972, 532, 900, 260, chart_type="map"),
            slot("chart", "转化漏斗", 48, 816, 900, 232, chart_type="funnel"),
            slot("chart", "关系网络", 972, 816, 900, 232, chart_type="graph"),
        ],
    },
]

DASH_TEMPLATES: list[dict] = [
    {
        "id": "dash-kpi-grid",
        "name": "KPI 四宫 + 双行图表",
        "description": "1440 仪表板：四 KPI + 2×2 图表，浅色疏朗",
        "surfaceKind": "dashboard",
        "canvas": {"width": 1440, "height": 1080},
        "styleConfig": dash_style(scheme="light"),
        "slots": [
            slot("chart", "指标 A", 48, 48, 318, 100, chart_type="kpi"),
            slot("chart", "指标 B", 390, 48, 318, 100, chart_type="kpi"),
            slot("chart", "指标 C", 732, 48, 318, 100, chart_type="kpi"),
            slot("chart", "指标 D", 1074, 48, 318, 100, chart_type="kpi"),
            slot("chart", "趋势图", 48, 172, 660, 320),
            slot("chart", "对比图", 732, 172, 660, 320),
            slot("chart", "结构图", 48, 516, 660, 516),
            slot("chart", "明细", 732, 516, 660, 516, chart_type="table-info"),
        ],
    },
    {
        "id": "dash-analytics-3col",
        "name": "三栏分析",
        "description": "1440 三等分栏，适合运营日报",
        "surfaceKind": "dashboard",
        "canvas": {"width": 1440, "height": 1080},
        "styleConfig": dash_style(scheme="light", accent="#6366f1"),
        "slots": [
            slot("chart", "左栏", 48, 48, 432, 480),
            slot("chart", "中栏", 504, 48, 432, 480),
            slot("chart", "右栏", 960, 48, 432, 480),
            slot("chart", "左下", 48, 552, 432, 480),
            slot("chart", "中下", 504, 552, 432, 480),
            slot("customViz", "AI 组件", 960, 552, 432, 480),
        ],
    },
    {
        "id": "dash-trend-hero",
        "name": "趋势主图",
        "description": "左侧大折线 + 右侧 KPI/占比栈",
        "surfaceKind": "dashboard",
        "canvas": {"width": 1440, "height": 1080},
        "styleConfig": dash_style(scheme="light", accent="#38bdf8"),
        "slots": [
            slot("chart", "核心趋势", 48, 48, 900, 720),
            slot("chart", "KPI", 972, 48, 420, 160, chart_type="kpi"),
            slot("chart", "占比", 972, 232, 420, 260, chart_type="pie-donut"),
            slot("chart", "排名", 972, 516, 420, 252, chart_type="bar-horizontal"),
            slot("customViz", "AI 洞察", 48, 792, 1344, 240),
        ],
    },
    {
        "id": "dash-report-light",
        "name": "浅色汇报",
        "description": "汇报场景：KPI + 宽表 + 双图",
        "surfaceKind": "dashboard",
        "canvas": {"width": 1440, "height": 1080},
        "styleConfig": dash_style(scheme="light", accent="#465fff"),
        "slots": [
            slot("chart", "总览 KPI", 48, 48, 420, 120, chart_type="kpi"),
            slot("chart", "次级 KPI", 492, 48, 420, 120, chart_type="kpi"),
            slot("chart", "辅助 KPI", 936, 48, 456, 120, chart_type="kpi"),
            slot("chart", "明细表", 48, 192, 1344, 320, chart_type="table-info"),
            slot("chart", "趋势", 48, 536, 660, 496),
            slot("chart", "结构", 732, 536, 660, 496, chart_type="pie-donut"),
        ],
    },
    {
        "id": "dash-map-panel",
        "name": "区域地图侧栏",
        "description": "中国省界地图 + 侧栏指标（1440）",
        "surfaceKind": "dashboard",
        "canvas": {"width": 1440, "height": 1080},
        "styleConfig": dash_style(scheme="light", accent="#34d399"),
        "slots": [
            slot("chart", "区域地图", 48, 48, 900, 984, chart_type="map"),
            slot("chart", "KPI", 972, 48, 420, 200, chart_type="kpi"),
            slot("chart", "排名", 972, 272, 420, 360, chart_type="bar-horizontal"),
            slot("chart", "占比", 972, 656, 420, 376, chart_type="pie-donut"),
        ],
    },
    {
        "id": "dash-table-focus",
        "name": "明细表主导",
        "description": "宽明细表 + 上角双图",
        "surfaceKind": "dashboard",
        "canvas": {"width": 1440, "height": 1080},
        "styleConfig": dash_style(scheme="light"),
        "slots": [
            slot("chart", "指标卡", 48, 48, 660, 140, chart_type="kpi"),
            slot("chart", "迷你趋势", 732, 48, 660, 140),
            slot("chart", "明细表", 48, 212, 1344, 520, chart_type="table-info"),
            slot("chart", "分布", 48, 756, 660, 276, chart_type="pie-donut"),
            slot("chart", "对比", 732, 756, 660, 276),
        ],
    },
    {
        "id": "dash-dark-ops",
        "name": "深色运维看板",
        "description": "1440 深色仪表板，六面板",
        "surfaceKind": "dashboard",
        "canvas": {"width": 1440, "height": 1080},
        "styleConfig": dash_style(scheme="dark", accent="#22d3ee"),
        "slots": [
            slot("chart", "面板 1", 48, 48, 432, 480),
            slot("chart", "面板 2", 504, 48, 432, 480),
            slot("chart", "面板 3", 960, 48, 432, 480),
            slot("chart", "面板 4", 48, 552, 432, 480),
            slot("chart", "面板 5", 504, 552, 432, 480),
            slot("chart", "面板 6", 960, 552, 432, 480),
        ],
    },
    {
        "id": "dash-mixed-cv",
        "name": "CustomViz 混排",
        "description": "双 customViz + 三内置图",
        "surfaceKind": "dashboard",
        "canvas": {"width": 1440, "height": 1080},
        "styleConfig": dash_style(scheme="light", accent="#f472b6"),
        "slots": [
            slot("customViz", "AI 趋势", 48, 48, 660, 320),
            slot("customViz", "AI 排名", 732, 48, 660, 320),
            slot("chart", "柱状图", 48, 392, 432, 640),
            slot("chart", "折线图", 504, 392, 432, 640),
            slot("chart", "环形图", 960, 392, 432, 640, chart_type="pie-donut"),
        ],
    },
    {
        "id": "dash-minimal",
        "name": "极简三区块",
        "description": "仅 3 块 + 大留白",
        "surfaceKind": "dashboard",
        "canvas": {"width": 1440, "height": 1080},
        "styleConfig": dash_style(scheme="light"),
        "slots": [
            slot("chart", "主 KPI", 420, 80, 600, 140, chart_type="kpi"),
            slot("chart", "主图表", 120, 260, 1200, 400),
            slot("customViz", "AI 组件", 320, 700, 800, 280),
        ],
    },
    {
        "id": "dash-sales-board",
        "name": "销售看板",
        "description": "KPI 行 + 柱/线/饼 经典组合",
        "surfaceKind": "dashboard",
        "canvas": {"width": 1440, "height": 1080},
        "styleConfig": dash_style(scheme="light", accent="#465fff"),
        "slots": [
            slot("chart", "销售额", 48, 48, 318, 110, chart_type="kpi"),
            slot("chart", "订单量", 390, 48, 318, 110, chart_type="kpi"),
            slot("chart", "客单价", 732, 48, 318, 110, chart_type="kpi"),
            slot("chart", "转化率", 1074, 48, 318, 110, chart_type="kpi"),
            slot("chart", "柱状图", 48, 182, 432, 850, chart_type="bar"),
            slot("chart", "折线图", 504, 182, 432, 850, chart_type="line"),
            slot("chart", "饼图", 960, 182, 432, 850, chart_type="pie"),
        ],
    },
]

ALL_TEMPLATES = TEMPLATES + DASH_TEMPLATES


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    catalog = {
        "version": 2,
        "description": "DeepTalk compose 排布样例（大屏 DE 壳层 + 仪表板）",
        "recommendedDataScreen": [
            "de-classic-cockpit",
            "de-sales-command",
            "de-balanced-four",
            "de-map-command",
            "gov-cockpit",
        ],
        "templates": [],
    }
    for tpl in ALL_TEMPLATES:
        finalize_template(tpl)
        path = OUT / f"{tpl['id']}.json"
        path.write_text(json.dumps(tpl, ensure_ascii=False, indent=2), encoding="utf-8")
        chart_slots = sum(1 for s in tpl["slots"] if s["type"] == "chart")
        cv_slots = sum(1 for s in tpl["slots"] if s["type"] == "customViz")
        catalog["templates"].append(
            {
                "id": tpl["id"],
                "name": tpl["name"],
                "description": tpl.get("description", ""),
                "surfaceKind": tpl["surfaceKind"],
                "tags": tpl.get("tags", []),
                "chartSlots": chart_slots,
                "customVizSlots": cv_slots,
            }
        )
        print(f"ok {path.name} slots={len(tpl['slots'])} surface={tpl['surfaceKind']}")
    index_path = OUT / "index.json"
    index_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"ok index.json templates={len(catalog['templates'])}")


if __name__ == "__main__":
    main()
