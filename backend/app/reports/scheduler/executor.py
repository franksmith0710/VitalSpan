from __future__ import annotations

import time
import uuid
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.auth.deps import UserContext
from app.auth.models import get_meta_session
from app.dashboard import export_jobs as dashboard_export_jobs
from app.dashboard import service as dash_service
from app.datasources.models import get_meta_engine
from app.reports.catalog.acl import register_artifact_owner
from app.reports.scheduler import acl as schedule_acl
from app.reports.scheduler.delivery import dispatch_artifact
from app.reports.scheduler.errors import ScheduleError
from app.reports.scheduler.recipients import resolve_recipient_emails
from app.reports.scheduler.schemas import ScheduleExecuteOut, ScheduleRecipientIn
from app.reports.scheduler import service as scheduler_service
from app.core.config import get_settings
from app.reports.scheduler.store import MemoryScheduleStore, get_schedule_store

_EXECUTE_BUDGET_MS = 20
_SEMI_BUDGET_MS = 35

# Backward compat for tests that clear these directly
_EXECUTION_LOG: dict[str, ScheduleExecuteOut] = {}
_EXECUTION_BY_ID: dict[uuid.UUID, ScheduleExecuteOut] = {}
_HISTORY: dict[uuid.UUID, list[dict]] = {}


def _memory_store() -> MemoryScheduleStore | None:
    store = get_schedule_store()
    return store if isinstance(store, MemoryScheduleStore) else None


def _execution_row_to_out(row: dict) -> ScheduleExecuteOut:
    return ScheduleExecuteOut(
        executionId=row["executionId"],
        scheduleId=row["scheduleId"],
        status=row["status"],
        artifactRef=row["artifactRef"],
        artifactKind=row.get("artifactKind"),
        idempotencyKey=row.get("idempotencyKey") or "",
        executedAt=row.get("executedAt") or datetime.now(UTC).isoformat(),
        deliverySteps=row.get("deliverySteps") or [],
        revisionSnapshot=row.get("revisionSnapshot"),
        errorMessage=row.get("errorMessage"),
        parentExecutionId=row.get("parentExecutionId"),
    )


def _get_cached_execution(idempotency_key: str) -> ScheduleExecuteOut | None:
    mem = _memory_store()
    if mem is not None:
        row = mem.get_idempotency(idempotency_key)
        return _execution_row_to_out(row) if row else None
    row = get_schedule_store().get_idempotency(idempotency_key)
    if row is not None:
        return _execution_row_to_out(row)
    return _EXECUTION_LOG.get(idempotency_key)


def _remember_execution(out: ScheduleExecuteOut) -> None:
    payload = out.model_dump(by_alias=True)
    mem = _memory_store()
    if mem is not None:
        mem.cache_idempotency(out.idempotency_key, payload)
    else:
        get_schedule_store().cache_idempotency(out.idempotency_key, payload)
    if get_settings().rpt_schedule_store == "memory":
        _EXECUTION_LOG[out.idempotency_key] = out
        _EXECUTION_BY_ID[out.execution_id] = out


def _get_execution_out(execution_id: uuid.UUID) -> ScheduleExecuteOut | None:
    mem = _memory_store()
    if mem is not None:
        cached = _EXECUTION_BY_ID.get(execution_id)
        if cached is not None:
            return cached
        row = mem.get_execution(execution_id)
        return _execution_row_to_out(row) if row else None
    row = get_schedule_store().get_execution(execution_id)
    if row is not None:
        return _execution_row_to_out(row)
    return _EXECUTION_BY_ID.get(execution_id)


def _append_history(
    schedule_id: uuid.UUID,
    out: ScheduleExecuteOut,
    *,
    error_message: str | None = None,
) -> None:
    entry = {
        "executionId": out.execution_id,
        "scheduleId": out.schedule_id,
        "status": out.status,
        "artifactRef": out.artifact_ref,
        "artifactKind": out.artifact_kind,
        "executedAt": out.executed_at,
        "errorMessage": error_message or out.error_message,
        "parentExecutionId": out.parent_execution_id,
    }
    mem = _memory_store()
    if mem is not None:
        mem.append_execution(schedule_id, entry)
    else:
        store = get_schedule_store()
        store.append_execution(schedule_id, entry, out.model_dump(by_alias=True))
    _HISTORY.setdefault(schedule_id, []).append(entry)


def list_recent_failed_executions(limit: int = 20) -> dict:
    mem = _memory_store()
    rows: list[dict] = mem.list_all_executions() if mem else get_schedule_store().list_all_executions()
    failed_rows: list[dict] = []
    for entry in rows:
        status = entry.get("status", "")
        if "failed" not in status and "degraded" not in status:
            continue
        failed_rows.append(entry)
    failed_rows.sort(key=lambda r: r.get("executedAt", ""), reverse=True)
    return {"items": failed_rows[:limit], "total": len(failed_rows)}


def list_executions(schedule_id: uuid.UUID, limit: int = 50, offset: int = 0) -> dict:
    mem = _memory_store()
    if mem is not None:
        rows = sorted(mem.list_executions(schedule_id), key=lambda r: r["executedAt"], reverse=True)
    else:
        rows = get_schedule_store().list_executions(schedule_id)
    return {"items": rows[offset : offset + limit], "total": len(rows)}


def mock_execute_schedule(
    schedule_id: uuid.UUID,
    idempotency_key: str,
    actor: UserContext,
) -> ScheduleExecuteOut:
    del actor
    if not idempotency_key:
        raise ScheduleError("RPT_SCHEDULE_EXECUTE_INVALID", "Idempotency-Key required", 422)
    cached = _get_cached_execution(idempotency_key)
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
        artifactRef=f"test://reports/{schedule_id}/{execution_id}",
        idempotencyKey=idempotency_key,
        executedAt=datetime.now(UTC).isoformat(),
    )
    _remember_execution(out)
    _append_history(schedule_id, out)
    return out


