from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
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
from app.governance.openapi.errors import OpenApiMappingError
from app.governance.openapi.schemas import (
    OpenApiMappingCreate,
    OpenApiMappingListOut,
    OpenApiMappingValidateOut,
)
from app.governance.openapi import service as openapi_service
from app.governance.catalog.classification.errors import ClassificationError
from app.governance.catalog.classification.schemas import (
    ClassificationNodeCreate,
    ClassificationNodeListResponse,
    ClassificationNodeMove,
    ClassificationNodeOut,
)
from app.governance.catalog.classification import service as classification_service
from app.governance.catalog.cat06.errors import Cat06Error
from app.governance.catalog.cat06.schemas import (
    ProductionStatsItemIn,
    ProductionStatsItemOut,
    ProductionStatsListResponse,
    ProductionStatsProbeOut,
    ProductionStatsValidateOut,
)
from app.governance.catalog.cat06 import service as cat06_service
from app.governance.catalog.cat05.errors import Cat05Error
from app.governance.catalog.cat05.schemas import (
    TicketStatsItemIn,
    TicketStatsItemOut,
    TicketStatsListResponse,
    TicketStatsProbeOut,
    TicketStatsValidateOut,
)
from app.governance.catalog.cat05 import service as cat05_service
from app.governance.catalog.cat03.errors import Cat03Error
from app.governance.catalog.cat03.schemas import (
    GeoRegionCreate,
    GeoRegionListResponse,
    GeoRegionMove,
    GeoRegionOut,
)
from app.governance.catalog.cat03 import service as cat03_service
from app.governance.bus.auto import auto_register
from app.governance.bus.auto_schemas import AutoRegisterIn, AutoRegisterOut

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


@router.post("/bus/auto-register", response_model=None)
def auto_register_bus(
    payload: AutoRegisterIn,
    actor: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
) -> AutoRegisterOut | JSONResponse:
    try:
        out, code = auto_register(db, actor, payload.catalog_entry_id)
        return JSONResponse(status_code=code, content=out.model_dump(by_alias=True, mode="json"))
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


def _openapi_mapping_error(exc: OpenApiMappingError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status,
        content={"code": exc.code, "message": exc.message, "detail": None},
    )


@router.get("/openapi-mappings", response_model=OpenApiMappingListOut)
def list_openapi_mappings(
    _: Annotated[UserContext, Depends(get_current_user)],
    catalog_entry_id: uuid.UUID | None = Query(default=None, alias="catalogEntryId"),
) -> OpenApiMappingListOut:
    return openapi_service.list_mappings(catalog_entry_id)


@router.get("/openapi-mappings/{mapping_id}", response_model=None)
def get_openapi_mapping(
    mapping_id: uuid.UUID,
    _: Annotated[UserContext, Depends(get_current_user)],
):
    try:
        return openapi_service.get_mapping(mapping_id)
    except OpenApiMappingError as exc:
        return _openapi_mapping_error(exc)


@router.post("/openapi-mappings", status_code=status.HTTP_201_CREATED, response_model=None)
def register_openapi_mapping(
    payload: OpenApiMappingCreate,
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
):
    try:
        return openapi_service.register_mapping(db, payload)
    except OpenApiMappingError as exc:
        return _openapi_mapping_error(exc)


@router.post("/openapi-mappings/validate", response_model=OpenApiMappingValidateOut)
def validate_openapi_mapping(
    payload: OpenApiMappingCreate,
    _: Annotated[UserContext, Depends(get_current_user)],
):
    try:
        return openapi_service.validate_mapping(payload)
    except OpenApiMappingError as exc:
        return _openapi_mapping_error(exc)


@router.post("/openapi-mappings/{mapping_id}/deactivate", response_model=None)
def deactivate_openapi_mapping(
    mapping_id: uuid.UUID,
    _: Annotated[UserContext, Depends(get_current_user)],
):
    try:
        return openapi_service.deactivate_mapping(mapping_id)
    except OpenApiMappingError as exc:
        return _openapi_mapping_error(exc)


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


def _classification_error(exc: ClassificationError) -> JSONResponse:
    detail = {"fields": exc.fields} if exc.fields else None
    return JSONResponse(
        status_code=exc.status,
        content={"code": exc.code, "message": exc.message, "detail": detail},
    )


