from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse, Response
from sqlalchemy.orm import Session

from app.auth.deps import UserContext, get_current_user
from app.datasources.models import get_meta_session
from app.metadata.glossary import service as glossary_service
from app.metadata.glossary.schemas import GlossaryError, TermCreate, TermListResponse, TermOut, TermUpdate
from app.metadata.themes import service as themes_service
from app.metadata.themes.schemas import (
    ThemeCreate,
    ThemeError,
    ThemeListResponse,
    ThemeMove,
    ThemeOut,
    ThemeUpdate,
)

router = APIRouter(prefix="/metadata", tags=["metadata"])


def _db() -> Session:
    session = get_meta_session()
    try:
        yield session
    finally:
        session.close()


def _glossary_error(exc: GlossaryError) -> JSONResponse:
    detail = {"fields": exc.fields} if exc.fields else None
    return JSONResponse(
        status_code=exc.status,
        content={"code": exc.code, "message": exc.message, "detail": detail},
    )


def _theme_error(exc: ThemeError) -> JSONResponse:
    detail = {"fields": exc.fields} if exc.fields else None
    return JSONResponse(
        status_code=exc.status,
        content={"code": exc.code, "message": exc.message, "detail": detail},
    )


@router.get("/glossary", response_model=TermListResponse)
def list_glossary_terms(
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
    code_prefix: str | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> TermListResponse:
    items, total = glossary_service.list_terms(db, code_prefix, limit, offset)
    return TermListResponse(items=[TermOut.model_validate(t) for t in items], total=total)


@router.post("/glossary", response_model=TermOut, status_code=status.HTTP_201_CREATED)
def create_glossary_term(
    payload: TermCreate,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> TermOut | JSONResponse:
    try:
        term = glossary_service.create_term(db, payload)
    except GlossaryError as exc:
        return _glossary_error(exc)
    return TermOut.model_validate(term)


@router.get("/glossary/{term_id}", response_model=TermOut)
def get_glossary_term(
    term_id: uuid.UUID,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> TermOut | JSONResponse:
    try:
        term = glossary_service.get_term(db, term_id)
    except GlossaryError as exc:
        return _glossary_error(exc)
    return TermOut.model_validate(term)


@router.put("/glossary/{term_id}", response_model=TermOut)
def update_glossary_term(
    term_id: uuid.UUID,
    payload: TermUpdate,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> TermOut | JSONResponse:
    try:
        term = glossary_service.update_term(db, term_id, payload)
    except GlossaryError as exc:
        return _glossary_error(exc)
    return TermOut.model_validate(term)


@router.delete("/glossary/{term_id}", response_model=None)
def delete_glossary_term(
    term_id: uuid.UUID,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> Response | JSONResponse:
    try:
        glossary_service.delete_term(db, term_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except GlossaryError as exc:
        return _glossary_error(exc)


@router.get("/themes", response_model=ThemeListResponse)
def list_theme_nodes(
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
    parent_id: str | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> ThemeListResponse:
    items, total = themes_service.list_theme_nodes(db, parent_id, limit, offset)
    return ThemeListResponse(items=[ThemeOut.model_validate(n) for n in items], total=total)


@router.post("/themes", response_model=ThemeOut, status_code=status.HTTP_201_CREATED)
def create_theme_node(
    payload: ThemeCreate,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> ThemeOut | JSONResponse:
    try:
        node = themes_service.create_theme_node(db, payload)
    except ThemeError as exc:
        return _theme_error(exc)
    return ThemeOut.model_validate(node)


@router.get("/themes/{node_id}", response_model=ThemeOut)
def get_theme_node(
    node_id: uuid.UUID,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> ThemeOut | JSONResponse:
    try:
        node = themes_service.get_theme_node(db, node_id)
    except ThemeError as exc:
        return _theme_error(exc)
    return ThemeOut.model_validate(node)


@router.put("/themes/{node_id}", response_model=ThemeOut)
def update_theme_node(
    node_id: uuid.UUID,
    payload: ThemeUpdate,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> ThemeOut | JSONResponse:
    try:
        node = themes_service.update_theme_node(db, node_id, payload)
    except ThemeError as exc:
        return _theme_error(exc)
    return ThemeOut.model_validate(node)


@router.delete("/themes/{node_id}", response_model=None)
def delete_theme_node(
    node_id: uuid.UUID,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> Response | JSONResponse:
    try:
        themes_service.delete_theme_node(db, node_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except ThemeError as exc:
        return _theme_error(exc)


@router.post("/themes/{node_id}/move", response_model=ThemeOut)
def move_theme_node(
    node_id: uuid.UUID,
    payload: ThemeMove,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> ThemeOut | JSONResponse:
    try:
        node = themes_service.move_theme_node(db, node_id, payload.parent_id, payload.sort_order)
    except ThemeError as exc:
        return _theme_error(exc)
    return ThemeOut.model_validate(node)