def _export_template_attachments(
    source_id: uuid.UUID,
    formats: list[str],
    actor: UserContext,
) -> tuple[str, str | None, list[tuple[bytes, str, str]], str | None]:
    from app.reports.engine.service import export_template_bytes
    from app.reports.render.render_from_spec import content_type_for

    attachments: list[tuple[bytes, str, str]] = []
    artifact_ref = f"semi://reports/template/{source_id}"
    export_error: str | None = None
    for fmt in formats:
        try:
            data = export_template_bytes(source_id, fmt, actor)
            mime = content_type_for(fmt)
            ext = "docx" if fmt == "word" else fmt
            attachments.append((data, mime, f"report-{source_id}.{ext}"))
        except Exception as exc:
            export_error = str(exc)
            break
    kind = "template_render" if attachments else None
    return artifact_ref, kind, attachments, export_error


def _export_dashboard_attachments(
    source_id: uuid.UUID,
    formats: list[str],
    actor: UserContext,
) -> tuple[str, str | None, list[tuple[bytes, str, str]], str | None]:
    attachments: list[tuple[bytes, str, str]] = []
    artifact_kind: str | None = None
    artifact_ref = ""
    export_error: str | None = None
    for fmt in formats:
        try:
            with Session(bind=get_meta_engine()) as db:
                job = dashboard_export_jobs.submit_dashboard_export(db, source_id, fmt, actor)
            if not artifact_ref:
                artifact_ref = job.download_url or ""
                artifact_kind = job.artifact_kind
            job_id = dashboard_export_jobs.parse_export_job_id_from_download_url(job.download_url)
            if job_id is not None:
                attachment = dashboard_export_jobs.read_export_attachment(job_id)
                if attachment is not None:
                    attachments.append(attachment)
        except dash_service.DashboardError as exc:
            export_error = exc.message
            break
    return artifact_ref, artifact_kind, attachments, export_error


def semi_real_execute_schedule(
    schedule_id: uuid.UUID,
    idempotency_key: str,
    actor: UserContext,
    delivery_mock: str | None = None,
) -> ScheduleExecuteOut:
    if not idempotency_key:
        raise ScheduleError("RPT_SCHEDULE_EXECUTE_INVALID", "Idempotency-Key required", 422)
    cached = _get_cached_execution(idempotency_key)
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
        from app.reports.extension import service as extension_service
        try:
            ext = extension_service.get_extension(source_id)
            revision_snapshot = {"revision": ext.revision, "metricCount": len(ext.metrics)}
        except Exception:
            pass
    artifact_ref = f"semi://reports/{schedule_id}/{execution_id}"
    artifact_kind = "template_render"
    export_error: str | None = None
    attachments: list[tuple[bytes, str, str]] = []
    if source_type in {"dashboard", "data_screen"} and source_id is not None:
        formats = row.get("attachment_formats") or ["pdf"]
        artifact_ref, artifact_kind, attachments, export_error = _export_dashboard_attachments(
            source_id, formats, actor,
        )
    elif source_type == "template" and source_id is not None:
        formats = row.get("attachment_formats") or ["pdf"]
        artifact_ref, artifact_kind, attachments, export_error = _export_template_attachments(
            source_id, formats, actor,
        )
    if export_error:
        out = ScheduleExecuteOut(
            executionId=execution_id,
            scheduleId=schedule_id,
            status="semi_real_failed",
            artifactRef=artifact_ref or f"semi://reports/{schedule_id}/{execution_id}",
            artifactKind=None,
            idempotencyKey=idempotency_key,
            executedAt=datetime.now(UTC).isoformat(),
            deliverySteps=[],
            revisionSnapshot=revision_snapshot,
            errorMessage=export_error,
        )
        _remember_execution(out)
        _append_history(schedule_id, out, error_message=export_error)
        return out
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
    channels = row.get("delivery_channels") or ["email"]
    att_bytes = attachments[0][0] if attachments else None
    att_mime = attachments[0][1] if attachments else None
    att_name = attachments[0][2] if attachments else None
    delivery = dispatch_artifact(
        artifact_ref,
        channels,
        delivery_mock,
        recipient_emails=recipient_emails,
        artifact_kind=artifact_kind,
        attachment_bytes=att_bytes,
        attachment_filename=att_name,
        attachment_mime=att_mime,
        attachments=attachments,
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
    _remember_execution(out)
    _append_history(schedule_id, out, error_message=error_message)
    register_artifact_owner(artifact_ref, actor.id)
    return out


def retry_execution(
    execution_id: uuid.UUID,
    idempotency_key: str,
    actor: UserContext,
) -> ScheduleExecuteOut:
    out = _get_execution_out(execution_id)
    if out is None:
        raise ScheduleError("RPT_SCHEDULE_EXECUTION_NOT_FOUND", "Execution not found", 404)
    if "degraded" not in out.status and "failed" not in out.status:
        raise ScheduleError("RPT_SCHEDULE_RETRY_NOT_ALLOWED", "Only failed/degraded executions can retry", 400)
    schedule_id = out.schedule_id
    schedule_acl.assert_schedule_write(actor, scheduler_service._get_row(schedule_id), "retry")
    new_out = semi_real_execute_schedule(schedule_id, idempotency_key, actor)
    new_out = new_out.model_copy(update={"parent_execution_id": execution_id})
    _remember_execution(new_out)
    _append_history(schedule_id, new_out)
    return new_out


def get_execution_artifact_meta(execution_id: uuid.UUID) -> dict:
    out = _get_execution_out(execution_id)
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
