from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.dashboard.templates.models import DashboardTemplate


def _wid() -> str:
    return str(uuid.uuid4())


def _screen_base() -> dict[str, Any]:
    return {
        "version": 2,
        "canvas": {"width": 1920, "height": 1080},
        "globalFilters": [],
        "styleConfig": {
            "surfaceKind": "data-screen",
            "colorScheme": "dark",
            "canvasBackground": "#0b1220",
            "themeAccent": "#22d3ee",
        },
    }


def _build_command_center_layout() -> dict[str, Any]:
    w1, w2, w3, w4 = _wid(), _wid(), _wid(), _wid()
    return {
        **_screen_base(),
        "widgets": [
            {
                "id": w1,
                "type": "text",
                "title": "主标题",
                "x": 520,
                "y": 20,
                "width": 880,
                "height": 56,
                "order": 0,
                "textConfig": {
                    "content": "<p style='text-align:center;font-size:34px;color:#e2e8f0'>指挥调度中心</p>",
                    "variant": "html",
                },
            },
            {
                "id": w2,
                "type": "chart",
                "title": "左栏",
                "x": 64,
                "y": 120,
                "width": 560,
                "height": 420,
                "order": 1,
                "chartConfig": {"chartType": "bar", "mode": "sql", "chartId": w2},
            },
            {
                "id": w3,
                "type": "chart",
                "title": "中栏",
                "x": 680,
                "y": 120,
                "width": 560,
                "height": 420,
                "order": 2,
                "chartConfig": {"chartType": "line", "mode": "sql", "chartId": w3},
            },
            {
                "id": w4,
                "type": "chart",
                "title": "右栏",
                "x": 1296,
                "y": 120,
                "width": 560,
                "height": 420,
                "order": 3,
                "chartConfig": {"chartType": "pie", "mode": "sql", "chartId": w4},
            },
        ],
    }


def _build_tech_blue_layout() -> dict[str, Any]:
    w1, w2 = _wid(), _wid()
    return {
        **_screen_base(),
        "widgets": [
            {
                "id": w1,
                "type": "text",
                "title": "主标题",
                "x": 520,
                "y": 32,
                "width": 880,
                "height": 64,
                "order": 0,
                "textConfig": {
                    "content": "<p style='text-align:center;font-size:32px;color:#67e8f9'>科技蓝监控大屏</p>",
                    "variant": "html",
                },
            },
            {
                "id": w2,
                "type": "chart",
                "title": "核心指标",
                "x": 120,
                "y": 140,
                "width": 1680,
                "height": 860,
                "order": 1,
                "chartConfig": {"chartType": "line", "mode": "sql", "chartId": w2},
            },
        ],
    }


def _build_gov_minimal_layout() -> dict[str, Any]:
    w1 = _wid()
    return {
        **_screen_base(),
        "widgets": [
            {
                "id": w1,
                "type": "text",
                "title": "主标题",
                "x": 460,
                "y": 48,
                "width": 1000,
                "height": 80,
                "order": 0,
                "textConfig": {
                    "content": "<p style='text-align:center;font-size:30px;color:#f8fafc'>政务数据运行监测</p>",
                    "variant": "html",
                },
            },
        ],
    }


def _dash_base() -> dict[str, Any]:
    return {"version": 1, "globalFilters": [], "styleConfig": {"surfaceKind": "dashboard"}}


def _build_dual_kpi_layout() -> dict[str, Any]:
    w1, w2 = _wid(), _wid()
    return {
        **_dash_base(),
        "widgets": [
            {
                "id": w1,
                "type": "chart",
                "title": "指标 A",
                "colSpan": 6,
                "rowSpan": 4,
                "gridX": 0,
                "gridY": 0,
                "order": 0,
                "chartConfig": {"chartType": "bar", "mode": "sql", "chartId": w1},
            },
            {
                "id": w2,
                "type": "chart",
                "title": "指标 B",
                "colSpan": 6,
                "rowSpan": 4,
                "gridX": 6,
                "gridY": 0,
                "order": 1,
                "chartConfig": {"chartType": "line", "mode": "sql", "chartId": w2},
            },
        ],
    }


