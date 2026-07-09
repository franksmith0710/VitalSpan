from __future__ import annotations

import re
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.dashboard.models import Dashboard
from app.dashboard.schemas import (
    DashboardCreate,
    DashboardLayout,
    DashboardListResponse,
    DashboardOut,
    DashboardUpdate,
)
from app.schemas.chart_view import ChartViewError

DEFAULT_LAYOUT_JSON: dict[str, Any] = {"version": 1, "widgets": [], "globalFilters": []}


class DashboardError(Exception):
    def __init__(self, code: str, message: str, status: int = 400) -> None:
        self.code = code
        self.message = message
        self.status = status
        super().__init__(message)


def _slugify(name: str) -> str:
    s = re.sub(r"[^\w\s-]", "", name.strip().lower())
    s = re.sub(r"[\s_-]+", "-", s).strip("-")
    return (s or "dashboard")[:64]


def _active(stmt):
    return stmt.where(Dashboard.deleted_at.is_(None))


def _to_out(row: Dashboard) -> DashboardOut:
    return DashboardOut(
        id=row.id,
        name=row.name,
        slug=row.slug,
        description=row.description,
        layout_json=row.layout_json,
        created_by=row.created_by,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _validate_layout_business(parsed: DashboardLayout) -> None:
    seen: set[str] = set()
    for widget in parsed.widgets:
        wid = str(widget.id)
        if wid in seen:
            raise DashboardError("DASH_DUPLICATE_WIDGET", "组件 ID 重复", 422)
        seen.add(wid)
        if widget.type == "chart":
            if widget.chart_config is None:
                raise DashboardError("DASH_MISSING_CHART_CONFIG", "图表组件缺少 chartConfig", 422)
            cfg = widget.chart_config
            if cfg.chart_id is not None and str(cfg.chart_id) != wid:
                raise DashboardError("DASH_CHART_ID_MISMATCH", "chartId 与组件 ID 不一致", 422)


def _normalize_widget_orders(widgets: list) -> list:
    ordered = sorted(widgets, key=lambda w: w.order)
    for i, w in enumerate(ordered):
        w.order = i
    return ordered


def validate_layout(layout: dict[str, Any]) -> dict[str, Any]:
    from app.views.validate import validate_layout_dict

    return validate_layout_dict(layout)


def list_dashboards(db: Session, *, limit: int = 50, offset: int = 0) -> DashboardListResponse:
    total = db.scalar(select(func.count()).select_from(Dashboard).where(Dashboard.deleted_at.is_(None))) or 0
    rows = db.scalars(
        _active(select(Dashboard).order_by(Dashboard.updated_at.desc()).limit(limit).offset(offset)),
    ).all()
    return DashboardListResponse(
        items=[_to_out(row) for row in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


def create_dashboard(
    db: Session,
    payload: DashboardCreate | None = None,
    *,
    name: str | None = None,
    slug: str | None = None,
    description: str | None = None,
    created_by: uuid.UUID | None = None,
) -> DashboardOut:
    if payload is not None:
        name = payload.name
        slug = payload.slug or _slugify(payload.name)
        description = payload.description
    if name is None:
        raise DashboardError("DASH_INVALID", "name is required", 422)
    resolved_slug = slug or _slugify(name)
    row = Dashboard(
        name=name,
        slug=resolved_slug,
        description=description,
        layout_json=dict(DEFAULT_LAYOUT_JSON),
        created_by=created_by,
    )
    db.add(row)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise DashboardError("DASH_SLUG_CONFLICT", f"Slug already exists: {resolved_slug}", 409) from exc
    db.refresh(row)
    return _to_out(row)


def get_dashboard(db: Session, dashboard_id: uuid.UUID) -> DashboardOut:
    row = db.scalar(_active(select(Dashboard).where(Dashboard.id == dashboard_id)))
    if row is None:
        raise DashboardError("DASH_NOT_FOUND", "Dashboard not found", 404)
    return _to_out(row)


def update_dashboard(db: Session, dashboard_id: uuid.UUID, payload: DashboardUpdate) -> DashboardOut:
    row = db.scalar(_active(select(Dashboard).where(Dashboard.id == dashboard_id)))
    if row is None:
        raise DashboardError("DASH_NOT_FOUND", "Dashboard not found", 404)
    if payload.name is not None:
        row.name = payload.name
    if payload.description is not None:
        row.description = payload.description
    db.commit()
    db.refresh(row)
    return _to_out(row)


def delete_dashboard(db: Session, dashboard_id: uuid.UUID) -> None:
    row = db.scalar(_active(select(Dashboard).where(Dashboard.id == dashboard_id)))
    if row is None:
        raise DashboardError("DASH_NOT_FOUND", "Dashboard not found", 404)
    row.deleted_at = datetime.now(UTC)
    db.commit()


def update_layout(db: Session, dashboard_id: uuid.UUID, layout_json: dict[str, Any]) -> DashboardOut:
    row = db.scalar(_active(select(Dashboard).where(Dashboard.id == dashboard_id)))
    if row is None:
        raise DashboardError("DASH_NOT_FOUND", "Dashboard not found", 404)
    from app.views.adapter import dashboard_layout_to_view
    from app.views.schemas import ViewError
    from app.views.validate import validate_dashboard_view

    try:
        view = validate_dashboard_view(
            dashboard_layout_to_view(
                dashboard_id=dashboard_id,
                name=row.name,
                layout_json=layout_json,
            ),
        )
        validated = view.layout.model_dump(by_alias=True, mode="json")
    except ViewError as exc:
        raise DashboardError(exc.code, exc.message, exc.status) from exc
    except DashboardError:
        raise
    except ChartViewError as exc:
        raise DashboardError("DASH_INVALID_LAYOUT", exc.message, 422) from exc
    except Exception as exc:
        raise DashboardError("DASH_INVALID_LAYOUT", "Invalid layout JSON", 422) from exc
    row.layout_json = validated
    db.commit()
    db.refresh(row)
    return _to_out(row)
