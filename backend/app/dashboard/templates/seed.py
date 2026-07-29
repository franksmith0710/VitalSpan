from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.dashboard.templates.models import DashboardTemplate
from app.dashboard.templates import presets


def _builtin_template_specs() -> list[dict[str, Any]]:
    return [
        {
            "id": uuid.UUID("00000000-0000-4000-8001-000000000001"),
            "template_key": "builtin-screen-blank",
            "name": "空白大屏",
            "description": "1920×1080 深色渐变画布，从零搭建",
            "category_key": "general",
            "surface_kind": "data-screen",
            "thumbnail_ref": "/template-assets/thumbs/screen-blank.svg",
            "layout_json": presets.build_screen_blank_layout(),
        },
        {
            "id": uuid.UUID("00000000-0000-4000-8001-000000000002"),
            "template_key": "builtin-screen-command-center",
            "name": "指挥台三栏",
            "description": "标题装饰 + 地图居中 + 三栏图表，含演示库 SQL",
            "category_key": "monitoring",
            "surface_kind": "data-screen",
            "thumbnail_ref": "/template-assets/thumbs/screen-command-center.svg",
            "layout_json": presets.build_command_center_layout(),
        },
        {
            "id": uuid.UUID("00000000-0000-4000-8001-000000000003"),
            "template_key": "builtin-screen-tech-blue",
            "name": "科技蓝监控",
            "description": "科技蓝渐变底图 + 流光边框 + 核心趋势大图",
            "category_key": "monitoring",
            "surface_kind": "data-screen",
            "thumbnail_ref": "/template-assets/thumbs/screen-tech-blue.svg",
            "layout_json": presets.build_tech_blue_layout(),
        },
        {
            "id": uuid.UUID("00000000-0000-4000-8001-000000000004"),
            "template_key": "builtin-screen-gov-minimal",
            "name": "政务数据监测",
            "description": "政务靛蓝风格 + 地图主视觉 + 两侧指标",
            "category_key": "government",
            "surface_kind": "data-screen",
            "thumbnail_ref": "/template-assets/thumbs/screen-gov-minimal.svg",
            "layout_json": presets.build_gov_minimal_layout(),
        },
        {
            "id": uuid.UUID("00000000-0000-4000-8001-000000000005"),
            "template_key": "builtin-screen-sales-geo",
            "name": "销售地理大屏",
            "description": "地图居中四象限指标，绑定 v_sales_geo 演示数据",
            "category_key": "analytics",
            "surface_kind": "data-screen",
            "thumbnail_ref": "/template-assets/thumbs/screen-sales-geo.svg",
            "layout_json": presets.build_sales_geo_screen_layout(),
        },
        {
            "id": uuid.UUID("00000000-0000-4000-8001-000000000101"),
            "template_key": "builtin-dash-blank",
            "name": "空白看板",
            "description": "点阵装饰浅色画布，12 列栅格从零搭建",
            "category_key": "general",
            "surface_kind": "dashboard",
            "thumbnail_ref": "/template-assets/thumbs/dash-blank.svg",
            "layout_json": presets.build_dash_blank_layout(),
        },
        {
            "id": uuid.UUID("00000000-0000-4000-8001-000000000102"),
            "template_key": "builtin-dash-dual-kpi",
            "name": "双栏 KPI 分析",
            "description": "KPI 条 + 渠道柱图 / 趋势折线，演示库即开即用",
            "category_key": "analytics",
            "surface_kind": "dashboard",
            "thumbnail_ref": "/template-assets/thumbs/dash-dual-kpi.svg",
            "layout_json": presets.build_dual_kpi_layout(),
        },
        {
            "id": uuid.UUID("00000000-0000-4000-8001-000000000103"),
            "template_key": "builtin-dash-triple-analysis",
            "name": "三栏多维分析",
            "description": "地图 + 饼图 + 明细表，适合区域经营分析",
            "category_key": "analytics",
            "surface_kind": "dashboard",
            "thumbnail_ref": "/template-assets/thumbs/dash-triple-analysis.svg",
            "layout_json": presets.build_triple_analysis_layout(),
        },
        {
            "id": uuid.UUID("00000000-0000-4000-8001-000000000104"),
            "template_key": "builtin-dash-ops",
            "name": "运营分析看板",
            "description": "KPI + 地图热力 + 走势 + 城市 TOP 表",
            "category_key": "monitoring",
            "surface_kind": "dashboard",
            "thumbnail_ref": "/template-assets/thumbs/dash-ops.svg",
            "layout_json": presets.build_ops_dashboard_layout(),
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
                thumbnail_ref=spec.get("thumbnail_ref"),
                visibility="builtin",
                content_revision=5,
            )
            db.add(row)
            upserted += 1
        else:
            existing.name = spec["name"]
            existing.description = spec["description"]
            existing.category_key = spec["category_key"]
            existing.layout_json = spec["layout_json"]
            existing.thumbnail_ref = spec.get("thumbnail_ref")
            existing.status = "published"
            existing.visibility = "builtin"
            existing.content_revision = max(existing.content_revision, 5)
    db.commit()
    return upserted
