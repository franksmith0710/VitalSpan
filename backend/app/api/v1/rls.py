from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse, Response
from sqlalchemy.orm import Session

from app.auth.deps import UserContext, get_current_user
from app.auth.models import get_meta_session
from app.auth.rls.dimensions import service as dim_service
from app.auth.schemas import (
    DimensionTypeCreate,
    DimensionTypeListResponse,
    DimensionTypeOut,
    DimensionTypeUpdate,
)

router = APIRouter(prefix="/rls", tags=["auth"])
dimensions_router = APIRouter(prefix="/dimensions")


def _db() -> Session:
    session = get_meta_session()
    try:
        yield session
    finally:
        session.close()


def _dim_error_response(exc: dim_service.DimensionError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status,
        content={"code": exc.code, "message": exc.message, "detail": None},
    )


@dimensions_router.get("", response_model=DimensionTypeListResponse)
def list_dimensions(
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> DimensionTypeListResponse:
    items = [DimensionTypeOut.model_validate(d) for d in dim_service.list_dimension_types(db)]
    return DimensionTypeListResponse(items=items)


@dimensions_router.post("", response_model=DimensionTypeOut, status_code=status.HTTP_201_CREATED)
def create_dimension(
    payload: DimensionTypeCreate,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> DimensionTypeOut | JSONResponse:
    try:
        dim = dim_service.create_dimension_type(db, payload)
    except dim_service.DimensionError as exc:
        return _dim_error_response(exc)
    return DimensionTypeOut.model_validate(dim)


@dimensions_router.get("/{dim_id}", response_model=DimensionTypeOut)
def get_dimension(
    dim_id: uuid.UUID,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> DimensionTypeOut | JSONResponse:
    try:
        dim = dim_service.get_dimension_type(db, dim_id)
    except dim_service.DimensionError as exc:
        return _dim_error_response(exc)
    return DimensionTypeOut.model_validate(dim)


@dimensions_router.put("/{dim_id}", response_model=DimensionTypeOut)
def update_dimension(
    dim_id: uuid.UUID,
    payload: DimensionTypeUpdate,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> DimensionTypeOut | JSONResponse:
    try:
        dim = dim_service.update_dimension_type(db, dim_id, payload)
    except dim_service.DimensionError as exc:
        return _dim_error_response(exc)
    return DimensionTypeOut.model_validate(dim)


@dimensions_router.delete("/{dim_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_dimension(
    dim_id: uuid.UUID,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> Response:
    try:
        dim_service.delete_dimension_type(db, dim_id)
    except dim_service.DimensionError as exc:
        return _dim_error_response(exc)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


router.include_router(dimensions_router)
