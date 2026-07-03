from __future__ import annotations

import uuid
from typing import Annotated

import app.datasources  # noqa: F401 — trigger register_builtin_dialects
from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse, Response
from sqlalchemy.orm import Session

from app.auth.deps import UserContext, get_current_user
from app.auth.resources.service import VisibilityError
from app.datasources.models import get_meta_session
from app.datasources.metadata import service as metadata_service
from app.datasources.schemas import (
    ColumnListResponse,
    ConnectorTypeListResponse,
    ConnectorTypeOut,
    DataSourceCreate,
    DataSourceListResponse,
    DataSourceOut,
    DataSourcePatch,
    DataSourceUpdate,
    SchemaListResponse,
    TableListResponse,
    TestConnectionIn,
    TestConnectionOut,
)
from app.datasources import service as ds_service
from app.datasources.registry import export_type_catalog

router = APIRouter(prefix="/datasources", tags=["datasources"])


def _db() -> Session:
    session = get_meta_session()
    try:
        yield session
    finally:
        session.close()


def _error_response(exc: ds_service.DataSourceError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status,
        content={"code": exc.code, "message": exc.message, "detail": None},
    )


def _visibility_response(exc: VisibilityError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status,
        content={"code": exc.code, "message": exc.message, "detail": None},
    )


@router.get("", response_model=DataSourceListResponse)
def list_data_sources(
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    type: str | None = None,
    q: str | None = None,
) -> DataSourceListResponse:
    return ds_service.list_data_sources(db, limit=limit, offset=offset, type=type, q=q)


@router.post("", response_model=DataSourceOut, status_code=status.HTTP_201_CREATED)
def create_data_source(
    payload: DataSourceCreate,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> DataSourceOut | JSONResponse:
    try:
        return ds_service.create_data_source(db, payload)
    except ds_service.DataSourceError as exc:
        return _error_response(exc)


@router.get("/types", response_model=ConnectorTypeListResponse)
def list_connector_types(
    _: Annotated[UserContext, Depends(get_current_user)],
) -> ConnectorTypeListResponse:
    items = [ConnectorTypeOut.model_validate(item) for item in export_type_catalog()]
    return ConnectorTypeListResponse(items=items)


@router.get("/{data_source_id}", response_model=DataSourceOut)
def get_data_source(
    data_source_id: uuid.UUID,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> DataSourceOut | JSONResponse:
    try:
        return ds_service.get_data_source(db, data_source_id)
    except ds_service.DataSourceError as exc:
        return _error_response(exc)


@router.put("/{data_source_id}", response_model=DataSourceOut)
def update_data_source(
    data_source_id: uuid.UUID,
    payload: DataSourceUpdate,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> DataSourceOut | JSONResponse:
    try:
        return ds_service.update_data_source(db, data_source_id, payload)
    except ds_service.DataSourceError as exc:
        return _error_response(exc)


@router.patch("/{data_source_id}", response_model=DataSourceOut)
def patch_data_source(
    data_source_id: uuid.UUID,
    payload: DataSourcePatch,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> DataSourceOut | JSONResponse:
    try:
        return ds_service.patch_data_source(db, data_source_id, payload)
    except ds_service.DataSourceError as exc:
        return _error_response(exc)


@router.delete("/{data_source_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_data_source(
    data_source_id: uuid.UUID,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> Response:
    try:
        ds_service.delete_data_source(db, data_source_id)
    except ds_service.DataSourceError as exc:
        return _error_response(exc)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/test", response_model=TestConnectionOut)
def test_connection_draft(
    payload: TestConnectionIn,
    _: Annotated[UserContext, Depends(get_current_user)],
) -> TestConnectionOut | JSONResponse:
    try:
        return ds_service.test_connection_draft(payload)
    except ds_service.DataSourceError as exc:
        return _error_response(exc)


@router.post("/{data_source_id}/test", response_model=TestConnectionOut)
def test_connection_saved(
    data_source_id: uuid.UUID,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> TestConnectionOut | JSONResponse:
    try:
        return ds_service.test_connection_by_id(db, data_source_id)
    except ds_service.DataSourceError as exc:
        return _error_response(exc)


@router.get("/{data_source_id}/schemas", response_model=SchemaListResponse)
def get_schemas(
    data_source_id: uuid.UUID,
    user: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> SchemaListResponse | JSONResponse:
    try:
        return metadata_service.list_schemas(db, user.roles, data_source_id)
    except ds_service.DataSourceError as exc:
        return _error_response(exc)
    except VisibilityError as exc:
        return _visibility_response(exc)


@router.get("/{data_source_id}/tables", response_model=TableListResponse)
def get_tables(
    data_source_id: uuid.UUID,
    user: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
    schema: str = "",
) -> TableListResponse | JSONResponse:
    try:
        return metadata_service.list_tables(db, user.roles, data_source_id, schema)
    except ds_service.DataSourceError as exc:
        return _error_response(exc)
    except VisibilityError as exc:
        return _visibility_response(exc)


@router.get("/{data_source_id}/columns", response_model=ColumnListResponse)
def get_columns(
    data_source_id: uuid.UUID,
    user: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
    schema: str = "",
    table: str = "",
) -> ColumnListResponse | JSONResponse:
    try:
        return metadata_service.list_columns(db, user.roles, data_source_id, schema, table)
    except ds_service.DataSourceError as exc:
        return _error_response(exc)
    except VisibilityError as exc:
        return _visibility_response(exc)
