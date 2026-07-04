from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.governance.openapi.errors import OpenApiMappingError
from app.governance.openapi.schemas import OpenApiMappingCreate, OpenApiMappingListOut, OpenApiMappingOut
from app.governance.publish import service as publish_service
from app.metadata.entity import service as entity_service
from app.metadata.entity.errors import EntityTypeError

_store: dict[uuid.UUID, dict] = {}
_operation_ids: set[str] = set()


def _validate_entity_ref(entity_type_ref: str | None) -> None:
    if entity_type_ref is None:
        return
    try:
        entity_service.validate_entity_type_ref(entity_type_ref)
    except EntityTypeError as exc:
        raise OpenApiMappingError(
            "GOV_OPENAPI_MAP_ENTITY_TYPE_UNKNOWN",
            exc.message,
            422,
        ) from exc


def validate_mapping(payload: OpenApiMappingCreate) -> OpenApiMappingCreate:
    if not payload.path.startswith("/api/v1/"):
        raise OpenApiMappingError("GOV_OPENAPI_MAP_INVALID_PATH", "Path must start with /api/v1/", 422)
    _validate_entity_ref(payload.entity_type_ref)
    return payload


def register_mapping(db: Session, payload: OpenApiMappingCreate) -> OpenApiMappingOut:
    if payload.catalog_entry_id is None:
        raise OpenApiMappingError("GOV_OPENAPI_MAP_NOT_FOUND", "catalogEntryId required", 422)
    validate_mapping(payload)
    status = publish_service.get_publish_status(db, payload.catalog_entry_id)
    if status.status != "published":
        raise OpenApiMappingError(
            "GOV_OPENAPI_MAP_ENTRY_NOT_PUBLISHED",
            "Catalog entry must be published",
            422,
        )
    if payload.operation_id in _operation_ids:
        raise OpenApiMappingError("GOV_OPENAPI_MAP_DUPLICATE", "operationId already registered", 409)
    mapping_id = uuid.uuid4()
    record = {
        "id": mapping_id,
        "catalogEntryId": str(payload.catalog_entry_id),
        "httpMethod": payload.http_method,
        "path": payload.path,
        "operationId": payload.operation_id,
        "entityTypeRef": payload.entity_type_ref,
        "active": True,
    }
    _store[mapping_id] = record
    _operation_ids.add(payload.operation_id)
    if payload.entity_type_ref:
        entity_service.increment_reference(payload.entity_type_ref)
    return OpenApiMappingOut(
        id=mapping_id,
        catalog_entry_id=payload.catalog_entry_id,
        http_method=payload.http_method,
        path=payload.path,
        operation_id=payload.operation_id,
        entity_type_ref=payload.entity_type_ref,
        active=True,
    )


def list_mappings(catalog_entry_id: uuid.UUID | None = None) -> OpenApiMappingListOut:
    items = list(_store.values())
    if catalog_entry_id is not None:
        cid = str(catalog_entry_id)
        items = [r for r in items if r.get("catalogEntryId") == cid]
    out = [
        OpenApiMappingOut(
            id=r["id"],
            catalog_entry_id=uuid.UUID(r["catalogEntryId"]) if r.get("catalogEntryId") else None,
            http_method=r["httpMethod"],
            path=r["path"],
            operation_id=r["operationId"],
            entity_type_ref=r.get("entityTypeRef"),
            active=r["active"],
        )
        for r in items
    ]
    return OpenApiMappingListOut(items=out)


def get_mapping(mapping_id: uuid.UUID) -> OpenApiMappingOut:
    record = _store.get(mapping_id)
    if record is None:
        raise OpenApiMappingError("GOV_OPENAPI_MAP_NOT_FOUND", "Mapping not found", 404)
    return OpenApiMappingOut(
        id=record["id"],
        catalog_entry_id=uuid.UUID(record["catalogEntryId"]),
        http_method=record["httpMethod"],
        path=record["path"],
        operation_id=record["operationId"],
        entity_type_ref=record.get("entityTypeRef"),
        active=record["active"],
    )
