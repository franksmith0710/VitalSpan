from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from starlette.responses import Response
from sqlalchemy.orm import Session

from app.auth.deps import UserContext, get_current_user
from app.datasources.models import get_meta_session
from app.governance.catalog import service as catalog_service
from app.governance.catalog.schemas import (
    BusRegisterIn,
    BusRegisterOut,
    CatalogEntryCreate,
    CatalogEntryOut,
    CatalogListResponse,
    CategoryListResponse,
)

router = APIRouter(prefix="/gov", tags=["governance", "IF-06"])


def _db() -> Session:
    session = get_meta_session()
    try:
        yield session
    finally:
        session.close()


def _catalog_error_response(exc: catalog_service.CatalogError) -> JSONResponse:
    detail = None
    if getattr(exc, "trace_id", None):
        detail = {"traceId": exc.trace_id}
    return JSONResponse(
        status_code=exc.status,
        content={"code": exc.code, "message": exc.message, "detail": detail},
    )


def _assert_bus_register_admin(actor: UserContext) -> None:
    if "admin" not in actor.roles:
        raise catalog_service.CatalogError(
            "BUS_REGISTER_FORBIDDEN", "Bus registration requires admin role", 403
        )


@router.get("/catalog/categories", response_model=CategoryListResponse)
def list_catalog_categories(
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> CategoryListResponse | JSONResponse:
    return catalog_service.list_categories(db)


@router.get("/catalog/entries", response_model=CatalogListResponse)
def list_catalog_entries(
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
    category: str | None = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> CatalogListResponse | JSONResponse:
    try:
        return catalog_service.list_entries(db, category=category, limit=limit, offset=offset)
    except catalog_service.CatalogError as exc:
        return _catalog_error_response(exc)


@router.post("/catalog/entries", status_code=201, response_model=CatalogEntryOut)
def create_catalog_entry(
    payload: CatalogEntryCreate,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> CatalogEntryOut | JSONResponse:
    try:
        return catalog_service.create_entry(db, payload)
    except catalog_service.CatalogError as exc:
        return _catalog_error_response(exc)


@router.get("/catalog/entries/{entry_id}", response_model=CatalogEntryOut)
def get_catalog_entry(
    entry_id: uuid.UUID,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> CatalogEntryOut | JSONResponse:
    try:
        return catalog_service.get_entry(db, entry_id)
    except catalog_service.CatalogError as exc:
        return _catalog_error_response(exc)


@router.delete("/catalog/entries/{entry_id}", response_model=None)
def delete_catalog_entry(
    entry_id: uuid.UUID,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> Response | JSONResponse:
    try:
        catalog_service.delete_entry(db, entry_id)
        return Response(status_code=204)
    except catalog_service.CatalogError as exc:
        return _catalog_error_response(exc)


@router.post("/bus/register", response_model=BusRegisterOut)
def register_bus(
    payload: BusRegisterIn,
    actor: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> BusRegisterOut | JSONResponse:
    try:
        _assert_bus_register_admin(actor)
        out, created = catalog_service.register_entry_to_bus(db, payload.catalog_entry_id)
        return JSONResponse(
            status_code=201 if created else 200,
            content=out.model_dump(by_alias=True, mode="json"),
        )
    except catalog_service.CatalogError as exc:
        return _catalog_error_response(exc)
