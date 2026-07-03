from __future__ import annotations

import uuid
from typing import Annotated

import app.datasources  # noqa: F401 — register_builtin_dialects
from fastapi import APIRouter, Depends, Query, Response, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.auth.deps import UserContext, get_current_user
from app.auth.resources.service import VisibilityError
from app.datasources.models import get_meta_session
from app.query import binding_service
from app.query import service as query_service
from app.query.schemas import (
    BindingCreate,
    BindingListResponse,
    BindingOut,
    BindingUpdate,
    ExecuteRequest,
    ExecuteResponse,
    QueryError,
)

router = APIRouter(prefix="/query", tags=["query"])


def _db() -> Session:
    session = get_meta_session()
    try:
        yield session
    finally:
        session.close()


def _error_response(exc: QueryError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status,
        content={"code": exc.code, "message": exc.message, "detail": None},
    )


def _visibility_response(exc: VisibilityError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status,
        content={"code": exc.code, "message": exc.message, "detail": None},
    )


def _parse_user_id(user: UserContext) -> uuid.UUID | None:
    try:
        return uuid.UUID(user.id)
    except ValueError:
        return None


@router.post("/execute", response_model=ExecuteResponse)
def execute_query(
    payload: ExecuteRequest,
    user: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> ExecuteResponse | JSONResponse:
    try:
        return query_service.execute_query(db, user, payload)
    except QueryError as exc:
        return _error_response(exc)


@router.get("/bindings", response_model=BindingListResponse)
def list_bindings(
    user: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    data_source_id: uuid.UUID | None = Query(default=None, alias="dataSourceId"),
) -> BindingListResponse | JSONResponse:
    try:
        return binding_service.list_bindings(
            db, user.roles, limit=limit, offset=offset, data_source_id=data_source_id,
        )
    except QueryError as exc:
        return _error_response(exc)
    except VisibilityError as exc:
        return _visibility_response(exc)


@router.post("/bindings", response_model=BindingOut, status_code=status.HTTP_201_CREATED)
def create_binding(
    payload: BindingCreate,
    user: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> BindingOut | JSONResponse:
    try:
        return binding_service.create_binding(
            db, user.roles, payload, created_by=_parse_user_id(user),
        )
    except QueryError as exc:
        return _error_response(exc)
    except VisibilityError as exc:
        return _visibility_response(exc)


@router.get("/bindings/{binding_id}", response_model=BindingOut)
def get_binding(
    binding_id: uuid.UUID,
    user: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> BindingOut | JSONResponse:
    try:
        return binding_service.get_binding(db, user.roles, binding_id)
    except QueryError as exc:
        return _error_response(exc)


@router.put("/bindings/{binding_id}", response_model=BindingOut)
def update_binding(
    binding_id: uuid.UUID,
    payload: BindingUpdate,
    user: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> BindingOut | JSONResponse:
    try:
        return binding_service.update_binding(db, user.roles, binding_id, payload)
    except QueryError as exc:
        return _error_response(exc)
    except VisibilityError as exc:
        return _visibility_response(exc)


@router.delete("/bindings/{binding_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def delete_binding(
    binding_id: uuid.UUID,
    user: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> Response:
    try:
        binding_service.delete_binding(db, user.roles, binding_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except QueryError as exc:
        return _error_response(exc)
