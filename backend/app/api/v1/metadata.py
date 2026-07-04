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
from app.metadata.dimensions import service as dimension_service
from app.metadata.dimensions.schemas import (
    DimensionCreate,
    DimensionError,
    DimensionListResponse,
    DimensionOut,
    DimensionUpdate,
    DimensionValueListResponse,
    DimensionValueOut,
    DimensionValuesRegister,
)
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


def _dimension_error(exc: DimensionError) -> JSONResponse:
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


@router.get("/dimensions", response_model=DimensionListResponse)
def list_dimensions(
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
    code_prefix: str | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> DimensionListResponse:
    items, total = dimension_service.list_dimensions(db, code_prefix, limit, offset)
    return DimensionListResponse(items=[DimensionOut.model_validate(d) for d in items], total=total)


@router.post("/dimensions", response_model=DimensionOut, status_code=status.HTTP_201_CREATED)
def create_dimension(
    payload: DimensionCreate,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> DimensionOut | JSONResponse:
    try:
        dimension = dimension_service.create_dimension(db, payload)
    except DimensionError as exc:
        return _dimension_error(exc)
    return DimensionOut.model_validate(dimension)


@router.get("/dimensions/{dimension_id}", response_model=DimensionOut)
def get_dimension(
    dimension_id: uuid.UUID,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> DimensionOut | JSONResponse:
    try:
        dimension = dimension_service.get_dimension(db, dimension_id)
    except DimensionError as exc:
        return _dimension_error(exc)
    return DimensionOut.model_validate(dimension)


@router.put("/dimensions/{dimension_id}", response_model=DimensionOut)
def update_dimension(
    dimension_id: uuid.UUID,
    payload: DimensionUpdate,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> DimensionOut | JSONResponse:
    try:
        dimension = dimension_service.update_dimension(db, dimension_id, payload)
    except DimensionError as exc:
        return _dimension_error(exc)
    return DimensionOut.model_validate(dimension)


@router.delete("/dimensions/{dimension_id}", response_model=None)
def delete_dimension(
    dimension_id: uuid.UUID,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> Response | JSONResponse:
    try:
        dimension_service.delete_dimension(db, dimension_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except DimensionError as exc:
        return _dimension_error(exc)


@router.get("/dimensions/{dimension_id}/values", response_model=DimensionValueListResponse)
def list_dimension_values(
    dimension_id: uuid.UUID,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> DimensionValueListResponse | JSONResponse:
    try:
        items, total = dimension_service.list_values(db, dimension_id, limit, offset)
    except DimensionError as exc:
        return _dimension_error(exc)
    return DimensionValueListResponse(
        items=[DimensionValueOut.model_validate(v) for v in items],
        total=total,
    )


@router.post(
    "/dimensions/{dimension_id}/values",
    response_model=DimensionValueListResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_dimension_values(
    dimension_id: uuid.UUID,
    payload: DimensionValuesRegister,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> DimensionValueListResponse | JSONResponse:
    try:
        items = dimension_service.register_values(db, dimension_id, payload.items)
    except DimensionError as exc:
        return _dimension_error(exc)
    return DimensionValueListResponse(
        items=[DimensionValueOut.model_validate(v) for v in items],
        total=len(items),
    )


@router.delete("/dimensions/{dimension_id}/values/{value_id}", response_model=None)
def delete_dimension_value(
    dimension_id: uuid.UUID,
    value_id: uuid.UUID,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> Response | JSONResponse:
    try:
        dimension_service.delete_value(db, dimension_id, value_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except DimensionError as exc:
        return _dimension_error(exc)
