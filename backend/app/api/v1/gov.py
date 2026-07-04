from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from starlette.responses import Response
from sqlalchemy.orm import Session

from app.auth.deps import UserContext, get_current_user
from app.datasources.models import get_meta_session
from app.governance.catalog import service as catalog_service
from app.governance.catalog.schemas import (
    BusRegisterIn,
    BusRegisterOut,
    CatalogEntryCreate,
    CatalogEntryOut,
    CatalogListResponse,
    CategoryListResponse,
)
from app.governance.query_design import service as query_design_service
from app.governance.query_design.schemas import (
    GovQueryDesignError,
    PreviewExecuteIn,
    PreviewExecuteOut,
    VisualQueryDesignIn,
    VisualQueryDesignOut,
)
from app.governance.publish.errors import PublishError
from app.governance.publish import service as publish_service
from app.governance.publish.notifications import list_notifications
from app.governance.publish.schemas import (
    PublishActionOut,
    PublishNotificationListOut,
    PublishNotificationOut,
    PublishStatusOut,
)
from app.governance.workflow.errors import WorkflowError
from app.governance.workflow import service as workflow_service
from app.governance.workflow.node_roles import describe_node_roles
from app.governance.workflow.schemas import (
    NodeRoleOut,
    WorkflowInstanceCreateIn,
    WorkflowInstanceOut,
    WorkflowNodeRolesOut,
    WorkflowTemplateListOut,
    WorkflowTemplateOut,
    WorkflowTemplateValidateIn,
    WorkflowTransitionIn,
)

router = APIRouter(prefix="/gov", tags=["governance", "IF-06"])


def _db() -> Session:
    session = get_meta_session()
    try:
        yield session
    finally:
        session.close()


def _catalog_error_response(exc: catalog_service.CatalogError) -> JSONResponse:
    detail = None
    if getattr(exc, "trace_id", None):
        detail = {"traceId": exc.trace_id}
    return JSONResponse(
        status_code=exc.status,
        content={"code": exc.code, "message": exc.message, "detail": detail},
    )


def _assert_bus_register_admin(actor: UserContext) -> None:
    if "admin" not in actor.roles:
        raise catalog_service.CatalogError(
            "BUS_REGISTER_FORBIDDEN", "Bus registration requires admin role", 403
        )


