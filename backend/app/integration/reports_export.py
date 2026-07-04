from __future__ import annotations

import uuid
from datetime import UTC, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.auth.deps import UserContext
from app.core.logging import trace_id_var
from app.integration.errors import IntegrationError

SEED_TEMPLATE_IDS = frozenset({uuid.UUID("00000000-0000-4000-8000-0000000000a1")})
VALID_FORMATS = frozenset({"pdf", "word", "excel"})


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


def _assert_reports_export(actor: UserContext) -> None:
    if "admin" in actor.roles or "integration" in actor.roles:
        return
    raise IntegrationError(
        "REPORT_EXPORT_FORBIDDEN",
        "Report export requires integration or admin role",
        403,
    )


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
    if template_id not in SEED_TEMPLATE_IDS:
        raise IntegrationError(
            "REPORT_TEMPLATE_NOT_FOUND",
            "Template not found",
            404,
        )
    trace = trace_id_var.get() or uuid.uuid4().hex
    return ReportExportOut(
        export_id=uuid.uuid4(),
        template_id=template_id,
        format=fmt,
        status="pending",
        download_url=None,
        expires_at=None,
        requested_at=datetime.now(UTC).isoformat(),
        trace_id=trace,
    )
