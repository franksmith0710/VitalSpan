"""内置模板演示数据源绑定（sample_db / demo-mysql）。"""

from __future__ import annotations

import copy
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.datasources.models import DataSource
from app.viz.migrate_chart_types import migrate_layout_chart_configs

TEMPLATE_DEMO_DATASOURCE_REF = "__demo:sample_db__"


def resolve_sample_db_datasource_id(db: Session) -> uuid.UUID | None:
    rows = db.scalars(select(DataSource).where(DataSource.deleted_at.is_(None))).all()
    best_score = 0
    best_id: uuid.UUID | None = None
    for row in rows:
        hay = f"{row.code} {row.name} {row.database}".lower()
        score = 0
        if "sample_db" in hay:
            score = 3
        elif "sample-mysql" in hay or "demo-mysql" in hay:
            score = 2
        elif "sample" in hay:
            score = 1
        if score > best_score:
            best_score = score
            best_id = row.id
    return best_id


def repair_legacy_template_layout(layout: dict[str, Any]) -> dict[str, Any]:
    """修复存量内置模板中的非法 styleConfig / 演示数据源占位。"""
    cloned = copy.deepcopy(layout)
    style = cloned.get("styleConfig")
    if isinstance(style, dict):
        if style.get("gapPreset") == "comfortable":
            style["gapPreset"] = "md"
        chart_style = style.pop("chartStyle", None)
        if chart_style and "chartLabelStyle" not in style:
            label_color = chart_style.get("labelColor") or chart_style.get("color")
            if label_color:
                style["chartLabelStyle"] = {"color": label_color}
        style.pop("gap", None)
        style.pop("padding", None)

    widgets = cloned.get("widgets")
    if not isinstance(widgets, list):
        return cloned
    for widget in widgets:
        if not isinstance(widget, dict) or widget.get("type") != "chart":
            continue
        chart_cfg = widget.get("chartConfig")
        if not isinstance(chart_cfg, dict):
            continue
        if chart_cfg.get("dataSourceId") == TEMPLATE_DEMO_DATASOURCE_REF:
            chart_cfg.pop("dataSourceId", None)
    return migrate_layout_chart_configs(cloned)


def layout_requires_demo_datasource(layout: dict[str, Any]) -> bool:
    widgets = layout.get("widgets")
    if not isinstance(widgets, list):
        return False
    for widget in widgets:
        if not isinstance(widget, dict) or widget.get("type") != "chart":
            continue
        chart_cfg = widget.get("chartConfig")
        if not isinstance(chart_cfg, dict):
            continue
        if chart_cfg.get("bindingId"):
            continue
        if chart_cfg.get("mode") in ("sql", "table", None):
            return True
    return False


def bind_template_demo_datasources(
    layout: dict[str, Any],
    datasource_id: uuid.UUID | None,
) -> dict[str, Any]:
    if datasource_id is None:
        return layout
    cloned = copy.deepcopy(layout)
    widgets = cloned.get("widgets")
    if not isinstance(widgets, list):
        return cloned
    ds = str(datasource_id)
    for widget in widgets:
        if not isinstance(widget, dict) or widget.get("type") != "chart":
            continue
        chart_cfg = widget.get("chartConfig")
        if not isinstance(chart_cfg, dict):
            continue
        current = chart_cfg.get("dataSourceId")
        if current in (None, "", TEMPLATE_DEMO_DATASOURCE_REF):
            chart_cfg["dataSourceId"] = ds
    return cloned
