"""Dashboard export jobs (G5): visual PDF via Playwright or layout fallback."""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.auth.deps import UserContext
from app.core.config import get_settings
from app.dashboard import service as dash_service
from app.dashboard.export_jobs_schemas import DashboardExportJobOut
from app.dashboard.export_layout import build_dashboard_excel_csv, build_dashboard_pdf
from app.dashboard.export_render import render_dashboard_visual_pdf
from app.dashboard.export_token import issue_export_token
from app.dashboard.surface_kind import read_surface_kind_from_layout


@dataclass
class _ExportJob:
    job_id: uuid.UUID
    dashboard_id: uuid.UUID
    owner_id: str
    fmt: str
    status: str
    bytes_data: bytes | None
    artifact_kind: str | None
    created_at: datetime


_jobs: dict[uuid.UUID, _ExportJob] = {}


def _build_pdf_bytes(db: Session, dashboard_id: uuid.UUID, row) -> tuple[bytes, str]:
    settings = get_settings()
    surface = read_surface_kind_from_layout(row.layout_json)
    surface_key = "data_screen" if surface == "data-screen" else "dashboard"
    token = issue_export_token(dashboard_id)
    try:
        data = render_dashboard_visual_pdf(dashboard_id, token=token, surface=surface_key)
        return data, "visual_snapshot"
    except dash_service.DashboardError:
        if settings.rpt_export_fallback:
            return (
                build_dashboard_pdf(row.name, dashboard_id, row.description, row.layout_json),
                "layout_inventory",
            )
        raise


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
    artifact_kind: str | None = None
    if fmt == "pdf":
        data, artifact_kind = _build_pdf_bytes(db, dashboard_id, row)
    else:
        data = build_dashboard_excel_csv(row.name, dashboard_id, layout)
        artifact_kind = "layout_inventory"
    _jobs[job_id] = _ExportJob(
        job_id=job_id,
        dashboard_id=dashboard_id,
        owner_id=actor.id,
        fmt=fmt,
        status="ready",
        bytes_data=data,
        artifact_kind=artifact_kind,
        created_at=datetime.now(UTC),
    )
    return DashboardExportJobOut(
        jobId=job_id,
        status="ready",
        downloadUrl=f"/api/v1/dashboards/export-jobs/{job_id}/download",
        artifactKind=artifact_kind,
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
        artifactKind=job.artifact_kind,
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


def reset_export_jobs_for_tests() -> None:
    _jobs.clear()
