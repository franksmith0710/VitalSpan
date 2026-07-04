from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Header, Query, status
from fastapi.responses import JSONResponse

from app.auth.deps import UserContext, get_current_user
from app.reports.catalog.errors import ReportCatalogError
from app.reports.catalog.schemas import CatalogNodeCreate, CatalogNodeMove, CatalogNodeOut, CatalogNodeUpdate
from app.reports.catalog import service as catalog_service
from app.reports.errors import ReportBatchError, ReportExtensionError
from app.reports.extension.schemas import ExtensionConfigUpsert
from app.reports.extension import service as extension_service
from app.reports.batch.schemas import BatchCreateReportsIn
from app.reports.batch import service as batch_service
from app.reports.scheduler.errors import ScheduleError
from app.reports.scheduler.schemas import ScheduleCreate, ScheduleTransitionIn
from app.reports.scheduler import service as scheduler_service

router = APIRouter(prefix="/reports", tags=["reports"])


def _catalog_error(exc: ReportCatalogError) -> JSONResponse:
    return JSONResponse(status_code=exc.status, content={"code": exc.code, "message": exc.message, "detail": None})


def _schedule_error(exc: ScheduleError) -> JSONResponse:
    return JSONResponse(status_code=exc.status, content={"code": exc.code, "message": exc.message, "detail": None})


def _extension_error(exc: ReportExtensionError) -> JSONResponse:
    return JSONResponse(status_code=exc.status, content={"code": exc.code, "message": exc.message, "detail": None})


def _batch_error(exc: ReportBatchError) -> JSONResponse:
    return JSONResponse(status_code=exc.status, content={"code": exc.code, "message": exc.message, "detail": None})


@router.get("/catalog/nodes/{node_id}/extension", response_model=None)
def get_node_extension(node_id: uuid.UUID, _: Annotated[UserContext, Depends(get_current_user)]):
    try:
        return extension_service.get_extension(node_id)
    except ReportExtensionError as exc:
        return _extension_error(exc)


@router.put("/catalog/nodes/{node_id}/extension", response_model=None)
def upsert_node_extension(
    node_id: uuid.UUID,
    payload: ExtensionConfigUpsert,
    _: Annotated[UserContext, Depends(get_current_user)],
):
    try:
        return extension_service.upsert(node_id, payload)
    except ReportExtensionError as exc:
        return _extension_error(exc)


@router.delete("/catalog/nodes/{node_id}/extension", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def delete_node_extension(node_id: uuid.UUID, _: Annotated[UserContext, Depends(get_current_user)]):
    try:
        extension_service.delete_extension(node_id)
        return None
    except ReportExtensionError as exc:
        return _extension_error(exc)


@router.post("/batch", status_code=status.HTTP_201_CREATED, response_model=None)
def batch_create_reports(
    payload: BatchCreateReportsIn,
    _: Annotated[UserContext, Depends(get_current_user)],
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
):
    try:
        return batch_service.batch_create(payload, idempotency_key)
    except ReportBatchError as exc:
        return _batch_error(exc)


@router.get("/catalog/nodes", response_model=list[CatalogNodeOut])
def list_catalog_nodes(
    _: Annotated[UserContext, Depends(get_current_user)],
    parent_id: uuid.UUID | None = Query(default=None, alias="parentId"),
):
    return catalog_service.list_nodes(parent_id)


@router.post("/catalog/nodes", status_code=status.HTTP_201_CREATED, response_model=None)
def create_catalog_node(
    payload: CatalogNodeCreate,
    _: Annotated[UserContext, Depends(get_current_user)],
):
    try:
        return catalog_service.create_node(payload)
    except ReportCatalogError as exc:
        return _catalog_error(exc)


@router.get("/catalog/nodes/{node_id}", response_model=None)
def get_catalog_node(
    node_id: uuid.UUID,
    _: Annotated[UserContext, Depends(get_current_user)],
):
    try:
        return catalog_service.get_node(node_id)
    except ReportCatalogError as exc:
        return _catalog_error(exc)


@router.patch("/catalog/nodes/{node_id}", response_model=None)
def update_catalog_node(
    node_id: uuid.UUID,
    payload: CatalogNodeUpdate,
    _: Annotated[UserContext, Depends(get_current_user)],
):
    try:
        return catalog_service.update_node(node_id, payload)
    except ReportCatalogError as exc:
        return _catalog_error(exc)


@router.delete("/catalog/nodes/{node_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def delete_catalog_node(
    node_id: uuid.UUID,
    _: Annotated[UserContext, Depends(get_current_user)],
):
    try:
        catalog_service.delete_node(node_id)
        return None
    except ReportCatalogError as exc:
        return _catalog_error(exc)


@router.post("/catalog/nodes/{node_id}/move", response_model=None)
def move_catalog_node(
    node_id: uuid.UUID,
    payload: CatalogNodeMove,
    _: Annotated[UserContext, Depends(get_current_user)],
):
    try:
        return catalog_service.move_node(node_id, payload)
    except ReportCatalogError as exc:
        return _catalog_error(exc)


@router.post("/schedules", status_code=status.HTTP_201_CREATED, response_model=None)
def create_schedule(
    payload: ScheduleCreate,
    _: Annotated[UserContext, Depends(get_current_user)],
):
    try:
        return scheduler_service.create_schedule(payload)
    except ReportCatalogError as exc:
        return _catalog_error(exc)
    except ScheduleError as exc:
        return _schedule_error(exc)


@router.get("/schedules/{schedule_id}", response_model=None)
def get_schedule(
    schedule_id: uuid.UUID,
    _: Annotated[UserContext, Depends(get_current_user)],
):
    try:
        return scheduler_service.get_schedule(schedule_id)
    except ScheduleError as exc:
        return _schedule_error(exc)


@router.post("/schedules/{schedule_id}/transition", response_model=None)
def transition_schedule(
    schedule_id: uuid.UUID,
    payload: ScheduleTransitionIn,
    _: Annotated[UserContext, Depends(get_current_user)],
):
    try:
        return scheduler_service.transition_schedule(schedule_id, payload.action)
    except ScheduleError as exc:
        return _schedule_error(exc)
