from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.auth.deps import UserContext
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


def create_override(db: Session, actor: UserContext, payload: dict[str, Any]) -> dict[str, Any]:
    name = payload["name"]
    user_id = actor.id
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
