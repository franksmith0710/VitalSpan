from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.dashboard.templates.models import DashboardTemplate
from app.dashboard.templates import presets
from app.dashboard.templates import presets_gov
from app.dashboard.templates.presets_official_gallery import build_official_component_gallery_layout


def _gov_template_specs() -> list[dict[str, Any]]:
    """10 套政企风格内置模板（绑定 gov_* 演示库）。"""
    return [
        {
            "id": uuid.UUID("00000000-0000-4000-8001-000000000201"),
            "template_key": "builtin-gov-smart-city",
            "name": "智慧城市运行监测",
            "description": "城市运行态势地图 + 产业与投资指标 + 问题整改清单",
            "category_key": "government",
            "surface_kind": "data-screen",
            "thumbnail_ref": "/template-assets/thumbs/gov-smart-city.svg",
            "layout_json": presets_gov.build_gov_smart_city_screen(),
        },
        {
            "id": uuid.UUID("00000000-0000-4000-8001-000000000202"),
            "template_key": "builtin-gov-digital-cockpit",
            "name": "数字政府 KPI 驾驶舱",
            "description": "顶栏 KPI + 全宽满意度趋势 + 三栏分析（无地图）",
            "category_key": "government",
            "surface_kind": "data-screen",
            "thumbnail_ref": "/template-assets/thumbs/gov-digital-cockpit.svg",
            "layout_json": presets_gov.build_gov_digital_cockpit_screen(),
        },
        {
            "id": uuid.UUID("00000000-0000-4000-8001-000000000203"),
            "template_key": "builtin-gov-emergency-command",
            "name": "应急指挥调度中心",
            "description": "顶栏实时告警 + 事件分类与区域态势 + 网格待办",
            "category_key": "government",
            "surface_kind": "data-screen",
            "thumbnail_ref": "/template-assets/thumbs/gov-emergency-command.svg",
            "layout_json": presets_gov.build_gov_emergency_command_screen(),
        },
        {
            "id": uuid.UUID("00000000-0000-4000-8001-000000000204"),
            "template_key": "builtin-gov-eco-monitor",
            "name": "生态环境监测大屏",
            "description": "AQI 趋势主视觉 + 水质监测 + 生态问题清单",
            "category_key": "government",
            "surface_kind": "data-screen",
            "thumbnail_ref": "/template-assets/thumbs/gov-eco-monitor.svg",
            "layout_json": presets_gov.build_gov_eco_monitor_screen(),
        },
        {
            "id": uuid.UUID("00000000-0000-4000-8001-000000000205"),
            "template_key": "builtin-gov-community",
            "name": "社区治理一张图",
            "description": "网格事件明细表 + 治理热词 + 满意度走势",
            "category_key": "government",
            "surface_kind": "data-screen",
            "thumbnail_ref": "/template-assets/thumbs/gov-community.svg",
            "layout_json": presets_gov.build_gov_community_screen(),
        },
        {
            "id": uuid.UUID("00000000-0000-4000-8001-000000000206"),
            "template_key": "builtin-gov-efficiency",
            "name": "政务效能分析看板",
            "description": "KPI 条 + 部门柱图 + 满意度趋势",
            "category_key": "government",
            "surface_kind": "dashboard",
            "thumbnail_ref": "/template-assets/thumbs/gov-efficiency.svg",
            "layout_json": presets_gov.build_gov_efficiency_dashboard(),
        },
        {
            "id": uuid.UUID("00000000-0000-4000-8001-000000000207"),
            "template_key": "builtin-gov-satisfaction",
            "name": "公共服务满意度",
            "description": "事件占比 + 部门满意度 + 网格服务表",
            "category_key": "government",
            "surface_kind": "dashboard",
            "thumbnail_ref": "/template-assets/thumbs/gov-satisfaction.svg",
            "layout_json": presets_gov.build_gov_satisfaction_dashboard(),
        },
        {
            "id": uuid.UUID("00000000-0000-4000-8001-000000000208"),
            "template_key": "builtin-gov-finance",
            "name": "财政收支概览",
            "description": "财政支出执行与预算对比，附满意度参考趋势",
            "category_key": "government",
            "surface_kind": "dashboard",
            "thumbnail_ref": "/template-assets/thumbs/gov-finance.svg",
            "layout_json": presets_gov.build_gov_finance_dashboard(),
        },
        {
            "id": uuid.UUID("00000000-0000-4000-8001-000000000209"),
            "template_key": "builtin-gov-investment",
            "name": "招商引资分析",
            "description": "区域产业分布地图 + 重点行业投资柱图",
            "category_key": "government",
            "surface_kind": "dashboard",
            "thumbnail_ref": "/template-assets/thumbs/gov-investment.svg",
            "layout_json": presets_gov.build_gov_investment_dashboard(),
        },
        {
            "id": uuid.UUID("00000000-0000-4000-8001-000000000210"),
            "template_key": "builtin-gov-grid",
            "name": "基层网格化管理",
            "description": "网格事件表 + 区域热力 + 事件分类",
            "category_key": "government",
            "surface_kind": "dashboard",
            "thumbnail_ref": "/template-assets/thumbs/gov-grid.svg",
            "layout_json": presets_gov.build_gov_grid_dashboard(),
        },
    ]


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
        {
            "id": uuid.UUID("00000000-0000-4000-8001-000000000020"),
            "template_key": "builtin-viz-component-gallery",
            "name": "官方组件验收大屏",
            "description": "43 种 chartType 各一 widget，绑定官方演示 SQL 注册表",
            "category_key": "general",
            "surface_kind": "data-screen",
            "thumbnail_ref": "/template-assets/thumbs/screen-blank.svg",
            "layout_json": build_official_component_gallery_layout(),
        },
        *_gov_template_specs(),
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
                content_revision=10,
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
            existing.content_revision = max(existing.content_revision, 10)
    db.commit()
    return upserted