@router.get("/catalog/categories", response_model=CategoryListResponse)
def list_catalog_categories(
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> CategoryListResponse | JSONResponse:
    return catalog_service.list_categories(db)


@router.get("/catalog/entries", response_model=CatalogListResponse)
def list_catalog_entries(
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
    category: str | None = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> CatalogListResponse | JSONResponse:
    try:
        return catalog_service.list_entries(db, category=category, limit=limit, offset=offset)
    except catalog_service.CatalogError as exc:
        return _catalog_error_response(exc)


@router.post("/catalog/entries", status_code=201, response_model=CatalogEntryOut)
def create_catalog_entry(
    payload: CatalogEntryCreate,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> CatalogEntryOut | JSONResponse:
    try:
        return catalog_service.create_entry(db, payload)
    except catalog_service.CatalogError as exc:
        return _catalog_error_response(exc)


@router.get("/catalog/entries/{entry_id}", response_model=CatalogEntryOut)
def get_catalog_entry(
    entry_id: uuid.UUID,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> CatalogEntryOut | JSONResponse:
    try:
        return catalog_service.get_entry(db, entry_id)
    except catalog_service.CatalogError as exc:
        return _catalog_error_response(exc)


@router.delete("/catalog/entries/{entry_id}", response_model=None)
def delete_catalog_entry(
    entry_id: uuid.UUID,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> Response | JSONResponse:
    try:
        catalog_service.delete_entry(db, entry_id)
        return Response(status_code=204)
    except catalog_service.CatalogError as exc:
        return _catalog_error_response(exc)


@router.post("/bus/register", response_model=BusRegisterOut)
def register_bus(
    payload: BusRegisterIn,
    actor: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> BusRegisterOut | JSONResponse:
    try:
        _assert_bus_register_admin(actor)
        out, created = catalog_service.register_entry_to_bus(db, payload.catalog_entry_id)
        return JSONResponse(
            status_code=201 if created else 200,
            content=out.model_dump(by_alias=True, mode="json"),
        )
    except catalog_service.CatalogError as exc:
        return _catalog_error_response(exc)


def _gov_query_design_error(exc: GovQueryDesignError) -> JSONResponse:
    detail = {"fields": exc.fields} if exc.fields else None
    return JSONResponse(
        status_code=exc.status,
        content={"code": exc.code, "message": exc.message, "detail": detail},
    )


def _publish_error_response(exc: PublishError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status,
        content={"code": exc.code, "message": exc.message, "detail": None},
    )


@router.post("/publish/entries/{entry_id}/submit", response_model=PublishActionOut)
def publish_submit(
    entry_id: uuid.UUID,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> PublishActionOut | JSONResponse:
    try:
        return publish_service.submit_entry(db, entry_id)
    except PublishError as exc:
        return _publish_error_response(exc)


@router.post("/publish/entries/{entry_id}/approve", response_model=PublishActionOut)
def publish_approve(
    entry_id: uuid.UUID,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> PublishActionOut | JSONResponse:
    try:
        return publish_service.approve_entry(db, entry_id)
    except PublishError as exc:
        return _publish_error_response(exc)


@router.post("/publish/entries/{entry_id}/reject", response_model=PublishActionOut)
def publish_reject(
    entry_id: uuid.UUID,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> PublishActionOut | JSONResponse:
    try:
        return publish_service.reject_entry(db, entry_id)
    except PublishError as exc:
        return _publish_error_response(exc)


@router.get("/publish/entries/{entry_id}/status", response_model=PublishStatusOut)
def publish_status(
    entry_id: uuid.UUID,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> PublishStatusOut | JSONResponse:
    try:
        return publish_service.get_publish_status(db, entry_id)
    except PublishError as exc:
        return _publish_error_response(exc)


@router.get("/publish/entries/{entry_id}/notifications", response_model=PublishNotificationListOut)
def publish_notifications(
    entry_id: uuid.UUID,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> PublishNotificationListOut | JSONResponse:
    try:
        publish_service.get_publish_status(db, entry_id)
    except PublishError as exc:
        return _publish_error_response(exc)
    events = list_notifications(entry_id)
    return PublishNotificationListOut(
        items=[
            PublishNotificationOut(
                id=e.id,
                entryId=e.entry_id,
                eventType=e.event_type,
                timestamp=e.timestamp,
                deliveryMode=e.delivery_mode,
                notificationStatus=e.notification_status,
                message=e.message,
            )
            for e in events
        ]
    )


@router.post("/query-design/validate", response_model=VisualQueryDesignOut)
def validate_query_design(
    payload: VisualQueryDesignIn,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> VisualQueryDesignOut | JSONResponse:
    try:
        return query_design_service.validate_visual_query_design(db, payload)
    except GovQueryDesignError as exc:
        return _gov_query_design_error(exc)


@router.put("/query-design", response_model=VisualQueryDesignOut)
def save_query_design(
    payload: VisualQueryDesignIn,
    actor: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> VisualQueryDesignOut | JSONResponse:
    try:
        return query_design_service.save_visual_query_design(db, payload, actor)
    except GovQueryDesignError as exc:
        return _gov_query_design_error(exc)


@router.get("/query-design", response_model=VisualQueryDesignOut)
def get_query_design(
    ref_id: Annotated[uuid.UUID, Query(alias="refId")],
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> VisualQueryDesignOut | JSONResponse:
    try:
        return query_design_service.get_visual_query_design(db, ref_id)
    except GovQueryDesignError as exc:
        return _gov_query_design_error(exc)


@router.post("/query-design/preview-execute", response_model=PreviewExecuteOut)
def preview_execute_query_design(
    payload: PreviewExecuteIn,
    actor: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> PreviewExecuteOut | JSONResponse:
    try:
        return query_design_service.preview_query_design_execute(
            db, actor, data_source_id=payload.data_source_id
        )
    except GovQueryDesignError as exc:
        return _gov_query_design_error(exc)


def _workflow_error(exc: WorkflowError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status,
        content={"code": exc.code, "message": exc.message, "detail": exc.detail},
    )


@router.get("/workflow/templates", response_model=WorkflowTemplateListOut)
def list_workflow_templates(
    _: Annotated[UserContext, Depends(get_current_user)],
) -> WorkflowTemplateListOut:
    return WorkflowTemplateListOut(items=workflow_service.list_templates())


@router.get("/workflow/templates/{template_id}/node-roles", response_model=WorkflowNodeRolesOut)
def get_workflow_node_roles(
    template_id: str,
    _: Annotated[UserContext, Depends(get_current_user)],
) -> WorkflowNodeRolesOut | JSONResponse:
    try:
        items = describe_node_roles(template_id)
        return WorkflowNodeRolesOut(
            items=[
                NodeRoleOut(nodeId=i.node_id, role=i.role, description=i.description)
                for i in items
            ]
        )
    except WorkflowError as exc:
        return _workflow_error(exc)


@router.post("/workflow/templates/validate", response_model=WorkflowTemplateOut)
def validate_workflow_template(
    payload: WorkflowTemplateValidateIn,
    _: Annotated[UserContext, Depends(get_current_user)],
) -> WorkflowTemplateOut | JSONResponse:
    try:
        return workflow_service.validate_template(payload)
    except WorkflowError as exc:
        return _workflow_error(exc)


@router.post("/workflow/instances", status_code=201, response_model=WorkflowInstanceOut)
def create_workflow_instance(
    payload: WorkflowInstanceCreateIn,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> WorkflowInstanceOut | JSONResponse:
    try:
        return workflow_service.create_instance(db, payload)
    except WorkflowError as exc:
        return _workflow_error(exc)


@router.get("/workflow/instances/{instance_id}", response_model=WorkflowInstanceOut)
def get_workflow_instance(
    instance_id: uuid.UUID,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> WorkflowInstanceOut | JSONResponse:
    try:
        return workflow_service.get_instance(db, instance_id)
    except Exception as exc:
        from app.query.config_store.schemas import ConfigError

        if isinstance(exc, ConfigError):
            return JSONResponse(
                status_code=404,
                content={"code": "GOV_WORKFLOW_INSTANCE_NOT_FOUND", "message": "Instance not found", "detail": None},
            )
        raise


@router.post("/workflow/instances/{instance_id}/transition", response_model=WorkflowInstanceOut)
def transition_workflow_instance(
    instance_id: uuid.UUID,
    payload: WorkflowTransitionIn,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> WorkflowInstanceOut | JSONResponse:
    try:
        return workflow_service.transition_instance(db, instance_id, payload.action, payload.actor_role)
    except WorkflowError as exc:
        return _workflow_error(exc)