def _build_triple_analysis_layout() -> dict[str, Any]:
    w1, w2, w3 = _wid(), _wid(), _wid()
    return {
        **_dash_base(),
        "widgets": [
            {
                "id": w1,
                "type": "chart",
                "title": "趋势",
                "colSpan": 4,
                "rowSpan": 4,
                "gridX": 0,
                "gridY": 0,
                "order": 0,
                "chartConfig": {"chartType": "line", "mode": "sql", "chartId": w1},
            },
            {
                "id": w2,
                "type": "chart",
                "title": "结构",
                "colSpan": 4,
                "rowSpan": 4,
                "gridX": 4,
                "gridY": 0,
                "order": 1,
                "chartConfig": {"chartType": "pie", "mode": "sql", "chartId": w2},
            },
            {
                "id": w3,
                "type": "chart",
                "title": "明细",
                "colSpan": 4,
                "rowSpan": 4,
                "gridX": 8,
                "gridY": 0,
                "order": 2,
                "chartConfig": {"chartType": "table", "mode": "sql", "chartId": w3},
            },
        ],
    }


def _builtin_template_specs() -> list[dict[str, Any]]:
    return [
        {
            "id": uuid.UUID("00000000-0000-4000-8001-000000000001"),
            "template_key": "builtin-screen-blank",
            "name": "空白大屏",
            "description": "1920×1080 深色画布，从零搭建",
            "category_key": "general",
            "surface_kind": "data-screen",
            "layout_json": {
                "version": 2,
                "canvas": {"width": 1920, "height": 1080},
                "widgets": [],
                "globalFilters": [],
                "styleConfig": {"surfaceKind": "data-screen", "colorScheme": "dark"},
            },
        },
        {
            "id": uuid.UUID("00000000-0000-4000-8001-000000000002"),
            "template_key": "builtin-screen-command-center",
            "name": "指挥台三栏",
            "description": "标题 + 三栏图表示意位",
            "category_key": "monitoring",
            "surface_kind": "data-screen",
            "layout_json": _build_command_center_layout(),
        },
        {
            "id": uuid.UUID("00000000-0000-4000-8001-000000000003"),
            "template_key": "builtin-screen-tech-blue",
            "name": "科技蓝",
            "description": "标题 + 边框 + 时钟，适合监控墙",
            "category_key": "monitoring",
            "surface_kind": "data-screen",
            "layout_json": _build_tech_blue_layout(),
        },
        {
            "id": uuid.UUID("00000000-0000-4000-8001-000000000004"),
            "template_key": "builtin-screen-gov-minimal",
            "name": "政务简约",
            "description": "居中标题与装饰边框，留白充足",
            "category_key": "government",
            "surface_kind": "data-screen",
            "layout_json": _build_gov_minimal_layout(),
        },
        {
            "id": uuid.UUID("00000000-0000-4000-8001-000000000101"),
            "template_key": "builtin-dash-blank",
            "name": "空白看板",
            "description": "12 列栅格画布，从零搭建",
            "category_key": "general",
            "surface_kind": "dashboard",
            "layout_json": {
                "version": 1,
                "widgets": [],
                "globalFilters": [],
                "styleConfig": {"surfaceKind": "dashboard"},
            },
        },
        {
            "id": uuid.UUID("00000000-0000-4000-8001-000000000102"),
            "template_key": "builtin-dash-dual-kpi",
            "name": "双栏 KPI",
            "description": "左右两栏图表占位，适合核心指标对比",
            "category_key": "analytics",
            "surface_kind": "dashboard",
            "layout_json": _build_dual_kpi_layout(),
        },
        {
            "id": uuid.UUID("00000000-0000-4000-8001-000000000103"),
            "template_key": "builtin-dash-triple-analysis",
            "name": "三栏分析",
            "description": "三列图表占位，适合多维分析看板",
            "category_key": "analytics",
            "surface_kind": "dashboard",
            "layout_json": _build_triple_analysis_layout(),
        },
    ]


def seed_builtin_dashboard_templates(db: Session) -> int:
    upserted = 0
    for spec in _builtin_template_specs():
        existing = db.scalar(
            select(DashboardTemplate).where(
                DashboardTemplate.template_key == spec["template_key"],
            ),
        )
        if existing is None:
            row = DashboardTemplate(
                id=spec["id"],
                template_key=spec["template_key"],
                name=spec["name"],
                description=spec["description"],
                category_key=spec["category_key"],
                surface_kind=spec["surface_kind"],
                status="published",
                layout_json=spec["layout_json"],
                visibility="builtin",
                content_revision=1,
            )
            db.add(row)
            upserted += 1
        else:
            existing.name = spec["name"]
            existing.description = spec["description"]
            existing.category_key = spec["category_key"]
            existing.layout_json = spec["layout_json"]
            existing.status = "published"
            existing.visibility = "builtin"
    db.commit()
    return upserted
