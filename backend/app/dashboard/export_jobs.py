"""Dashboard export jobs (G5 MVP): layout → PDF/Excel bytes."""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.auth.deps import UserContext
from app.dashboard import service as dash_service
from app.dashboard.export_jobs_schemas import DashboardExportJobOut
from app.dashboard.export_layout import build_dashboard_excel_csv, build_dashboard_pdf


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
    layout = row.layout_json
    if fmt == "pdf":
        data = build_dashboard_pdf(row.name, dashboard_id, row.description, layout)
    else:
        data = build_dashboard_excel_csv(row.name, dashboard_id, layout)
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
