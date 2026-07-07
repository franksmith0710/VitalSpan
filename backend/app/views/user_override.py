from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.auth.deps import UserContext
from app.dashboard.service import DashboardError, get_dashboard
from app.views import store
from app.views.role_template import resolve_defaults_for_roles
from app.views.schemas import ViewError
from app.views.validate import validate_dashboard_view

_CLASSIFICATION_ALLOWLIST = frozenset({"CAT-01", "CAT-02", "CAT-03"})


def _widget_count(layout: dict[str, Any]) -> int:
    if "widgetCount" in layout:
        return int(layout["widgetCount"])
    return len(layout.get("widgets") or [])


def list_overrides(user_id: str) -> dict[str, Any]:
    return {"items": store.list_user_overrides(user_id)}


def get_override(user_id: str, view_id: str) -> dict[str, Any]:
    for item in store.list_user_overrides(user_id):
        if item.get("id") == view_id:
            return item
    raise ViewError("VIEW_OVERRIDE_NOT_FOUND", "View override not found", 404)


def create_override(db: Session, actor: UserContext, payload: dict[str, Any]) -> dict[str, Any]:
    name = payload.get("name")
    user_id = actor.id
    if not name and not store.list_user_overrides(user_id):
        name = "默认"
    if not name:
        name = payload["name"]
    for existing in store.list_user_overrides(user_id):
        if existing.get("name") == name:
            raise ViewError("VIEW_OVERRIDE_CONFLICT", "View name already exists", 409)

    scope = payload.get("classificationScope")
    if scope and scope not in _CLASSIFICATION_ALLOWLIST:
        raise ViewError(
            "VIEW_OVERRIDE_CLASSIFICATION_DENIED",
            "Classification scope not allowed",
            422,
        )

    try:
        get_dashboard(db, uuid.UUID(str(payload["dashboardId"])))
    except DashboardError:
        raise ViewError("VIEW_OVERRIDE_DASHBOARD_NOT_FOUND", "Dashboard not found", 404) from None

    bounds = resolve_defaults_for_roles(list(actor.roles))
    layout = payload.get("layout") or {}
    if _widget_count(layout) > int(bounds.get("maxWidgetCount", 24)):
        raise ViewError("VIEW_OVERRIDE_OUT_OF_BOUNDS", "Widget count exceeds role default", 422)

    view_payload = {
        "name": name,
        "dashboardId": str(payload["dashboardId"]),
        "layout": layout,
    }
    try:
        validate_dashboard_view(view_payload)
    except ViewError:
        raise

    item = {
        "id": str(uuid.uuid4()),
        "name": name,
        "dashboardId": str(payload["dashboardId"]),
        "layout": layout,
        "classificationScope": scope,
    }
    return store.add_user_override(user_id, item)


def _validate_override_payload(db: Session, actor: UserContext, payload: dict[str, Any], *, exclude_id: str | None = None) -> None:
    name = payload.get("name")
    if name:
        for existing in store.list_user_overrides(actor.id):
            if existing.get("id") == exclude_id:
                continue
            if existing.get("name") == name:
                raise ViewError("VIEW_OVERRIDE_CONFLICT", "View name already exists", 409)

    scope = payload.get("classificationScope")
    if scope and scope not in _CLASSIFICATION_ALLOWLIST:
        raise ViewError(
            "VIEW_OVERRIDE_CLASSIFICATION_DENIED",
            "Classification scope not allowed",
            422,
        )

    dashboard_id = payload.get("dashboardId")
    if dashboard_id is not None:
        try:
            get_dashboard(db, uuid.UUID(str(dashboard_id)))
        except DashboardError:
            raise ViewError("VIEW_OVERRIDE_DASHBOARD_NOT_FOUND", "Dashboard not found", 404) from None

    bounds = resolve_defaults_for_roles(list(actor.roles))
    layout = payload.get("layout") or {}
    if _widget_count(layout) > int(bounds.get("maxWidgetCount", 24)):
        raise ViewError("VIEW_OVERRIDE_OUT_OF_BOUNDS", "Widget count exceeds role default", 422)


def update_override(db: Session, actor: UserContext, view_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    existing = get_override(actor.id, view_id)
    merged = {**existing, **payload, "id": view_id}
    _validate_override_payload(db, actor, merged, exclude_id=view_id)
    view_payload = {
        "name": merged["name"],
        "dashboardId": str(merged["dashboardId"]),
        "layout": merged.get("layout") or {},
    }
    try:
        validate_dashboard_view(view_payload)
    except ViewError:
        raise
    patch = {
        "name": merged["name"],
        "dashboardId": str(merged["dashboardId"]),
        "layout": merged.get("layout") or {},
    }
    if "classificationScope" in payload:
        patch["classificationScope"] = payload.get("classificationScope")
    try:
        return store.update_user_override(actor.id, view_id, patch)
    except KeyError:
        raise ViewError("VIEW_OVERRIDE_NOT_FOUND", "View override not found", 404) from None


def delete_override(actor: UserContext, view_id: str) -> None:
    try:
        store.remove_user_override(actor.id, view_id)
    except KeyError:
        raise ViewError("VIEW_OVERRIDE_NOT_FOUND", "View override not found", 404) from None
