from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.auth.deps import UserContext, get_current_user
from app.reports.templates.errors import TemplateDefError
from app.reports.templates.schemas import TemplateDefinitionIn, TemplateDefinitionOut, TemplateValidateOut
from app.reports.templates import service as template_service

router = APIRouter(prefix="/templates", tags=["reports-templates"])


def _template_error(exc: TemplateDefError) -> JSONResponse:
    detail = {"fields": exc.fields} if exc.fields else None
    return JSONResponse(status_code=exc.status, content={"code": exc.code, "message": exc.message, "detail": detail})


@router.post("/validate", response_model=TemplateValidateOut)
def validate_template(
    payload: TemplateDefinitionIn,
    _: Annotated[UserContext, Depends(get_current_user)],
) -> TemplateValidateOut | JSONResponse:
    try:
        return template_service.validate_template_definition(payload)
    except TemplateDefError as exc:
        return _template_error(exc)


@router.put("/{template_key}", response_model=TemplateDefinitionOut)
def upsert_template(
    template_key: str,
    payload: TemplateDefinitionIn,
    _: Annotated[UserContext, Depends(get_current_user)],
) -> TemplateDefinitionOut | JSONResponse:
    try:
        return template_service.upsert_template_definition(template_key, payload)
    except TemplateDefError as exc:
        return _template_error(exc)


@router.get("/{template_key}", response_model=TemplateDefinitionOut)
def get_template(
    template_key: str,
    _: Annotated[UserContext, Depends(get_current_user)],
) -> TemplateDefinitionOut | JSONResponse:
    try:
        return template_service.get_template_definition(template_key)
    except TemplateDefError as exc:
        return _template_error(exc)
