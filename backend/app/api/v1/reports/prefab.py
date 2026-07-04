from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.auth.deps import UserContext, get_current_user
from app.reports.prefab.errors import PrefabError
from app.reports.prefab.schemas import (
    PrefabBindingIn,
    PrefabBindingListResponse,
    PrefabBindingOut,
    PrefabBindingValidateOut,
)
from app.reports.prefab import service as prefab_service

router = APIRouter(prefix="/prefab", tags=["reports-prefab"])


def _prefab_error(exc: PrefabError) -> JSONResponse:
    detail = {"fields": exc.fields} if exc.fields else None
    return JSONResponse(status_code=exc.status, content={"code": exc.code, "message": exc.message, "detail": detail})


@router.get("/probe")
def prefab_probe(_: Annotated[UserContext, Depends(get_current_user)]) -> dict:
    from app.reports.prefab.probe import (
        probe_list_prefab_bindings_budget_ms,
        probe_validate_prefab_budget_ms,
    )

    v = probe_validate_prefab_budget_ms()
    list_result = probe_list_prefab_bindings_budget_ms()
    return {
        "validateElapsedMs": v.elapsed_ms,
        "listElapsedMs": list_result.elapsed_ms,
        "withinBudget": v.ok and list_result.ok,
    }


@router.get("/bindings", response_model=PrefabBindingListResponse)
def list_bindings(_: Annotated[UserContext, Depends(get_current_user)]) -> PrefabBindingListResponse:
    return prefab_service.list_prefab_bindings()


@router.post("/bindings/validate", response_model=PrefabBindingValidateOut)
def validate_binding(
    payload: PrefabBindingIn,
    _: Annotated[UserContext, Depends(get_current_user)],
) -> PrefabBindingValidateOut | JSONResponse:
    try:
        return prefab_service.validate_prefab_binding(payload)
    except PrefabError as exc:
        return _prefab_error(exc)


@router.put("/bindings/{binding_key}", response_model=PrefabBindingOut)
def upsert_binding(
    binding_key: str,
    payload: PrefabBindingIn,
    actor: Annotated[UserContext, Depends(get_current_user)],
) -> PrefabBindingOut | JSONResponse:
    try:
        return prefab_service.upsert_prefab_binding(binding_key, payload, actor)
    except PrefabError as exc:
        return _prefab_error(exc)
