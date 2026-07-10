from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime

from app.auth.deps import UserContext
from app.reports.batch.schemas import BatchExportJobIn, BatchExportJobOut
from app.reports.catalog.errors import ReportCatalogError
from app.reports.catalog import service as catalog_service
from app.reports.errors import ReportBatchError

_JOB_LIMIT = 20


@dataclass
class _ExportJob:
    job_id: uuid.UUID
    owner_id: str
    node_ids: list[uuid.UUID]
    fmt: str
    status: str
    poll_count: int
    bytes_data: bytes | None
    created_at: datetime


_jobs: dict[uuid.UUID, _ExportJob] = {}


def _validate_nodes(node_ids: list[uuid.UUID]) -> None:
    for node_id in node_ids:
        try:
            node = catalog_service.get_node(node_id)
        except ReportCatalogError as exc:
            raise ReportBatchError("RPT_BATCH_EXPORT_NODE_NOT_FOUND", exc.message, 404) from exc
        if node.node_type != "template":
            raise ReportBatchError(
                "RPT_BATCH_EXPORT_INVALID_NODE",
                "Batch export requires template nodes",
                422,
            )


def _build_archive(node_ids: list[uuid.UUID], fmt: str) -> bytes:
    parts = [f"batch-export:{fmt}:{nid}" for nid in node_ids]
    return ("\n".join(parts) + "\n").encode()


def submit_batch_export(payload: BatchExportJobIn, actor: UserContext) -> BatchExportJobOut:
    if not payload.node_ids:
        raise ReportBatchError("RPT_BATCH_EXPORT_EMPTY", "nodeIds must not be empty", 422)
    if len(payload.node_ids) > _JOB_LIMIT:
        raise ReportBatchError(
            "RPT_BATCH_EXPORT_ITEM_LIMIT",
            f"Batch export cannot exceed {_JOB_LIMIT} nodes",
            422,
        )
    if payload.format not in {"pdf", "word", "excel"}:
        raise ReportBatchError("RPT_BATCH_EXPORT_INVALID_FORMAT", "Invalid export format", 422)
    _validate_nodes(payload.node_ids)
    job_id = uuid.uuid4()
    _jobs[job_id] = _ExportJob(
        job_id=job_id,
        owner_id=actor.id,
        node_ids=payload.node_ids,
        fmt=payload.format,
        status="pending",
        poll_count=0,
        bytes_data=None,
        created_at=datetime.now(UTC),
    )
    return BatchExportJobOut(job_id=job_id, status="pending", download_url=None)


def get_batch_export_job(job_id: uuid.UUID, actor: UserContext) -> BatchExportJobOut:
    job = _jobs.get(job_id)
    if job is None:
        raise ReportBatchError("RPT_BATCH_EXPORT_JOB_NOT_FOUND", "Export job not found", 404)
    if job.owner_id != actor.id and "admin" not in actor.roles:
        raise ReportBatchError("RPT_BATCH_EXPORT_JOB_FORBIDDEN", "Export job access denied", 403)
    job.poll_count += 1
    if job.status == "pending" and job.poll_count >= 1:
        job.status = "processing"
    if job.status == "processing" and job.poll_count >= 2:
        job.status = "ready"
        job.bytes_data = _build_archive(job.node_ids, job.fmt)
    download_url = f"/api/v1/reports/jobs/{job_id}/download" if job.status == "ready" else None
    return BatchExportJobOut(job_id=job.job_id, status=job.status, download_url=download_url)


def get_batch_export_download(job_id: uuid.UUID, actor: UserContext) -> tuple[bytes, str, str]:
    job = _jobs.get(job_id)
    if job is None or job.status != "ready" or not job.bytes_data:
        raise ReportBatchError("RPT_BATCH_EXPORT_JOB_NOT_FOUND", "Export job not ready", 404)
    if job.owner_id != actor.id and "admin" not in actor.roles:
        raise ReportBatchError("RPT_BATCH_EXPORT_JOB_FORBIDDEN", "Export job access denied", 403)
    return job.bytes_data, "application/octet-stream", f"batch-export-{job_id}.txt"
