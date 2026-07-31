"""Dashboard export jobs (G5 MVP): layout → PDF/Excel bytes."""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.auth.deps import UserContext
from app.dashboard import service as dash_service
from app.dashboard.export_jobs_schemas import DashboardExportJobOut


@dataclass
class _ExportJob:
    job_id: uuid.UUID
    dashboard_id: uuid.UUID
    owner_id: str
    fmt: str
    status: str
    bytes_data: bytes | None
    created_at: datetime


_jobs: dict[uuid.UUID, _ExportJob] = {}


def _minimal_pdf(dashboard_id: uuid.UUID, name: str) -> bytes:
    text = f"Dashboard export: {name} ({dashboard_id})"
    return (
        b"%PDF-1.4\n1 0 obj<<>>endobj\n2 0 obj<</Length "
        + str(len(text) + 2).encode()
        + b">>/stream\n("
        + text.encode()
        + b")\nendstream endobj\nxref\n0 3\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n"
        b"trailer<</Size 3/Root 1 0 R>>\nstartxref\n120\n%%EOF"
    )


def submit_dashboard_export(
    db: Session,
    dashboard_id: uuid.UUID,
    fmt: str,
    actor: UserContext,
) -> DashboardExportJobOut:
    if fmt not in {"pdf", "excel"}:
        raise dash_service.DashboardError("DASH_EXPORT_INVALID_FORMAT", "Invalid export format", 422)
    row = dash_service.get_dashboard(db, dashboard_id)
    job_id = uuid.uuid4()
    data = _minimal_pdf(dashboard_id, row.name) if fmt == "pdf" else f"dashboard,{dashboard_id}\n".encode()
    _jobs[job_id] = _ExportJob(
        job_id=job_id,
        dashboard_id=dashboard_id,
        owner_id=actor.id,
        fmt=fmt,
        status="ready",
        bytes_data=data,
        created_at=datetime.now(UTC),
    )
    return DashboardExportJobOut(
        jobId=job_id,
        status="ready",
        downloadUrl=f"/api/v1/dashboards/export-jobs/{job_id}/download",
    )


def get_dashboard_export_job(job_id: uuid.UUID, actor: UserContext) -> DashboardExportJobOut:
    job = _jobs.get(job_id)
    if job is None:
        raise dash_service.DashboardError("DASH_EXPORT_JOB_NOT_FOUND", "Export job not found", 404)
    if job.owner_id != actor.id and "admin" not in actor.roles:
        raise dash_service.DashboardError("DASH_EXPORT_FORBIDDEN", "Forbidden", 403)
    return DashboardExportJobOut(
        jobId=job.job_id,
        status=job.status,
        downloadUrl=f"/api/v1/dashboards/export-jobs/{job_id}/download",
    )


def read_dashboard_export_bytes(job_id: uuid.UUID, actor: UserContext) -> tuple[bytes, str, str]:
    job = _jobs.get(job_id)
    if job is None:
        raise dash_service.DashboardError("DASH_EXPORT_JOB_NOT_FOUND", "Export job not found", 404)
    if job.owner_id != actor.id and "admin" not in actor.roles:
        raise dash_service.DashboardError("DASH_EXPORT_FORBIDDEN", "Forbidden", 403)
    if job.bytes_data is None or job.status != "ready":
        raise dash_service.DashboardError("DASH_EXPORT_NOT_READY", "Export not ready", 409)
    content_type = "application/pdf" if job.fmt == "pdf" else "application/vnd.ms-excel"
    filename = f"dashboard-{job.dashboard_id}.{job.fmt}"
    return job.bytes_data, content_type, filename
