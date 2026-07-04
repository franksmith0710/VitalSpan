from __future__ import annotations

import re

from app.metadata.entity.errors import EntityTypeError
from app.metadata.entity.schemas import EntityTypeCreate, EntityTypeOut, EntityTypeUpdate
from app.metadata.entity.schemas import _DEFAULT_LIFECYCLE

_store: dict[str, dict] = {}
_ref_counts: dict[str, int] = {}
_ATTR_RE = re.compile(r"^[a-z][a-z0-9_]{1,63}$")


def _to_out(record: dict) -> EntityTypeOut:
    return EntityTypeOut.model_validate(record)


def _validate_attributes(attrs: list) -> None:
    for attr in attrs:
        if not _ATTR_RE.match(attr.name):
            raise EntityTypeError("META_ENTITY_TYPE_INVALID_ATTR", "Invalid attribute name", 422)


def create_entity_type(payload: EntityTypeCreate) -> EntityTypeOut:
    if payload.type_code in _store:
        raise EntityTypeError("META_ENTITY_TYPE_CONFLICT", "Entity type already exists", 409)
    _validate_attributes(payload.attributes)
    lifecycle = payload.lifecycle_states or list(_DEFAULT_LIFECYCLE)
    record = {
        "typeCode": payload.type_code,
        "displayName": payload.display_name,
        "attributes": [a.model_dump(by_alias=True) for a in payload.attributes],
        "lifecycleStates": lifecycle,
    }
    _store[payload.type_code] = record
    _ref_counts.setdefault(payload.type_code, 0)
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
    record = {
        "typeCode": type_code,
        "displayName": payload.display_name,
        "attributes": [a.model_dump(by_alias=True) for a in payload.attributes],
        "lifecycleStates": lifecycle,
    }
    _store[type_code] = record
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
