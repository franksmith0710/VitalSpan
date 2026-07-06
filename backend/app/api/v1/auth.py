from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth.jwt import DEFAULT_EXPIRES_MINUTES, create_access_token
from app.auth.login import service as login_service
from app.auth.models import get_meta_session

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=128)
    password: str = Field(min_length=1)


class LoginResponse(BaseModel):
    access_token: str = Field(serialization_alias="accessToken")
    token_type: str = Field(default="bearer", serialization_alias="tokenType")
    expires_in: int = Field(serialization_alias="expiresIn")

    model_config = {"populate_by_name": True}


def _db() -> Session:
    session = get_meta_session()
    try:
        yield session
    finally:
        session.close()


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Annotated[Session, Depends(_db)]) -> LoginResponse | JSONResponse:
    try:
        user = login_service.authenticate(db, payload.username, payload.password)
    except login_service.LoginError as exc:
        return JSONResponse(
            status_code=exc.status,
            content={"code": exc.code, "message": exc.message, "detail": None},
        )
    token = create_access_token(str(user.id), user.username)
    return LoginResponse(
        access_token=token,
        expires_in=DEFAULT_EXPIRES_MINUTES * 60,
    )
