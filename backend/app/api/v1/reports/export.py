from __future__ import annotations

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response
from fastapi.responses import JSONResponse

from app.auth.deps import UserContext, get_current_user
from app.integration import reports_export as rex
from app.integration.errors import IntegrationError

router = APIRouter(prefix="/reports", tags=["integration", "IF-03"])


def _err(exc: IntegrationError) -> JSONResponse:
    detail = {"fields": exc.fields} if exc.fields else None
    return JSONResponse(
        status_code=exc.status,
        content={"code": exc.code, "message": exc.message, "detail": detail},
    )


@router.get("/export", response_model=rex.ReportExportOut)
def get_report_export(
    response: Response,
    actor: Annotated[UserContext, Depends(get_current_user)],
    template_id: str = Query(alias="templateId"),
    format: str = Query(alias="format"),
    from_ts: datetime | None = Query(default=None, alias="from"),
    to_ts: datetime | None = Query(default=None, alias="to"),
):
    try:
        out = rex.create_export_request(
            actor,
            template_id_raw=template_id,
            fmt=format,
            from_ts=from_ts,
            to_ts=to_ts,
        )
        response.headers["X-RateLimit-Limit"] = "60"
        response.headers["X-RateLimit-Remaining"] = "59"
        return out
    except IntegrationError as exc:
        return _err(exc)
