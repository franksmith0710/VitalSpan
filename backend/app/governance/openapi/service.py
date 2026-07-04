from __future__ import annotations

import re
import uuid

from sqlalchemy.orm import Session

from app.governance.openapi.errors import OpenApiMappingError
from app.governance.openapi.schemas import (
    OpenApiMappingCreate,
    OpenApiMappingListOut,
    OpenApiMappingOut,
    OpenApiMappingValidateOut,
)
from app.governance.publish import service as publish_service
from app.metadata.entity import service as entity_service
from app.metadata.entity.errors import EntityTypeError

_store: dict[uuid.UUID, dict] = {}
_operation_ids: set[str] = set()

SUPPORTED_API_VERSIONS = frozenset({"v1"})
_OPERATION_ID_RE = re.compile(r"^[a-zA-Z][a-zA-Z0-9_]{0,127}$")
_PATH_RE = re.compile(r"^/api/v1/[a-z0-9/_-]+$")
probe_openapi_validate_budget_ms: int = 50


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


def _validate_api_version(api_version: str) -> None:
    if api_version not in SUPPORTED_API_VERSIONS:
        raise OpenApiMappingError(
            "GOV_OPENAPI_MAP_UNSUPPORTED_VERSION",
            f"Unsupported apiVersion: {api_version}",
            422,
        )


def _validate_operation_id(operation_id: str) -> None:
    if not _OPERATION_ID_RE.match(operation_id):
        raise OpenApiMappingError(
            "GOV_OPENAPI_MAP_INVALID_OPERATION_ID",
            "operationId must match ^[a-zA-Z][a-zA-Z0-9_]{0,127}$",
            422,
        )


def _validate_method_path_consistency(http_method: str, path: str) -> None:
    if not path.startswith("/api/v1/"):
        raise OpenApiMappingError("GOV_OPENAPI_MAP_INVALID_PATH", "Path must start with /api/v1/", 422)
    if not _PATH_RE.match(path):
        raise OpenApiMappingError("GOV_OPENAPI_MAP_INVALID_PATH", "Path segment invalid", 422)


def validate_mapping(payload: OpenApiMappingCreate) -> OpenApiMappingValidateOut:
    _validate_api_version(payload.api_version)
    _validate_operation_id(payload.operation_id)
    _validate_method_path_consistency(payload.http_method, payload.path)
    _validate_entity_ref(payload.entity_type_ref)
    return OpenApiMappingValidateOut(valid=True, api_version=payload.api_version, warnings=[])


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
        "apiVersion": payload.api_version,
        "active": True,
    }
    _store[mapping_id] = record
    _operation_ids.add(payload.operation_id)
    if payload.entity_type_ref:
        entity_service.increment_reference(payload.entity_type_ref)
    return get_mapping(mapping_id)


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
            api_version=r.get("apiVersion", "v1"),
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
        api_version=record.get("apiVersion", "v1"),
        active=record["active"],
    )


def deactivate_mapping(mapping_id: uuid.UUID) -> OpenApiMappingOut:
    record = _store.get(mapping_id)
    if record is None:
        raise OpenApiMappingError("GOV_OPENAPI_MAP_NOT_FOUND", "Mapping not found", 404)
    if not record["active"]:
        raise OpenApiMappingError(
            "GOV_OPENAPI_MAP_ALREADY_INACTIVE",
            "Mapping already inactive",
            409,
        )
    record["active"] = False
    return get_mapping(mapping_id)
