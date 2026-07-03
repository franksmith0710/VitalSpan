from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse, Response
from sqlalchemy.orm import Session

from app.auth.deps import UserContext, get_current_user
from app.auth.models import get_meta_session
from app.auth.roles import service as role_service
from app.auth.schemas import RoleCreate, RoleListResponse, RoleOut, RoleUpdate

router = APIRouter(prefix="/roles", tags=["auth"])


def _db() -> Session:
    session = get_meta_session()
    try:
        yield session
    finally:
        session.close()


def _role_error_response(exc: role_service.RoleError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status,
        content={"code": exc.code, "message": exc.message, "detail": None},
    )


@router.get("", response_model=RoleListResponse)
def list_roles(
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> RoleListResponse:
    items = [RoleOut.model_validate(r) for r in role_service.list_roles(db)]
    return RoleListResponse(items=items)


@router.post("", response_model=RoleOut, status_code=status.HTTP_201_CREATED)
def create_role(
    payload: RoleCreate,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> RoleOut | JSONResponse:
    try:
        role = role_service.create_role(db, payload)
    except role_service.RoleError as exc:
        return _role_error_response(exc)
    return RoleOut.model_validate(role)


@router.get("/{role_id}", response_model=RoleOut)
def get_role(
    role_id: uuid.UUID,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> RoleOut | JSONResponse:
    try:
        role = role_service.get_role(db, role_id)
    except role_service.RoleError as exc:
        return _role_error_response(exc)
    return RoleOut.model_validate(role)


@router.put("/{role_id}", response_model=RoleOut)
def update_role(
    role_id: uuid.UUID,
    payload: RoleUpdate,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> RoleOut | JSONResponse:
    try:
        role = role_service.update_role(db, role_id, payload)
    except role_service.RoleError as exc:
        return _role_error_response(exc)
    return RoleOut.model_validate(role)


@router.delete("/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_role(
    role_id: uuid.UUID,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> Response:
    try:
        role_service.delete_role(db, role_id)
    except role_service.RoleError as exc:
        return _role_error_response(exc)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
