from __future__ import annotations

from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query, Response
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy.orm import Session

from app.auth.deps import UserContext, get_current_user
from app.auth.im_oauth.bindings import delete_binding
from app.auth.im_oauth.oauth import ImOAuthError
from app.auth.im_oauth.service import (
    AuthorizeUrlOut,
    DeviceAuthCompleteIn,
    DeviceAuthCompleteOut,
    DeviceAuthStartOut,
    ImBindingsOut,
    complete_feishu_device_auth_session,
    list_user_im_bindings,
    start_authorize,
    start_feishu_device_auth_session,
)
from app.auth.models import get_meta_session
from app.auth.profile import service as profile_service

router = APIRouter(tags=["auth"])

ImChannelPath = Literal["dingtalk", "wecom", "feishu"]


def _db() -> Session:
    session = get_meta_session()
    try:
        yield session
    finally:
        session.close()


def _oauth_error(exc: ImOAuthError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status,
        content={"code": exc.code, "message": exc.message, "detail": None},
    )


@router.get("/me/im-bindings", response_model=ImBindingsOut)
def read_my_im_bindings(
    current_user: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> ImBindingsOut:
    user_id = profile_service.resolve_actor_user_id(db, current_user.id, current_user.username)
    return list_user_im_bindings(db, user_id)


@router.post("/me/im-bindings/{channel}/authorize-url", response_model=AuthorizeUrlOut)
def authorize_url_my_im_binding(
    channel: ImChannelPath,
    current_user: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
    redirect_after: str | None = Query(default=None, alias="redirectAfter"),
) -> AuthorizeUrlOut | JSONResponse:
    try:
        user_id = profile_service.resolve_actor_user_id(db, current_user.id, current_user.username)
        url = start_authorize(
            db,
            user_id=user_id,
            channel=channel,
            redirect_after=redirect_after,
        )
        return AuthorizeUrlOut(authorize_url=url)
    except ImOAuthError as exc:
        return _oauth_error(exc)


@router.get("/me/im-bindings/{channel}/authorize", response_model=None)
def authorize_my_im_binding(
    channel: ImChannelPath,
    current_user: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
    redirect_after: str | None = Query(default=None, alias="redirectAfter"),
) -> RedirectResponse | JSONResponse:
    try:
        user_id = profile_service.resolve_actor_user_id(db, current_user.id, current_user.username)
        url = start_authorize(
            db,
            user_id=user_id,
            channel=channel,
            redirect_after=redirect_after,
        )
        return RedirectResponse(url=url, status_code=302)
    except ImOAuthError as exc:
        return _oauth_error(exc)


@router.delete("/me/im-bindings/{channel}", status_code=204, response_model=None)
def delete_my_im_binding(
    channel: ImChannelPath,
    current_user: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> Response:
    user_id = profile_service.resolve_actor_user_id(db, current_user.id, current_user.username)
    delete_binding(db, user_id=user_id, channel=channel)
    db.commit()
    return Response(status_code=204)


@router.post("/me/im-bindings/feishu/device-auth/start", response_model=DeviceAuthStartOut)
def start_feishu_device_binding(
    current_user: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> DeviceAuthStartOut | JSONResponse:
    try:
        user_id = profile_service.resolve_actor_user_id(db, current_user.id, current_user.username)
        return start_feishu_device_auth_session(db, user_id=user_id)
    except ImOAuthError as exc:
        return _oauth_error(exc)


@router.post("/me/im-bindings/feishu/device-auth/complete", response_model=DeviceAuthCompleteOut)
def complete_feishu_device_binding(
    payload: DeviceAuthCompleteIn,
    current_user: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> DeviceAuthCompleteOut | JSONResponse:
    try:
        user_id = profile_service.resolve_actor_user_id(db, current_user.id, current_user.username)
        return complete_feishu_device_auth_session(
            db,
            user_id=user_id,
            session_id=payload.session_id,
        )
    except ImOAuthError as exc:
        return _oauth_error(exc)
