from __future__ import annotations

import time
import uuid
from datetime import UTC, datetime

from app.auth.deps import UserContext
from app.reports.catalog.acl import register_artifact_owner
from app.reports.extension import service as extension_service
from app.reports.scheduler.delivery import dispatch_artifact
from app.reports.scheduler.errors import ScheduleError
from app.reports.scheduler.schemas import ScheduleExecuteOut
from app.reports.scheduler import service as scheduler_service

_EXECUTION_LOG: dict[str, ScheduleExecuteOut] = {}
_EXECUTION_BY_ID: dict[uuid.UUID, ScheduleExecuteOut] = {}
_EXECUTE_BUDGET_MS = 20
_SEMI_BUDGET_MS = 35


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
    _EXECUTION_BY_ID[execution_id] = out
    return out


def semi_real_execute_schedule(
    schedule_id: uuid.UUID,
    idempotency_key: str,
    actor: UserContext,
    delivery_mock: str | None = None,
) -> ScheduleExecuteOut:
    if not idempotency_key:
        raise ScheduleError("RPT_SCHEDULE_EXECUTE_INVALID", "Idempotency-Key required", 422)
    cached = _EXECUTION_LOG.get(idempotency_key)
    if cached is not None:
        return cached
    row = scheduler_service._get_row(schedule_id)
    if row["status"] != "scheduled":
        raise ScheduleError("RPT_SCHEDULE_EXECUTE_NOT_READY", f"Cannot execute from {row['status']}", 400)
    execution_id = uuid.uuid4()
    catalog_node_id = row["catalog_node_id"]
    revision_snapshot = None
    try:
        ext = extension_service.get_extension(catalog_node_id)
        revision_snapshot = {
            "revision": ext.revision,
            "metricCount": len(ext.metrics),
        }
    except Exception:
        pass
    artifact_ref = f"semi://reports/{schedule_id}/{execution_id}"
    delivery = dispatch_artifact(artifact_ref, ["email", "webhook"], delivery_mock)
    status = "semi_real_succeeded" if delivery["status"] == "delivered" else "semi_real_delivery_degraded"
    out = ScheduleExecuteOut(
        executionId=execution_id,
        scheduleId=schedule_id,
        status=status,
        artifactRef=artifact_ref,
        idempotencyKey=idempotency_key,
        executedAt=datetime.now(UTC).isoformat(),
        deliverySteps=delivery["deliverySteps"],
        revisionSnapshot=revision_snapshot,
    )
    register_artifact_owner(artifact_ref, actor.id)
    _EXECUTION_LOG[idempotency_key] = out
    _EXECUTION_BY_ID[execution_id] = out
    return out


def get_execution_artifact_meta(execution_id: uuid.UUID) -> dict:
    out = _EXECUTION_BY_ID.get(execution_id)
    if out is None:
        from app.reports.catalog.errors import ReportCatalogError
        raise ReportCatalogError("RPT_ARTIFACT_NOT_FOUND", "Execution artifact not found", 404)
    return {
        "executionId": str(out.execution_id),
        "artifactRef": out.artifact_ref,
        "status": out.status,
        "executedAt": out.executed_at,
    }


def probe_mock_execute_budget_ms(schedule_id: uuid.UUID, key: str, actor: UserContext) -> float:
    start = time.perf_counter()
    mock_execute_schedule(schedule_id, key, actor)
    return (time.perf_counter() - start) * 1000.0


def probe_semi_real_execute_budget_ms(schedule_id: uuid.UUID, key: str, actor: UserContext) -> float:
    start = time.perf_counter()
    semi_real_execute_schedule(schedule_id, key, actor)
    return (time.perf_counter() - start) * 1000.0
