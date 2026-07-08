from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.auth.deps import UserContext, get_current_user
from app.auth.models import get_meta_session
from app.auth.profile import service as profile_service
from app.auth.profile.schemas import MeProfileOut, MeProfileUpdate

router = APIRouter(tags=["auth"])


def _db() -> Session:
    session = get_meta_session()
    try:
        yield session
    finally:
        session.close()


def _profile_error_response(exc: profile_service.ProfileError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status,
        content={"code": exc.code, "message": exc.message, "detail": None},
    )


@router.get("/me", response_model=MeProfileOut)
def read_me(
    current_user: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> MeProfileOut | JSONResponse:
    try:
        return profile_service.build_me_profile(db, uuid.UUID(current_user.id), current_user.roles)
    except profile_service.ProfileError as exc:
        return _profile_error_response(exc)


@router.patch("/me", response_model=MeProfileOut)
def update_me(
    payload: MeProfileUpdate,
    current_user: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> MeProfileOut | JSONResponse:
    try:
        return profile_service.update_me_profile(
            db,
            user_id=uuid.UUID(current_user.id),
            roles=current_user.roles,
            actor_username=current_user.username,
            payload=payload,
        )
    except profile_service.ProfileError as exc:
        return _profile_error_response(exc)
