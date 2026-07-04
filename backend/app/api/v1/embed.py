from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Header, Query, status
from fastapi.responses import JSONResponse

from app.auth.deps import UserContext, get_current_user
from app.integration import embed_token as et
from app.integration.errors import IntegrationError

router = APIRouter(prefix="/embed", tags=["integration", "IF-04"])


def _err(exc: IntegrationError) -> JSONResponse:
    detail = {"fields": exc.fields} if exc.fields else None
    return JSONResponse(
        status_code=exc.status,
        content={"code": exc.code, "message": exc.message, "detail": detail},
    )


@router.post("/token", status_code=status.HTTP_201_CREATED, response_model=et.EmbedTokenOut)
def post_embed_token(
    payload: et.EmbedTokenIn,
    actor: Annotated[UserContext, Depends(get_current_user)],
    origin: Annotated[str | None, Header(alias="Origin")] = None,
):
    try:
        return et.issue_embed_token(actor, payload, origin)
    except IntegrationError as exc:
        return _err(exc)


@router.get("/sdk-params")
def get_embed_sdk_params(
    _: Annotated[UserContext, Depends(get_current_user)],
    token: str = Query(),
):
    try:
        return et.resolve_sdk_params(token)
    except IntegrationError as exc:
        return _err(exc)
