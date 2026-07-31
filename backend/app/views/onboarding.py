from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.auth.deps import UserContext
from app.dashboard.service import DashboardError, get_dashboard
from app.views import store
from app.views.role_template import resolve_inherited_defaults
from app.views.validate import validate_dashboard_view


def apply_first_login_inherit(
    db: Session,
    user_id: str,
    role_codes: list[str],
) -> dict[str, Any] | None:
    """Create a user override from role default on first access when user has no views."""
    if store.list_user_overrides(user_id):
        return None
    defaults = resolve_inherited_defaults(db, role_codes)
    dash_id = defaults.get("dashboardId")
    if not dash_id:
        return None
    try:
        dashboard = get_dashboard(db, uuid.UUID(str(dash_id)))
    except DashboardError as exc:
        if exc.code == "DASH_NOT_FOUND":
            return None
        raise
    layout = dashboard.layout_json
    payload = {
        "name": "默认",
        "dashboardId": str(dash_id),
        "layout": layout,
    }
    validate_dashboard_view(
        {
            "name": payload["name"],
            "protocolVersion": 1,
            "dashboardId": payload["dashboardId"],
            "layout": layout,
        },
    )
    item = {
        "id": str(uuid.uuid4()),
        "name": payload["name"],
        "dashboardId": payload["dashboardId"],
        "layout": layout,
        "classificationScope": None,
        "inheritedFromRole": True,
        "isDefault": True,
    }
    store.add_user_override(user_id, item)
    return item


def inherit_for_actor(db: Session, actor: UserContext) -> dict[str, Any] | None:
    return apply_first_login_inherit(db, actor.id, list(actor.roles))
