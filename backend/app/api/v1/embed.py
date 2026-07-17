from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Query, Request, status
from fastapi.responses import JSONResponse

from app.auth.models import get_meta_session
from app.integration import embed_resolve
from app.integration import embed_token as et
from app.integration.errors import IntegrationError
from app.query import service as query_service
from app.query.schemas import ExecuteRequest, ExecuteResponse, QueryError

from app.auth.deps import UserContext, require_permission

PERM_READ = "dashboard:read"

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
    actor: Annotated[UserContext, Depends(require_permission(PERM_READ))],
    origin: Annotated[str | None, Header(alias="Origin")] = None,
):
    try:
        return et.issue_embed_token(actor, payload, origin)
    except IntegrationError as exc:
        return _err(exc)


@router.get("/sdk-params")
def get_embed_sdk_params(
    token: str = Query(),
    origin: Annotated[str | None, Header(alias="Origin")] = None,
):
    try:
        return et.resolve_sdk_params(token, origin)
    except IntegrationError as exc:
        return _err(exc)


@router.get("/chart-view")
def get_embed_chart_view(
    token: str = Query(),
    chart_id: UUID | None = Query(default=None, alias="chartId"),
    origin: Annotated[str | None, Header(alias="Origin")] = None,
):
    try:
        meta = et.require_token_meta(token)
        allowed = meta.get("allowed_origins") or []
        if allowed and origin and origin not in allowed:
            raise IntegrationError("EMBED_ORIGIN_DENIED", "Origin not allowed", 403)
        session = get_meta_session()
        try:
            return embed_resolve.resolve_embed_chart_view(session, token, chart_id)
        finally:
            session.close()
    except IntegrationError as exc:
        return _err(exc)


@router.post("/query/execute", response_model=ExecuteResponse)
def embed_query_execute(request: Request, payload: ExecuteRequest):
    token = request.headers.get("X-Embed-Token", "").strip()
    if not token:
        return JSONResponse(
            status_code=401,
            content={"code": "UNAUTHORIZED", "message": "Missing embed token", "detail": None},
        )
    try:
        actor = et.resolve_embed_actor(token)
        session = get_meta_session()
        try:
            return query_service.execute_query(session, actor, payload)
        except QueryError as exc:
            return JSONResponse(
                status_code=exc.status,
                content={"code": exc.code, "message": exc.message, "detail": None},
            )
        finally:
            session.close()
    except IntegrationError as exc:
        return _err(exc)
