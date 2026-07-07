from __future__ import annotations

import re
import uuid

from app.auth.deps import UserContext
from app.reports.catalog import service as catalog_service
from app.reports.catalog.acl import register_node_owner
from app.reports.catalog.errors import ReportCatalogError
from app.reports.scheduler import acl as schedule_acl
from app.reports.scheduler import jobs as schedule_jobs
from app.reports.scheduler.errors import ScheduleError
from app.reports.scheduler.schemas import ScheduleCreate, ScheduleListOut, ScheduleStatusOut

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
    ranges = [(0, 59), (0, 23), (1, 31), (1, 12), (0, 7)]
    for part, (lo, hi) in zip(parts, ranges, strict=True):
        if part.isdigit():
            val = int(part)
            if val < lo or val > hi:
                raise ScheduleError("RPT_SCHEDULE_INVALID_CRON", "Cron field out of range", 422)


def _get_row(schedule_id: uuid.UUID) -> dict:
    row = _schedules.get(schedule_id)
    if row is None:
        raise ScheduleError("RPT_SCHEDULE_NOT_FOUND", "Schedule not found", 404)
    return row


def _out(row: dict) -> ScheduleStatusOut:
    return ScheduleStatusOut(
        id=row["id"],
        catalogNodeId=row["catalog_node_id"],
        cron=row["cron"],
        timezone=row["timezone"],
        status=row["status"],
        allowedActions=sorted(_ALLOWED.get(row["status"], frozenset())),
    )


def create_schedule(payload: ScheduleCreate, actor: UserContext) -> ScheduleStatusOut:
    if not catalog_service.node_exists(payload.catalog_node_id):
        raise ReportCatalogError("RPT_CATALOG_NODE_NOT_FOUND", "Catalog node not found", 404)
    _validate_cron(payload.cron)
    register_node_owner(payload.catalog_node_id, actor.id)
    schedule_id = uuid.uuid4()
    row = {
        "id": schedule_id,
        "catalog_node_id": payload.catalog_node_id,
        "cron": payload.cron,
        "timezone": payload.timezone,
        "status": "draft",
        "owner_id": actor.id,
    }
    _schedules[schedule_id] = row
    return _out(row)


def get_schedule(schedule_id: uuid.UUID) -> ScheduleStatusOut:
    return _out(_get_row(schedule_id))


def iter_scheduled_rows() -> list[dict]:
    return [row for row in _schedules.values() if row["status"] == "scheduled"]


def list_schedules(
    actor: UserContext,
    *,
    catalog_node_id: uuid.UUID | None = None,
    limit: int = 50,
    offset: int = 0,
) -> ScheduleListOut:
    rows = list(_schedules.values())
    if catalog_node_id is not None:
        rows = [r for r in rows if r["catalog_node_id"] == catalog_node_id]
    visible: list[dict] = []
    for row in rows:
        try:
            schedule_acl.assert_schedule_read(actor, row)
            visible.append(row)
        except ScheduleError:
            continue
    total = len(visible)
    page = visible[offset : offset + limit]
    return ScheduleListOut(items=[_out(r) for r in page], total=total)


def transition_schedule(schedule_id: uuid.UUID, action: str, actor: UserContext) -> ScheduleStatusOut:
    row = _get_row(schedule_id)
    schedule_acl.assert_schedule_write(actor, row, action)
    status = row["status"]
    mapping = _TRANSITIONS.get(status, {})
    if action not in mapping:
        raise ScheduleError("RPT_SCHEDULE_INVALID_TRANSITION", f"Cannot {action} from {status}", 400)
    row["status"] = mapping[action]
    if row["status"] == "scheduled":
        schedule_jobs.register_job_on_transition(schedule_id, row)
    if action == "cancel":
        schedule_jobs.remove_job_on_cancel(schedule_id)
    return _out(row)
