from __future__ import annotations

import uuid
from typing import Annotated, Generator

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse, Response
from sqlalchemy.orm import Session

from app.auth.deps import UserContext, get_current_user
from app.dashboard import service as dash_service
from app.dashboard.schemas import DashboardCreate, DashboardLayoutUpdate, DashboardUpdate
from app.datasources.models import get_meta_session

router = APIRouter(prefix="/dashboards", tags=["dashboards"])


def _db() -> Generator[Session, None, None]:
    session = get_meta_session()
    try:
        yield session
    finally:
        session.close()


def _error_response(exc: dash_service.DashboardError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status,
        content={"code": exc.code, "message": exc.message, "detail": None},
    )


def _parse_user_id(user: UserContext) -> uuid.UUID | None:
    try:
        return uuid.UUID(user.id)
    except ValueError:
        return None


@router.get("")
def list_dashboards(
    user: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    return dash_service.list_dashboards(db, limit=limit, offset=offset)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_dashboard(
    payload: DashboardCreate,
    user: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
):
    try:
        return dash_service.create_dashboard(
            db, payload, created_by=_parse_user_id(user),
        )
    except dash_service.DashboardError as exc:
        return _error_response(exc)


@router.get("/{dashboard_id}")
def get_dashboard(
    dashboard_id: uuid.UUID,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
):
    try:
        return dash_service.get_dashboard(db, dashboard_id)
    except dash_service.DashboardError as exc:
        return _error_response(exc)


@router.put("/{dashboard_id}")
def update_dashboard(
    dashboard_id: uuid.UUID,
    payload: DashboardUpdate,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
):
    try:
        return dash_service.update_dashboard(db, dashboard_id, payload)
    except dash_service.DashboardError as exc:
        return _error_response(exc)


@router.delete("/{dashboard_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_dashboard(
    dashboard_id: uuid.UUID,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
):
    try:
        dash_service.delete_dashboard(db, dashboard_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except dash_service.DashboardError as exc:
        return _error_response(exc)


@router.put("/{dashboard_id}/layout")
def update_layout(
    dashboard_id: uuid.UUID,
    payload: DashboardLayoutUpdate,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
):
    try:
        return dash_service.update_layout(db, dashboard_id, payload.layout_json)
    except dash_service.DashboardError as exc:
        return _error_response(exc)