@router.get("/catalog/classification/nodes", response_model=ClassificationNodeListResponse)
def list_classification_nodes(
    _: Annotated[UserContext, Depends(get_current_user)],
    parent_id: uuid.UUID | None = Query(default=None, alias="parentId"),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> ClassificationNodeListResponse:
    return classification_service.list_nodes(parent_id, limit, offset)


@router.post("/catalog/classification/nodes", response_model=ClassificationNodeOut, status_code=status.HTTP_201_CREATED)
def create_classification_node(
    payload: ClassificationNodeCreate,
    _: Annotated[UserContext, Depends(get_current_user)],
) -> ClassificationNodeOut | JSONResponse:
    try:
        return classification_service.create_node(payload)
    except ClassificationError as exc:
        return _classification_error(exc)


@router.post("/catalog/classification/nodes/{node_id}/move", response_model=ClassificationNodeOut)
def move_classification_node(
    node_id: uuid.UUID,
    payload: ClassificationNodeMove,
    _: Annotated[UserContext, Depends(get_current_user)],
) -> ClassificationNodeOut | JSONResponse:
    try:
        return classification_service.move_node(node_id, payload)
    except ClassificationError as exc:
        return _classification_error(exc)


@router.delete("/catalog/classification/nodes/{node_id}", response_model=None)
def delete_classification_node(
    node_id: uuid.UUID,
    _: Annotated[UserContext, Depends(get_current_user)],
) -> Response | JSONResponse:
    try:
        classification_service.delete_node(node_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except ClassificationError as exc:
        return _classification_error(exc)


def _cat05_error(exc: Cat05Error) -> JSONResponse:
    detail = {"fields": exc.fields} if exc.fields else None
    return JSONResponse(status_code=exc.status, content={"code": exc.code, "message": exc.message, "detail": detail})


@router.post("/catalog/tickets/validate", response_model=TicketStatsValidateOut)
def validate_ticket_stats_item(
    payload: TicketStatsItemIn,
    _: Annotated[UserContext, Depends(get_current_user)],
) -> TicketStatsValidateOut | JSONResponse:
    try:
        return cat05_service.validate_ticket_item(payload)
    except Cat05Error as exc:
        return _cat05_error(exc)


@router.post("/catalog/tickets/items", response_model=TicketStatsItemOut, status_code=status.HTTP_201_CREATED)
def create_ticket_stats_item(
    payload: TicketStatsItemIn,
    _: Annotated[UserContext, Depends(get_current_user)],
) -> TicketStatsItemOut | JSONResponse:
    try:
        return cat05_service.create_ticket_item(payload)
    except Cat05Error as exc:
        return _cat05_error(exc)


@router.get("/catalog/tickets/items", response_model=TicketStatsListResponse)
def list_ticket_stats_items(
    _: Annotated[UserContext, Depends(get_current_user)],
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> TicketStatsListResponse:
    return cat05_service.list_ticket_items(limit, offset)


@router.get("/catalog/tickets/items/{key}/stats", response_model=TicketStatsProbeOut)
def probe_ticket_stats(
    key: str,
    _: Annotated[UserContext, Depends(get_current_user)],
) -> TicketStatsProbeOut | JSONResponse:
    try:
        return cat05_service.get_ticket_stats(key)
    except Cat05Error as exc:
        return _cat05_error(exc)


def _cat03_error(exc: Cat03Error) -> JSONResponse:
    detail = {"fields": exc.fields} if exc.fields else None
    return JSONResponse(status_code=exc.status, content={"code": exc.code, "message": exc.message, "detail": detail})


@router.get("/catalog/geo-regions/nodes", response_model=GeoRegionListResponse)
def list_geo_region_nodes(
    _: Annotated[UserContext, Depends(get_current_user)],
    parent_id: uuid.UUID | None = Query(default=None, alias="parentId"),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> GeoRegionListResponse:
    return cat03_service.list_geo_nodes(parent_id, limit, offset)


@router.post("/catalog/geo-regions/nodes", response_model=GeoRegionOut, status_code=status.HTTP_201_CREATED)
def create_geo_region_node(
    payload: GeoRegionCreate,
    _: Annotated[UserContext, Depends(get_current_user)],
) -> GeoRegionOut | JSONResponse:
    try:
        return cat03_service.create_geo_node(payload)
    except Cat03Error as exc:
        return _cat03_error(exc)


@router.post("/catalog/geo-regions/nodes/{region_id}/move", response_model=GeoRegionOut)
def move_geo_region_node(
    region_id: uuid.UUID,
    payload: GeoRegionMove,
    _: Annotated[UserContext, Depends(get_current_user)],
) -> GeoRegionOut | JSONResponse:
    try:
        return cat03_service.move_geo_node(region_id, payload)
    except Cat03Error as exc:
        return _cat03_error(exc)


@router.delete("/catalog/geo-regions/nodes/{region_id}", response_model=None)
def delete_geo_region_node(
    region_id: uuid.UUID,
    _: Annotated[UserContext, Depends(get_current_user)],
) -> Response | JSONResponse:
    try:
        cat03_service.delete_geo_node(region_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except Cat03Error as exc:
        return _cat03_error(exc)


def _cat06_error(exc: Cat06Error) -> JSONResponse:
    detail = {"fields": exc.fields} if exc.fields else None
    return JSONResponse(status_code=exc.status, content={"code": exc.code, "message": exc.message, "detail": detail})


@router.post("/catalog/production-stats/validate", response_model=ProductionStatsValidateOut)
def production_stats_validate(
    payload: ProductionStatsItemIn,
    _: Annotated[UserContext, Depends(get_current_user)],
) -> ProductionStatsValidateOut | JSONResponse:
    try:
        return cat06_service.validate_production_stats(payload)
    except Cat06Error as exc:
        return _cat06_error(exc)


@router.post("/catalog/production-stats", response_model=ProductionStatsItemOut, status_code=status.HTTP_201_CREATED)
def production_stats_create(
    payload: ProductionStatsItemIn,
    actor: Annotated[UserContext, Depends(get_current_user)],
) -> ProductionStatsItemOut | JSONResponse:
    try:
        return cat06_service.create_production_stats(payload, actor)
    except Cat06Error as exc:
        return _cat06_error(exc)


@router.get("/catalog/production-stats", response_model=ProductionStatsListResponse)
def production_stats_list(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    _: Annotated[UserContext, Depends(get_current_user)] = None,
) -> ProductionStatsListResponse:
    return cat06_service.list_production_stats(limit, offset)


@router.get("/catalog/production-stats/{stats_key}/stats", response_model=ProductionStatsProbeOut)
def production_stats_probe(
    stats_key: str,
    _: Annotated[UserContext, Depends(get_current_user)],
) -> ProductionStatsProbeOut | JSONResponse:
    try:
        return cat06_service.get_production_stats(stats_key)
    except Cat06Error as exc:
        return _cat06_error(exc)
