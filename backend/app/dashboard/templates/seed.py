from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.dashboard.templates.models import DashboardTemplate
from app.dashboard.templates import presets
from app.dashboard.templates import presets_gov
from app.dashboard.templates.presets_gov_assets import (
    COMMUNITY_THUMB,
    DIGITAL_COCKPIT_THUMB,
    ECO_MONITOR_THUMB,
    EFFICIENCY_THUMB,
    EMERGENCY_THUMB,
    FINANCE_THUMB,
    GRID_THUMB,
    INVESTMENT_THUMB,
    SATISFACTION_THUMB,
    SMART_CITY_THUMB,
    de_thumb,
)
from app.dashboard.templates.presets_official_gallery import build_official_component_gallery_layout


def _gov_template_specs() -> list[dict[str, Any]]:
    """10 套政企风格内置模板（绑定 gov_* 演示库）。"""
    return [
        {
            "id": uuid.UUID("00000000-0000-4000-8001-000000000201"),
            "template_key": "builtin-gov-smart-city",
            "name": "智慧城市运行监测",
            "description": "深色青蓝 HUD 扫描底图 · 毛玻璃组件 · 城市态势地图 · 官方示例数据",
            "category_key": "government",
            "surface_kind": "data-screen",
            "thumbnail_ref": SMART_CITY_THUMB,
            "layout_json": presets_gov.build_gov_smart_city_screen(),
        },
        {
            "id": uuid.UUID("00000000-0000-4000-8001-000000000202"),
            "template_key": "builtin-gov-digital-cockpit",
            "name": "数字政府 KPI 驾驶舱",
            "description": "纸纹水印浅色底图 · 顶栏 KPI 条 · 满意度趋势 · 官方示例数据",
            "category_key": "government",
            "surface_kind": "data-screen",
            "thumbnail_ref": DIGITAL_COCKPIT_THUMB,
            "layout_json": presets_gov.build_gov_digital_cockpit_screen(),
        },
        {
            "id": uuid.UUID("00000000-0000-4000-8001-000000000203"),
            "template_key": "builtin-gov-emergency-command",
            "name": "应急指挥调度中心",
            "description": "深色绯红指挥底图 · 毛玻璃告警带 · 区域态势 · 官方示例数据",
            "category_key": "government",
            "surface_kind": "data-screen",
            "thumbnail_ref": EMERGENCY_THUMB,
            "layout_json": presets_gov.build_gov_emergency_command_screen(),
        },
        {
            "id": uuid.UUID("00000000-0000-4000-8001-000000000204"),
            "template_key": "builtin-gov-eco-monitor",
            "name": "生态环境监测大屏",
            "description": "薄荷丝带浅色底图 · 顶色条卡片 · AQI 趋势 · 官方示例数据",
            "category_key": "government",
            "surface_kind": "data-screen",
            "thumbnail_ref": ECO_MONITOR_THUMB,
            "layout_json": presets_gov.build_gov_eco_monitor_screen(),
        },
        {
            "id": uuid.UUID("00000000-0000-4000-8001-000000000205"),
            "template_key": "builtin-gov-community",
            "name": "社区治理一张图",
            "description": "薰衣草浮层卡片底图 · 网格事件 · 治理热词 · 官方示例数据",
            "category_key": "government",
            "surface_kind": "data-screen",
            "thumbnail_ref": COMMUNITY_THUMB,
            "layout_json": presets_gov.build_gov_community_screen(),
        },
        {
            "id": uuid.UUID("00000000-0000-4000-8001-000000000206"),
            "template_key": "builtin-gov-efficiency",
            "name": "政务效能分析看板",
            "description": "浅灰 #f0f2f5 画布 · 顶行 KPI/仪表 + 柱线双图 · 官方示例数据",
            "category_key": "government",
            "surface_kind": "dashboard",
            "thumbnail_ref": EFFICIENCY_THUMB,
            "layout_json": presets_gov.build_gov_efficiency_dashboard(),
        },
        {
            "id": uuid.UUID("00000000-0000-4000-8001-000000000207"),
            "template_key": "builtin-gov-satisfaction",
            "name": "公共服务满意度",
            "description": "DataEase 风三栏 · 地图 + 饼图 + 明细表 · 官方示例数据",
            "category_key": "government",
            "surface_kind": "dashboard",
            "thumbnail_ref": SATISFACTION_THUMB,
            "layout_json": presets_gov.build_gov_satisfaction_dashboard(),
        },
        {
            "id": uuid.UUID("00000000-0000-4000-8001-000000000208"),
            "template_key": "builtin-gov-finance",
            "name": "财政收支概览",
            "description": "DataEase 风运营布局 · KPI + 地图 + 趋势 + 预算表 · 官方示例数据",
            "category_key": "government",
            "surface_kind": "dashboard",
            "thumbnail_ref": FINANCE_THUMB,
            "layout_json": presets_gov.build_gov_finance_dashboard(),
        },
        {
            "id": uuid.UUID("00000000-0000-4000-8001-000000000209"),
            "template_key": "builtin-gov-investment",
            "name": "招商引资分析",
            "description": "DataEase 风招商看板 · 地图主视觉 + 产业柱图 · 官方示例数据",
            "category_key": "government",
            "surface_kind": "dashboard",
            "thumbnail_ref": INVESTMENT_THUMB,
            "layout_json": presets_gov.build_gov_investment_dashboard(),
        },
        {
            "id": uuid.UUID("00000000-0000-4000-8001-000000000210"),
            "template_key": "builtin-gov-grid",
            "name": "基层网格化管理",
            "description": "DataEase 风网格看板 · 台账表 + 地图 + 分类柱图 · 官方示例数据",
            "category_key": "government",
            "surface_kind": "dashboard",
            "thumbnail_ref": GRID_THUMB,
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
            "description": "青蓝极光深色底图 · 三栏指挥布局 · 地图居中 · 演示 SQL",
            "category_key": "monitoring",
            "surface_kind": "data-screen",
            "thumbnail_ref": "/template-assets/thumbs/screen-command-center.svg",
            "layout_json": presets.build_command_center_layout(),
        },
        {
            "id": uuid.UUID("00000000-0000-4000-8001-000000000003"),
            "template_key": "builtin-screen-tech-blue",
            "name": "科技蓝监控",
            "description": "皇家蓝 HUD 扫描底图 · 核心趋势大图 · 流光边框",
            "category_key": "monitoring",
            "surface_kind": "data-screen",
            "thumbnail_ref": "/template-assets/thumbs/screen-tech-blue.svg",
            "layout_json": presets.build_tech_blue_layout(),
        },
        {
            "id": uuid.UUID("00000000-0000-4000-8001-000000000004"),
            "template_key": "builtin-screen-gov-minimal",
            "name": "政务数据监测",
            "description": "靛蓝蜂巢深色底图 · 地图主视觉 · 两侧指标",
            "category_key": "government",
            "surface_kind": "data-screen",
            "thumbnail_ref": "/template-assets/thumbs/screen-gov-minimal.svg",
            "layout_json": presets.build_gov_minimal_layout(),
        },
        {
            "id": uuid.UUID("00000000-0000-4000-8001-000000000005"),
            "template_key": "builtin-screen-sales-geo",
            "name": "销售地理大屏",
            "description": "翡翠极光底图 · 地图四象限 · v_sales_geo 演示数据",
            "category_key": "analytics",
            "surface_kind": "data-screen",
            "thumbnail_ref": "/template-assets/thumbs/screen-sales-geo.svg",
            "layout_json": presets.build_sales_geo_screen_layout(),
        },
        {
            "id": uuid.UUID("00000000-0000-4000-8001-000000000101"),
            "template_key": "builtin-dash-blank",
            "name": "空白看板",
            "description": "DataEase 风浅灰画布，12 列栅格从零搭建",
            "category_key": "general",
            "surface_kind": "dashboard",
            "thumbnail_ref": de_thumb("dash-blank"),
            "layout_json": presets.build_dash_blank_layout(),
        },
        {
            "id": uuid.UUID("00000000-0000-4000-8001-000000000102"),
            "template_key": "builtin-dash-dual-kpi",
            "name": "双栏 KPI 分析",
            "description": "DataEase 风 · KPI 条 + 渠道柱图 / 销售折线双栏",
            "category_key": "analytics",
            "surface_kind": "dashboard",
            "thumbnail_ref": de_thumb("dash-dual-kpi"),
            "layout_json": presets.build_dual_kpi_layout(),
        },
        {
            "id": uuid.UUID("00000000-0000-4000-8001-000000000103"),
            "template_key": "builtin-dash-triple-analysis",
            "name": "三栏多维分析",
            "description": "DataEase 风三栏 · 地图 + 饼图 + TOP 明细表",
            "category_key": "analytics",
            "surface_kind": "dashboard",
            "thumbnail_ref": de_thumb("dash-triple"),
            "layout_json": presets.build_triple_analysis_layout(),
        },
        {
            "id": uuid.UUID("00000000-0000-4000-8001-000000000104"),
            "template_key": "builtin-dash-ops",
            "name": "运营分析看板",
            "description": "DataEase 风运营看板 · KPI + 地图热力 + 走势 + TOP 表",
            "category_key": "monitoring",
            "surface_kind": "dashboard",
            "thumbnail_ref": de_thumb("dash-ops"),
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


BUILTIN_SEED_CONTENT_REVISION = 24


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
                content_revision=BUILTIN_SEED_CONTENT_REVISION,
            )
            db.add(row)
            upserted += 1
        else:
            user_customized = existing.content_revision > BUILTIN_SEED_CONTENT_REVISION
            if not user_customized:
                existing.name = spec["name"]
                existing.description = spec["description"]
                existing.category_key = spec["category_key"]
                existing.layout_json = spec["layout_json"]
                existing.thumbnail_ref = spec.get("thumbnail_ref")
                existing.content_revision = max(
                    existing.content_revision,
                    BUILTIN_SEED_CONTENT_REVISION,
                )
            existing.status = "published"
            existing.visibility = "builtin"
    db.commit()
    return upserted
