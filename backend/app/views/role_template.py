from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.auth.deps import UserContext
from app.dashboard.service import get_dashboard, DashboardError
from app.reports.catalog import service as catalog_service
from app.reports.catalog.errors import ReportCatalogError
from app.views.schemas import ViewError
from app.views import store

_USER_ROLE_DEFAULT_SCOPE: dict[str, str] = {}


def set_user_role_default_scope(user_id: str, role_prefix: str) -> None:
    _USER_ROLE_DEFAULT_SCOPE[user_id] = role_prefix


def _normalize_role_key(role_id: str) -> str:
    try:
        return str(uuid.UUID(role_id))
    except ValueError:
        return role_id


def _assert_admin(actor: UserContext) -> None:
    if "admin" not in actor.roles:
        raise ViewError("VIEW_DEFAULT_FORBIDDEN", "Admin role required", 403)


def _assert_read_scope(actor: UserContext, role_id: str) -> None:
    if "enterprise" not in set(actor.roles):
        return
    prefix = _USER_ROLE_DEFAULT_SCOPE.get(actor.id, "role-")
    if not role_id.startswith(prefix):
        raise ViewError("VIEW_DEFAULT_FORBIDDEN", "enterprise user out of role default scope", 403)


def _detect_inherit_cycle(role_id: str, inherit_from: str | None) -> None:
    if not inherit_from:
        return
    seen = {role_id}
    current = inherit_from
    while current:
        if current in seen:
            raise ViewError(
                "VIEW_DEFAULT_ROLE_CYCLE",
                "inheritFromRoleId creates a cycle",
                422,
                [{"field": "inheritFromRoleId", "message": "cycle detected"}],
            )
        seen.add(current)
        stored = store.get_role_defaults(current)
        current = (stored or {}).get("inheritFromRoleId")


def _validate_refs(db: Session, payload: dict[str, Any]) -> None:
    dash_id = payload.get("dashboardId") or payload.get("dashboard_id")
    report_id = payload.get("reportTemplateNodeId") or payload.get("report_template_node_id")
    if dash_id is None and report_id is None:
        raise ViewError("VIEW_DEFAULT_EMPTY", "At least one default reference required", 422)

    if dash_id is not None:
        try:
            get_dashboard(db, uuid.UUID(str(dash_id)))
        except DashboardError:
            raise ViewError("VIEW_DEFAULT_DASHBOARD_NOT_FOUND", "Dashboard not found", 404) from None

    if report_id is not None:
        try:
            node = catalog_service.get_node(uuid.UUID(str(report_id)))
        except ReportCatalogError:
            raise ViewError("VIEW_DEFAULT_REPORT_NOT_FOUND", "Report template not found", 404) from None
        if node.node_type != "template":
            raise ViewError("VIEW_DEFAULT_REPORT_NOT_FOUND", "Report template not found", 404)


def get_defaults(role_id: str, actor: UserContext | None = None) -> dict[str, Any]:
    if actor is not None:
        _assert_read_scope(actor, role_id)
    key = _normalize_role_key(role_id)
    stored = store.get_role_defaults(key)
    if stored is None:
        return {"dashboardId": None, "reportTemplateNodeId": None, "maxWidgetCount": 24}
    return {
        "dashboardId": stored.get("dashboardId"),
        "reportTemplateNodeId": stored.get("reportTemplateNodeId"),
        "maxWidgetCount": stored.get("maxWidgetCount", 24),
        "inheritFromRoleId": stored.get("inheritFromRoleId"),
    }


_MIN_WIDGETS = 1
_MAX_WIDGETS = 64


def _assert_widget_bounds(max_widgets: int) -> None:
    if max_widgets < _MIN_WIDGETS or max_widgets > _MAX_WIDGETS:
        raise ViewError(
            "VIEW_DEFAULT_OUT_OF_BOUNDS",
            f"maxWidgetCount must be between {_MIN_WIDGETS} and {_MAX_WIDGETS}",
            422,
            [{"field": "maxWidgetCount", "message": "out of bounds"}],
        )


def put_defaults(db: Session, role_id: str, payload: dict[str, Any], actor: UserContext) -> dict[str, Any]:
    _assert_admin(actor)
    max_widgets = int(payload.get("maxWidgetCount", 24))
    _assert_widget_bounds(max_widgets)
    inherit = payload.get("inheritFromRoleId")
    key = _normalize_role_key(role_id)
    _detect_inherit_cycle(key, inherit)
    body = {
        "dashboardId": payload.get("dashboardId"),
        "reportTemplateNodeId": payload.get("reportTemplateNodeId"),
        "maxWidgetCount": max_widgets,
        "inheritFromRoleId": inherit,
    }
    _validate_refs(db, body)
    return store.set_role_defaults(key, body)


def resolve_defaults_for_roles(role_codes: list[str]) -> dict[str, Any]:
    for code in role_codes:
        stored = store.get_role_defaults(code)
        if stored is not None:
            return {
                "dashboardId": stored.get("dashboardId"),
                "reportTemplateNodeId": stored.get("reportTemplateNodeId"),
                "maxWidgetCount": stored.get("maxWidgetCount", 24),
            }
    return {"dashboardId": None, "reportTemplateNodeId": None, "maxWidgetCount": 24}
