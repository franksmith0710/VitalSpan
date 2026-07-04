from __future__ import annotations

import re
import uuid

from app.reports.catalog import service as catalog_service
from app.reports.catalog.errors import ReportCatalogError
from app.reports.scheduler.errors import ScheduleError
from app.reports.scheduler.schemas import ScheduleCreate, ScheduleStatusOut

_ALLOWED: dict[str, frozenset[str]] = {
    "draft": frozenset({"schedule"}),
    "scheduled": frozenset({"pause", "cancel"}),
    "paused": frozenset({"resume", "cancel"}),
    "cancelled": frozenset(),
}
_TRANSITIONS: dict[str, dict[str, str]] = {
    "draft": {"schedule": "scheduled"},
    "scheduled": {"pause": "paused", "cancel": "cancelled"},
    "paused": {"resume": "scheduled", "cancel": "cancelled"},
}
_CRON_PART = re.compile(r"^[\d*,\-]+$")
_schedules: dict[uuid.UUID, dict] = {}


def _validate_cron(cron: str) -> None:
    parts = cron.split()
    if len(parts) != 5 or not all(_CRON_PART.match(p) for p in parts):
        raise ScheduleError("RPT_SCHEDULE_INVALID_CRON", "Invalid cron expression", 422)


def _out(row: dict) -> ScheduleStatusOut:
    return ScheduleStatusOut(
        id=row["id"],
        catalogNodeId=row["catalog_node_id"],
        cron=row["cron"],
        timezone=row["timezone"],
        status=row["status"],
        allowedActions=sorted(_ALLOWED.get(row["status"], frozenset())),
    )


def create_schedule(payload: ScheduleCreate) -> ScheduleStatusOut:
    if not catalog_service.node_exists(payload.catalog_node_id):
        raise ReportCatalogError("RPT_CATALOG_NODE_NOT_FOUND", "Catalog node not found", 404)
    _validate_cron(payload.cron)
    schedule_id = uuid.uuid4()
    row = {
        "id": schedule_id,
        "catalog_node_id": payload.catalog_node_id,
        "cron": payload.cron,
        "timezone": payload.timezone,
        "status": "draft",
    }
    _schedules[schedule_id] = row
    return _out(row)


def get_schedule(schedule_id: uuid.UUID) -> ScheduleStatusOut:
    row = _schedules.get(schedule_id)
    if row is None:
        raise ScheduleError("RPT_SCHEDULE_NOT_FOUND", "Schedule not found", 404)
    return _out(row)


def transition_schedule(schedule_id: uuid.UUID, action: str) -> ScheduleStatusOut:
    row = _schedules.get(schedule_id)
    if row is None:
        raise ScheduleError("RPT_SCHEDULE_NOT_FOUND", "Schedule not found", 404)
    status = row["status"]
    mapping = _TRANSITIONS.get(status, {})
    if action not in mapping:
        raise ScheduleError("RPT_SCHEDULE_INVALID_TRANSITION", f"Cannot {action} from {status}", 400)
    row["status"] = mapping[action]
    return _out(row)
