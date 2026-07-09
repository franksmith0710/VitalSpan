from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from pydantic import BaseModel, ConfigDict, Field

from app.auth.deps import UserContext
from app.core.logging import trace_id_var
from app.integration.errors import IntegrationError

MAX_EXPORT_BYTES = 5_242_880
EXPORT_TTL_SEC = 3600
FORCE_FAIL_TEMPLATE_ID = uuid.UUID("00000000-0000-4000-8000-00000000f001")
SEED_TEMPLATE_IDS = frozenset({
    uuid.UUID("00000000-0000-4000-8000-0000000000a1"),
    FORCE_FAIL_TEMPLATE_ID,
})
VALID_FORMATS = frozenset({"pdf", "word", "excel"})

_MIME = {
    "pdf": "application/pdf",
    "word": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "excel": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}


class ReportExportOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    export_id: uuid.UUID = Field(alias="exportId")
    template_id: uuid.UUID = Field(alias="templateId")
    format: str
    status: str = "pending"
    download_url: str | None = Field(default=None, alias="downloadUrl")
    expires_at: str | None = Field(default=None, alias="expiresAt")
    requested_at: str = Field(alias="requestedAt")
    trace_id: str = Field(alias="traceId")


@dataclass
class ExportRecord:
    export_id: uuid.UUID
    template_id: uuid.UUID
    fmt: str
    status: str
    bytes_data: bytes | None
    content_type: str | None
    expires_at: datetime
    requested_at: datetime
    trace_id: str


_EXPORT_STORE: dict[uuid.UUID, ExportRecord] = {}


def _template_export_allowed(template_id: uuid.UUID) -> bool:
    if template_id in SEED_TEMPLATE_IDS:
        return True
    from app.reports.catalog.errors import ReportCatalogError
    from app.reports.catalog import service as catalog_service

    try:
        node = catalog_service.get_node(template_id)
    except ReportCatalogError:
        return False
    return node.node_type == "template"


def _assert_reports_export(actor: UserContext) -> None:
    if "admin" in actor.roles or "integration" in actor.roles:
        return
    raise IntegrationError(
        "REPORT_EXPORT_FORBIDDEN",
        "Report export requires integration or admin role",
        403,
    )


def _generate_mock_bytes(fmt: str, template_id: uuid.UUID) -> bytes:
    label = str(template_id)[-8:]
    if fmt == "pdf":
        return f"%PDF-1.4 mock {label}\n".encode()
    if fmt == "word":
        return b"PK\x03\x04mock-word-" + label.encode()
    return b"PK\x03\x04mock-excel-" + label.encode()


def _store_record(record: ExportRecord) -> None:
    _EXPORT_STORE[record.export_id] = record


def create_export_request(
    actor: UserContext,
    *,
    template_id_raw: str,
    fmt: str,
    from_ts: datetime | None,
    to_ts: datetime | None,
) -> ReportExportOut:
    _assert_reports_export(actor)
    if template_id_raw.endswith("force-rate-limit"):
        raise IntegrationError(
            "REPORT_EXPORT_RATE_LIMITED",
            "Rate limit exceeded",
            429,
        )
    try:
        template_id = uuid.UUID(template_id_raw)
    except ValueError as exc:
        raise IntegrationError(
            "REPORT_TEMPLATE_NOT_FOUND",
            "Template not found",
            404,
        ) from exc
    if fmt not in VALID_FORMATS:
        raise IntegrationError(
            "REPORT_EXPORT_INVALID_FORMAT",
            f"Invalid format: {fmt}",
            422,
            fields=[{"field": "format", "message": "must be pdf|word|excel"}],
        )
    if from_ts and to_ts and from_ts > to_ts:
        raise IntegrationError(
            "REPORT_EXPORT_INVALID_RANGE",
            "from must be before to",
            422,
            fields=[{"field": "from", "message": "invalid range"}],
        )
    if not _template_export_allowed(template_id):
        raise IntegrationError(
            "REPORT_TEMPLATE_NOT_FOUND",
            "Template not found",
            404,
        )
    trace = trace_id_var.get() or uuid.uuid4().hex
    if template_id == FORCE_FAIL_TEMPLATE_ID:
        raise IntegrationError(
            "REPORT_EXPORT_GENERATION_FAILED",
            "Report generation failed",
            502,
            trace_id=trace,
        )
    now = datetime.now(UTC)
    export_id = uuid.uuid4()
    bytes_data = _generate_mock_bytes(fmt, template_id)
    if len(bytes_data) > MAX_EXPORT_BYTES:
        raise IntegrationError(
            "REPORT_EXPORT_TOO_LARGE",
            "Export exceeds size limit",
            413,
            trace_id=trace,
        )
    expires_at = now + timedelta(seconds=EXPORT_TTL_SEC)
    record = ExportRecord(
        export_id=export_id,
        template_id=template_id,
        fmt=fmt,
        status="ready",
        bytes_data=bytes_data,
        content_type=_MIME[fmt],
        expires_at=expires_at,
        requested_at=now,
        trace_id=trace,
    )
    _store_record(record)
    return ReportExportOut(
        export_id=export_id,
        template_id=template_id,
        format=fmt,
        status="ready",
        download_url=f"/api/v1/reports/export/{export_id}/download",
        expires_at=expires_at.isoformat(),
        requested_at=now.isoformat(),
        trace_id=trace,
    )


def get_export_status(export_id: uuid.UUID) -> ReportExportOut:
    record = _EXPORT_STORE.get(export_id)
    if record is None:
        raise IntegrationError("REPORT_EXPORT_NOT_FOUND", "Export not found", 404)
    return ReportExportOut(
        export_id=record.export_id,
        template_id=record.template_id,
        format=record.fmt,
        status=record.status,
        download_url=(
            f"/api/v1/reports/export/{export_id}/download"
            if record.status == "ready"
            else None
        ),
        expires_at=record.expires_at.isoformat(),
        requested_at=record.requested_at.isoformat(),
        trace_id=record.trace_id,
    )


def get_export_file(export_id: uuid.UUID) -> tuple[bytes, str, str]:
    record = _EXPORT_STORE.get(export_id)
    if record is None or record.status != "ready" or not record.bytes_data:
        raise IntegrationError("REPORT_EXPORT_NOT_FOUND", "Export not found", 404)
    if datetime.now(UTC) > record.expires_at:
        raise IntegrationError("REPORT_EXPORT_NOT_FOUND", "Export expired", 404)
    ext = "docx" if record.fmt == "word" else record.fmt
    filename = f"report-{export_id}.{ext}"
    return record.bytes_data, record.content_type or _MIME[record.fmt], filename
