from __future__ import annotations

import re

from app.metadata.entity.errors import EntityTypeError
from app.metadata.entity.schemas import (
    EntityQueryBindingsOut,
    EntityTypeCreate,
    EntityTypeOut,
    EntityTypeUpdate,
    EntityTypeValidateOut,
)
from app.metadata.entity.validation import (
    build_readonly_query_bindings,
    validate_entity_schema_payload,
)
from app.metadata.entity.schemas import _DEFAULT_LIFECYCLE
from app.metadata.physical import service as physical_service
from app.metadata.physical.errors import PhysicalTableError

_store: dict[str, dict] = {}
_ref_counts: dict[str, int] = {}
_ATTR_RE = re.compile(r"^[a-z][a-z0-9_]{1,63}$")


def _to_out(record: dict) -> EntityTypeOut:
    return EntityTypeOut.model_validate(record)


def _validate_attributes(attrs: list) -> None:
    for attr in attrs:
        if not _ATTR_RE.match(attr.name):
            raise EntityTypeError("META_ENTITY_TYPE_INVALID_ATTR", "Invalid attribute name", 422)


def _apply_physical_mapping(type_code: str, physical_fqn: str | None) -> None:
    if not physical_fqn:
        return
    try:
        physical = physical_service.get_physical_table(physical_fqn)
    except PhysicalTableError as exc:
        raise EntityTypeError("META_PHYSICAL_NOT_FOUND", exc.message, 422) from exc
    existing = physical.entity_type_code
    if existing and existing != type_code:
        raise EntityTypeError(
            "META_ENTITY_TYPE_MAPPING_CONFLICT",
            f"physical table already mapped to {existing}",
            409,
        )
    if not existing:
        physical_service.bind_entity_type_code(physical_fqn, type_code)
        increment_reference(type_code)


def create_entity_type(payload: EntityTypeCreate) -> EntityTypeOut:
    if payload.type_code in _store:
        raise EntityTypeError("META_ENTITY_TYPE_CONFLICT", "Entity type already exists", 409)
    _validate_attributes(payload.attributes)
    lifecycle = payload.lifecycle_states or list(_DEFAULT_LIFECYCLE)
    validate_entity_schema_payload(
        payload.type_code, payload.display_name, payload.attributes, lifecycle
    )
    record = {
        "typeCode": payload.type_code,
        "displayName": payload.display_name,
        "attributes": [a.model_dump(by_alias=True) for a in payload.attributes],
        "lifecycleStates": lifecycle,
        "physicalTableFqn": payload.physical_table_fqn,
    }
    _store[payload.type_code] = record
    _ref_counts.setdefault(payload.type_code, 0)
    _apply_physical_mapping(payload.type_code, payload.physical_table_fqn)
    return _to_out(record)


def list_entity_types() -> list[EntityTypeOut]:
    return [_to_out(r) for r in sorted(_store.values(), key=lambda x: x["typeCode"])]


def get_entity_type(type_code: str) -> EntityTypeOut:
    record = _store.get(type_code)
    if record is None:
        raise EntityTypeError("META_ENTITY_TYPE_NOT_FOUND", "Entity type not found", 404)
    return _to_out(record)


def validate_entity_type_ref(type_code: str) -> EntityTypeOut:
    return get_entity_type(type_code)


def update_entity_type(type_code: str, payload: EntityTypeUpdate) -> EntityTypeOut:
    if type_code not in _store:
        raise EntityTypeError("META_ENTITY_TYPE_NOT_FOUND", "Entity type not found", 404)
    _validate_attributes(payload.attributes)
    lifecycle = payload.lifecycle_states or _store[type_code]["lifecycleStates"]
    validate_entity_schema_payload(type_code, payload.display_name, payload.attributes, lifecycle)
    record = {
        "typeCode": type_code,
        "displayName": payload.display_name,
        "attributes": [a.model_dump(by_alias=True) for a in payload.attributes],
        "lifecycleStates": lifecycle,
        "physicalTableFqn": payload.physical_table_fqn
        if payload.physical_table_fqn is not None
        else _store[type_code].get("physicalTableFqn"),
    }
    _store[type_code] = record
    if payload.physical_table_fqn is not None:
        _apply_physical_mapping(type_code, payload.physical_table_fqn)
    return _to_out(record)


def delete_entity_type(type_code: str) -> None:
    if type_code not in _store:
        raise EntityTypeError("META_ENTITY_TYPE_NOT_FOUND", "Entity type not found", 404)
    if _ref_counts.get(type_code, 0) > 0:
        raise EntityTypeError("META_ENTITY_TYPE_IN_USE", "Entity type referenced by mappings", 409)
    del _store[type_code]


def increment_reference(type_code: str) -> None:
    _ref_counts[type_code] = _ref_counts.get(type_code, 0) + 1


def decrement_reference(type_code: str) -> None:
    if _ref_counts.get(type_code, 0) > 0:
        _ref_counts[type_code] -= 1


def validate_entity_type_draft(payload: EntityTypeCreate) -> EntityTypeValidateOut:
    _validate_attributes(payload.attributes)
    lifecycle = payload.lifecycle_states or list(_DEFAULT_LIFECYCLE)
    validate_entity_schema_payload(
        payload.type_code, payload.display_name, payload.attributes, lifecycle
    )
    return EntityTypeValidateOut(valid=True)


def get_query_bindings(type_code: str) -> EntityQueryBindingsOut:
    entity_type = get_entity_type(type_code)
    return build_readonly_query_bindings(entity_type)
