from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.auth.deps import UserContext, get_current_user
from app.schemas.chart_view import ChartViewConfig, ChartViewError, validate_chart_view_config
from app.viz.registry import export_chart_type_catalog

router = APIRouter(prefix="/charts", tags=["charts"])


def _error_response(exc: ChartViewError) -> JSONResponse:
    detail = {"fields": exc.fields} if exc.fields else None
    return JSONResponse(
        status_code=exc.status,
        content={"code": exc.code, "message": exc.message, "detail": detail},
    )


@router.get("/types")
def list_chart_types(
    _: Annotated[UserContext, Depends(get_current_user)],
) -> list[dict]:
    return export_chart_type_catalog()


@router.post("/validate", response_model=ChartViewConfig)
def validate_chart(
    payload: dict,
    _: Annotated[UserContext, Depends(get_current_user)],
) -> ChartViewConfig | JSONResponse:
    try:
        return validate_chart_view_config(payload)
    except ChartViewError as exc:
        return _error_response(exc)
