"""预置官方演示看板/大屏实例（对标 DataEase 示例仪表板）。"""

from __future__ import annotations

import copy
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.dashboard.models import Dashboard
from app.dashboard.preview_summary import sync_surface_kind_column
from app.dashboard.surface_kind import read_surface_kind_from_layout
from app.dashboard.templates.demo_datasource import (
    bind_template_demo_datasources,
    repair_legacy_template_layout,
    resolve_sample_db_datasource_id,
)
from app.dashboard.templates.layout_utils import sanitize_layout_for_template
from app.dashboard.templates.models import DashboardTemplate

DEMO_INSTANCE_SPECS: tuple[dict[str, Any], ...] = (
    {
        "id": uuid.UUID("00000000-0000-4000-8002-000000000001"),
        "slug": "demo-dual-kpi",
        "name": "官方示例 · 双栏 KPI 分析",
        "template_key": "builtin-dash-dual-kpi",
        "surface_kind": "dashboard",
    },
    {
        "id": uuid.UUID("00000000-0000-4000-8002-000000000002"),
        "slug": "demo-command-center",
        "name": "官方示例 · 指挥台三栏",
        "template_key": "builtin-screen-command-center",
        "surface_kind": "data-screen",
    },
    {
        "id": uuid.UUID("00000000-0000-4000-8002-000000000003"),
        "slug": "demo-sales-geo",
        "name": "官方示例 · 销售地理大屏",
        "template_key": "builtin-screen-sales-geo",
        "surface_kind": "data-screen",
    },
)

DEMO_INSTANCE_SLUGS: frozenset[str] = frozenset(spec["slug"] for spec in DEMO_INSTANCE_SPECS)


def _build_demo_layout(template_layout: dict[str, Any], template_key: str) -> dict[str, Any]:
    layout = copy.deepcopy(template_layout)
    layout["demoPackage"] = {"seed": True, "sourceTemplateKey": template_key}
    return layout


def seed_demo_instances(db: Session) -> int:
    """幂等 upsert 官方演示实例；sample_db 或模板缺失时跳过。"""
    demo_ds = resolve_sample_db_datasource_id(db)
    upserted = 0
    for spec in DEMO_INSTANCE_SPECS:
        template = db.scalar(
            select(DashboardTemplate).where(
                DashboardTemplate.template_key == spec["template_key"],
            ),
        )
        if template is None:
            continue
        repaired = repair_legacy_template_layout(
            sanitize_layout_for_template(template.layout_json),
        )
        layout = bind_template_demo_datasources(repaired, demo_ds)
        layout = _build_demo_layout(layout, spec["template_key"])
        surface = read_surface_kind_from_layout(layout) or spec["surface_kind"]
        existing = db.scalar(
            select(Dashboard).where(
                Dashboard.slug == spec["slug"],
                Dashboard.deleted_at.is_(None),
            ),
        )
        if existing is None:
            row = Dashboard(
                id=spec["id"],
                name=spec["name"],
                slug=spec["slug"],
                description="VitalSpan 官方演示包预置实例，绑定示例数据（demo）",
                layout_json=layout,
                surface_kind=surface,
                created_by=None,
            )
            db.add(row)
            upserted += 1
        else:
            existing.name = spec["name"]
            existing.layout_json = layout
            existing.surface_kind = sync_surface_kind_column(layout)
            existing.description = "VitalSpan 官方演示包预置实例，绑定示例数据（demo）"
    db.commit()
    return upserted


def resolve_demo_instance_ids(db: Session) -> list[uuid.UUID]:
    rows = db.scalars(
        select(Dashboard.id).where(
            Dashboard.slug.in_(DEMO_INSTANCE_SLUGS),
            Dashboard.deleted_at.is_(None),
        ),
    ).all()
    return list(rows)
