from __future__ import annotations

import uuid

from app.auth.deps import UserContext
from app.reports.catalog.acl import _NODE_OWNERS
from app.reports.scheduler.errors import ScheduleError


def _is_owner(actor: UserContext, catalog_node_id: uuid.UUID) -> bool:
    return _NODE_OWNERS.get(catalog_node_id) == actor.id


def assert_schedule_read(actor: UserContext, row: dict) -> None:
    roles = set(actor.roles)
    if roles.intersection({"admin", "viewer", "editor", "owner", "analyst"}):
        if "admin" in roles or "viewer" in roles:
            return
        if _is_owner(actor, row["catalog_node_id"]):
            return
        if "editor" in roles:
            return
    raise ScheduleError("RPT_SCHEDULE_FORBIDDEN", "Schedule read denied", 403)


def assert_schedule_write(actor: UserContext, row: dict, action: str) -> None:
    roles = set(actor.roles)
    if "admin" in roles:
        return
    if "viewer" in roles:
        raise ScheduleError("RPT_SCHEDULE_FORBIDDEN", f"Viewer cannot {action}", 403)
    if _is_owner(actor, row["catalog_node_id"]):
        return
    raise ScheduleError("RPT_SCHEDULE_FORBIDDEN", f"Schedule {action} denied", 403)
