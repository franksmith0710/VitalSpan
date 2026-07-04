from __future__ import annotations

import time
import uuid
from datetime import UTC, datetime

from app.auth.deps import UserContext
from app.reports.scheduler.errors import ScheduleError
from app.reports.scheduler.schemas import ScheduleExecuteOut
from app.reports.scheduler import service as scheduler_service

_EXECUTION_LOG: dict[str, ScheduleExecuteOut] = {}
_EXECUTE_BUDGET_MS = 20


def mock_execute_schedule(
    schedule_id: uuid.UUID,
    idempotency_key: str,
    actor: UserContext,
) -> ScheduleExecuteOut:
    del actor
    if not idempotency_key:
        raise ScheduleError("RPT_SCHEDULE_EXECUTE_INVALID", "Idempotency-Key required", 422)
    cached = _EXECUTION_LOG.get(idempotency_key)
    if cached is not None:
        return cached
    row = scheduler_service._get_row(schedule_id)
    if row["status"] != "scheduled":
        raise ScheduleError("RPT_SCHEDULE_EXECUTE_NOT_READY", f"Cannot execute from {row['status']}", 400)
    execution_id = uuid.uuid4()
    out = ScheduleExecuteOut(
        executionId=execution_id,
        scheduleId=schedule_id,
        status="mock_succeeded",
        artifactRef=f"mock://reports/{schedule_id}/{execution_id}",
        idempotencyKey=idempotency_key,
        executedAt=datetime.now(UTC).isoformat(),
    )
    _EXECUTION_LOG[idempotency_key] = out
    return out


def probe_mock_execute_budget_ms(schedule_id: uuid.UUID, key: str, actor: UserContext) -> float:
    start = time.perf_counter()
    mock_execute_schedule(schedule_id, key, actor)
    return (time.perf_counter() - start) * 1000.0
