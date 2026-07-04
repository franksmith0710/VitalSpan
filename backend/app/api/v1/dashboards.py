from __future__ import annotations

import uuid
from typing import Annotated, Generator

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse, Response
from sqlalchemy.orm import Session

from app.auth.deps import UserContext, get_current_user
from app.dashboard import service as dash_service
from app.dashboard.schemas import DashboardCreate, DashboardLayoutUpdate, DashboardUpdate
from app.dashboard.theme.errors import ThemeAnalysisError
from app.dashboard.theme import service as theme_service
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


def _theme_error(exc: ThemeAnalysisError) -> JSONResponse:
    detail = {"fields": exc.fields} if exc.fields else None
    return JSONResponse(status_code=exc.status, content={"code": exc.code, "message": exc.message, "detail": detail})


@router.post("/theme-analysis/execute-plan", response_model=None)
def execute_theme_plan(
    payload: dict,
    _: Annotated[UserContext, Depends(get_current_user)] = None,
    db: Annotated[Session, Depends(_db)] = None,
):
    from app.dashboard.theme.execute import build_theme_execute_plan

    ref_type = payload.get("refType", "dashboard")
    ref_id = uuid.UUID(str(payload["refId"]))
    try:
        return build_theme_execute_plan(db, ref_type, ref_id)
    except ThemeAnalysisError as exc:
        return _theme_error(exc)


@router.post("/theme-analysis/validate", response_model=None)
def validate_theme_analysis(
    payload: dict,
    _: Annotated[UserContext, Depends(get_current_user)],
):
    try:
        return theme_service.validate_theme_config(payload)
    except ThemeAnalysisError as exc:
        return _theme_error(exc)


@router.put("/theme-analysis", response_model=None)
def save_theme_analysis(
    payload: dict,
    user: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
):
    try:
        return theme_service.save_theme_config(db, payload, user)
    except ThemeAnalysisError as exc:
        return _theme_error(exc)


@router.get("/theme-analysis", response_model=None)
def get_theme_analysis(
    ref_type: str = Query(default="dashboard", alias="refType"),
    ref_id: uuid.UUID = Query(alias="refId"),
    user: Annotated[UserContext, Depends(get_current_user)] = None,
    db: Annotated[Session, Depends(_db)] = None,
):
    from app.dashboard.theme.acl import assert_theme_action

    try:
        assert_theme_action(user, "read")
        return theme_service.get_theme_config(db, ref_type, ref_id)
    except ThemeAnalysisError as exc:
        return _theme_error(exc)


@router.get("/theme-analysis/chart-bindings", response_model=None)
def get_theme_chart_bindings(
    ref_type: str = Query(default="dashboard", alias="refType"),
    ref_id: uuid.UUID = Query(alias="refId"),
    _: Annotated[UserContext, Depends(get_current_user)] = None,
    db: Annotated[Session, Depends(_db)] = None,
):
    try:
        return theme_service.get_chart_bindings(db, ref_type, ref_id)
    except ThemeAnalysisError as exc:
        return _theme_error(exc)
    except Exception as exc:
        from app.query.config_store.schemas import ConfigError
        if isinstance(exc, ConfigError) and exc.code == "CONFIG_NOT_FOUND":
            return JSONResponse(status_code=404, content={"code": "CONFIG_NOT_FOUND", "message": exc.message, "detail": None})
        raise


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
