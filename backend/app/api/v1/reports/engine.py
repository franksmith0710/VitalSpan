from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.auth.deps import UserContext, require_permission

PERM_READ = "report:read"
PERM_MANAGE = "report:manage"
from app.reports.engine.errors import ReportEngineError
from app.reports.engine.schemas import RenderRunIn, RenderRunOut
from app.reports.engine import service as engine_service

router = APIRouter(tags=["reports"])


def _engine_error(exc: ReportEngineError) -> JSONResponse:
    detail = {"fields": exc.fields} if exc.fields else None
    return JSONResponse(
        status_code=exc.status,
        content={"code": exc.code, "message": exc.message, "detail": detail},
    )


@router.post("/templates/{template_id}/run", response_model=None)
def run_report_template(
    template_id: uuid.UUID,
    payload: RenderRunIn,
    actor: Annotated[UserContext, Depends(require_permission(PERM_MANAGE))],
) -> RenderRunOut | JSONResponse:
    try:
        return engine_service.run_template(template_id, payload, actor)
    except ReportEngineError as exc:
        return _engine_error(exc)
