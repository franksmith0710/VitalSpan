from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.auth.deps import UserContext, get_current_user
from app.views.schemas import DashboardView, ViewError
from app.views.validate import validate_dashboard_view

router = APIRouter(prefix="/views", tags=["views", "IF-06"])


def _error_response(exc: ViewError) -> JSONResponse:
    detail = {"fields": exc.fields} if exc.fields else None
    return JSONResponse(
        status_code=exc.status,
        content={"code": exc.code, "message": exc.message, "detail": detail},
    )


@router.post("/validate", response_model=DashboardView)
def validate_view(
    payload: dict,
    _: Annotated[UserContext, Depends(get_current_user)],
) -> DashboardView | JSONResponse:
    try:
        return validate_dashboard_view(payload)
    except ViewError as exc:
        return _error_response(exc)
