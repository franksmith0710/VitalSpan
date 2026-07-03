from __future__ import annotations

import uuid
import uuid as uuid_mod
from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse, Response
from sqlalchemy.orm import Session

from app.auth.deps import UserContext, get_current_user
from app.auth.models import get_meta_session
from app.auth.schemas import UserCreate, UserOrgAssign, UserOrgResponse, UserOut, UserRoleOut, UserRolesReplace, UserRolesResponse
from app.auth.users import service as user_service
from app.core.logging import trace_id_var

router = APIRouter(prefix="/users", tags=["auth"])


def _db() -> Session:
    session = get_meta_session()
    try:
        yield session
    finally:
        session.close()


def _user_error_response(exc: user_service.UserError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status,
        content={"code": exc.code, "message": exc.message, "detail": None},
    )


def _binding_context(actor: UserContext) -> dict[str, str | list[str] | None]:
    trace = trace_id_var.get() or uuid_mod.uuid4().hex
    return {
        "actor_id": actor.id,
        "actor_username": actor.username,
        "actor_roles": actor.roles,
        "trace_id": trace,
    }


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> UserOut | JSONResponse:
    try:
        user = user_service.create_user(db, payload)
    except user_service.UserError as exc:
        return _user_error_response(exc)
    return UserOut.model_validate(user)


@router.get("/{user_id}/roles", response_model=UserRolesResponse)
def list_user_roles(
    user_id: uuid.UUID,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> UserRolesResponse | JSONResponse:
    try:
        roles = user_service.list_user_roles(db, user_id)
    except user_service.UserError as exc:
        return _user_error_response(exc)
    items = [UserRoleOut(id=r.id, code=r.code, name=r.name) for r in roles]
    return UserRolesResponse(items=items)


@router.put("/{user_id}/roles", response_model=UserRolesResponse)
def replace_user_roles(
    user_id: uuid.UUID,
    payload: UserRolesReplace,
    actor: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> UserRolesResponse | JSONResponse:
    ctx = _binding_context(actor)
    try:
        roles = user_service.replace_user_roles(db, user_id, payload.role_ids, **ctx)
    except user_service.UserError as exc:
        return _user_error_response(exc)
    items = [UserRoleOut(id=r.id, code=r.code, name=r.name) for r in roles]
    return UserRolesResponse(items=items)


@router.post("/{user_id}/roles/{role_id}", status_code=status.HTTP_200_OK, response_model=None)
def bind_user_role(
    user_id: uuid.UUID,
    role_id: uuid.UUID,
    actor: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> JSONResponse | dict[str, str]:
    ctx = _binding_context(actor)
    try:
        user_service.bind_role(db, user_id, role_id, **ctx)
    except user_service.UserError as exc:
        return _user_error_response(exc)
    return {"status": "ok"}


@router.delete("/{user_id}/roles/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
def unbind_user_role(
    user_id: uuid.UUID,
    role_id: uuid.UUID,
    actor: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> Response:
    ctx = _binding_context(actor)
    try:
        user_service.unbind_role(db, user_id, role_id, **ctx)
    except user_service.UserError as exc:
        return _user_error_response(exc)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.put("/{user_id}/org", response_model=UserOrgResponse)
def assign_user_org(
    user_id: uuid.UUID,
    payload: UserOrgAssign,
    actor: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> UserOrgResponse | JSONResponse:
    ctx = _binding_context(actor)
    try:
        user_service.assign_user_org(db, user_id, payload.org_node_id, **ctx)
        node = user_service.get_user_org(db, user_id)
    except user_service.UserError as exc:
        return _user_error_response(exc)
    assert node is not None
    return UserOrgResponse.model_validate(node)


@router.get("/{user_id}/org", response_model=UserOrgResponse)
def get_user_org(
    user_id: uuid.UUID,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> UserOrgResponse | JSONResponse:
    try:
        node = user_service.get_user_org(db, user_id)
    except user_service.UserError as exc:
        return _user_error_response(exc)
    if node is None:
        return JSONResponse(
            status_code=404,
            content={"code": "USER_ORG_NOT_SET", "message": "User has no org assignment", "detail": None},
        )
    return UserOrgResponse.model_validate(node)


@router.delete("/{user_id}/org", status_code=status.HTTP_204_NO_CONTENT)
def clear_user_org_route(
    user_id: uuid.UUID,
    actor: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> Response:
    ctx = _binding_context(actor)
    try:
        user_service.clear_user_org(db, user_id, **ctx)
    except user_service.UserError as exc:
        return _user_error_response(exc)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
