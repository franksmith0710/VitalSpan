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
            slot("chart", "趋势分析", 48, 200, 900, 320),
            slot("chart", "结构占比", 972, 200, 900, 320),
            slot("chart", "区域对比", 48, 556, 900, 320),
            slot("chart", "多维雷达", 972, 556, 900, 320),
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
    catalog = {"version": 1, "description": "DeepTalk compose 排布样例（大屏 + 仪表板）", "templates": []}
    for tpl in ALL_TEMPLATES:
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
