from __future__ import annotations

import time
import uuid
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.auth.deps import UserContext
from app.auth.models import get_meta_session
from app.dashboard import export_jobs as dashboard_export_jobs
from app.datasources.models import get_meta_engine
from app.reports.catalog.acl import register_artifact_owner
from app.reports.extension import service as extension_service
from app.reports.scheduler import acl as schedule_acl
from app.reports.scheduler.delivery import dispatch_artifact
from app.reports.scheduler.errors import ScheduleError
from app.reports.scheduler.recipients import resolve_recipient_emails
from app.reports.scheduler.schemas import ScheduleExecuteOut, ScheduleRecipientIn
from app.reports.scheduler import service as scheduler_service

_EXECUTION_LOG: dict[str, ScheduleExecuteOut] = {}
_EXECUTION_BY_ID: dict[uuid.UUID, ScheduleExecuteOut] = {}
_HISTORY: dict[uuid.UUID, list[dict]] = {}
_EXECUTE_BUDGET_MS = 20
_SEMI_BUDGET_MS = 35


def _append_history(
    schedule_id: uuid.UUID,
    out: ScheduleExecuteOut,
    *,
    error_message: str | None = None,
) -> None:
    bucket = _HISTORY.setdefault(schedule_id, [])
    bucket.append({
        "executionId": out.execution_id,
        "scheduleId": out.schedule_id,
        "status": out.status,
        "artifactRef": out.artifact_ref,
        "artifactKind": out.artifact_kind,
        "executedAt": out.executed_at,
        "errorMessage": error_message or out.error_message,
        "parentExecutionId": out.parent_execution_id,
    })


def list_recent_failed_executions(limit: int = 20) -> dict:
    rows: list[dict] = []
    for schedule_id, history in _HISTORY.items():
        for entry in history:
            status = entry.get("status", "")
            if "failed" not in status and "degraded" not in status:
                continue
            rows.append({**entry, "scheduleId": schedule_id})
    rows.sort(key=lambda r: r.get("executedAt", ""), reverse=True)
    page = rows[:limit]
    return {"items": page, "total": len(rows)}


def list_executions(schedule_id: uuid.UUID, limit: int = 50, offset: int = 0) -> dict:
    rows = sorted(
        _HISTORY.get(schedule_id, []),
        key=lambda r: r["executedAt"],
        reverse=True,
    )
    return {"items": rows[offset : offset + limit], "total": len(rows)}


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
        # test:// only via X-Rpt-Execute-Mock — never customer-default mock://
        artifactRef=f"test://reports/{schedule_id}/{execution_id}",
        idempotencyKey=idempotency_key,
        executedAt=datetime.now(UTC).isoformat(),
    )
    _EXECUTION_LOG[idempotency_key] = out
    _EXECUTION_BY_ID[execution_id] = out
    _append_history(schedule_id, out)
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
    source_type = row.get("source_type", "template")
    source_id = row.get("source_id") or row["catalog_node_id"]
    revision_snapshot = None
    if source_type == "template" and source_id is not None:
        try:
            ext = extension_service.get_extension(source_id)
            revision_snapshot = {
                "revision": ext.revision,
                "metricCount": len(ext.metrics),
            }
        except Exception:
            pass
    artifact_ref = f"semi://reports/{schedule_id}/{execution_id}"
    artifact_kind = "template_render"
    if source_type in {"dashboard", "data_screen"} and source_id is not None:
        fmt = (row.get("attachment_formats") or ["pdf"])[0]
        artifact_kind = "layout_inventory"
        with Session(bind=get_meta_engine()) as db:
            job = dashboard_export_jobs.submit_dashboard_export(db, source_id, fmt, actor)
        artifact_ref = job.download_url or artifact_ref
    recipient_emails: list[str] | None = None
    raw_recipients = row.get("recipients") or []
    if raw_recipients:
        session = get_meta_session()
        try:
            recipient_emails = resolve_recipient_emails(
                session,
                [ScheduleRecipientIn.model_validate(r) for r in raw_recipients],
            )
        finally:
            session.close()
    delivery = dispatch_artifact(
        artifact_ref,
        ["email"],
        delivery_mock,
        recipient_emails=recipient_emails,
        artifact_kind=artifact_kind,
    )
    error_message: str | None = None
    if delivery_mock == "fail":
        status = "semi_real_failed"
        error_message = "delivery failed"
    elif delivery["status"] == "delivered":
        status = "semi_real_succeeded"
    elif delivery["status"] == "unconfigured":
        status = "semi_real_failed"
        error_message = delivery.get("error") or "SMTP delivery not configured"
    else:
        status = "semi_real_delivery_degraded"
        error_message = delivery.get("error") or next(
            (step.get("error") for step in delivery.get("deliverySteps", []) if step.get("error")),
            None,
        )
    out = ScheduleExecuteOut(
        executionId=execution_id,
        scheduleId=schedule_id,
        status=status,
        artifactRef=artifact_ref,
        artifactKind=artifact_kind,
        idempotencyKey=idempotency_key,
        executedAt=datetime.now(UTC).isoformat(),
        deliverySteps=delivery["deliverySteps"],
        revisionSnapshot=revision_snapshot,
        errorMessage=error_message,
    )
    register_artifact_owner(artifact_ref, actor.id)
    _EXECUTION_LOG[idempotency_key] = out
    _EXECUTION_BY_ID[execution_id] = out
    _append_history(schedule_id, out, error_message=error_message)
    return out


def retry_execution(
    execution_id: uuid.UUID,
    idempotency_key: str,
    actor: UserContext,
) -> ScheduleExecuteOut:
    out = _EXECUTION_BY_ID.get(execution_id)
    if out is None:
        raise ScheduleError("RPT_SCHEDULE_EXECUTION_NOT_FOUND", "Execution not found", 404)
    if "degraded" not in out.status and "failed" not in out.status:
        raise ScheduleError("RPT_SCHEDULE_RETRY_NOT_ALLOWED", "Only failed/degraded executions can retry", 400)
    schedule_id = out.schedule_id
    schedule_acl.assert_schedule_write(actor, scheduler_service._get_row(schedule_id), "retry")
    new_out = semi_real_execute_schedule(schedule_id, idempotency_key, actor)
    new_out = new_out.model_copy(update={"parent_execution_id": execution_id})
    _EXECUTION_BY_ID[new_out.execution_id] = new_out
    _EXECUTION_LOG[idempotency_key] = new_out
    _append_history(schedule_id, new_out)
    return new_out


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
