from __future__ import annotations

import re
import time
import uuid
from dataclasses import dataclass

from app.auth.deps import UserContext
from app.metadata.physical.errors import (
    META_PHYSICAL_DS_TABLE_CONFLICT,
    META_PHYSICAL_FORBIDDEN,
    META_PHYSICAL_GOV_IN_USE,
    META_PHYSICAL_INVALID_COLUMN,
    PhysicalTableError,
)
from app.metadata.entity.errors import EntityTypeError
from app.metadata.entity import service as entity_service
from app.datasources.metadata import service as ds_metadata_service
from app.datasources.service import DataSourceError
from app.metadata.physical.schemas import (
    PhysicalTableListResponse,
    PhysicalTableOut,
    PhysicalTableRegisterFromSchemaIn,
    PhysicalTableRegisterIn,
    PhysicalTableUpdateIn,
    PhysicalTableValidateOut,
)
from app.metadata.physical import gov_refs as physical_gov_refs

_FQN_RE = re.compile(r"^[a-z][a-z0-9_]{0,62}\.[a-z][a-z0-9_]{1,63}$")
_COLUMN_NAME_RE = re.compile(r"^[a-z][a-z0-9_]{0,63}$")
_store: dict[str, dict] = {}
_ds_table_index: dict[tuple[str, str, str], str] = {}
probe_physical_budget_ms_limit = 50


def _ds_key(data_source_id, schema: str, table: str) -> tuple[str, str, str]:
    return (str(data_source_id).lower(), schema.lower(), table.lower())


def _remove_ds_index(record: dict) -> None:
    schema = record.get("sourceSchema")
    table = record.get("sourceTable")
    ds_id = record.get("dataSourceId")
    if schema and table and ds_id:
        _ds_table_index.pop(_ds_key(ds_id, schema, table), None)


@dataclass(frozen=True)
class PhysicalProbeResult:
    elapsed_ms: float
    ok: bool


def _assert_physical_write_access(user: UserContext) -> None:
    roles = set(user.roles)
    if roles.intersection({"admin", "analyst"}):
        return
    raise PhysicalTableError(META_PHYSICAL_FORBIDDEN, "insufficient role to register physical tables", 403)


def _validate_register(payload: PhysicalTableRegisterIn) -> PhysicalTableRegisterIn:
    if not _FQN_RE.match(payload.table_fqn):
        raise PhysicalTableError("META_PHYSICAL_INVALID_FQN", "Invalid tableFqn format", 422)
    if not payload.columns:
        raise PhysicalTableError("META_PHYSICAL_EMPTY_COLUMNS", "columns must not be empty", 422)
    names = [c.name for c in payload.columns]
    if len(names) != len(set(names)):
        raise PhysicalTableError("META_PHYSICAL_DUPLICATE_COLUMN", "duplicate column name", 422)
    try:
        uuid.UUID(str(payload.data_source_id))
    except ValueError as exc:
        raise PhysicalTableError("META_PHYSICAL_INVALID_DATASOURCE", "Invalid dataSourceId", 422) from exc
    for col in payload.columns:
        if not _COLUMN_NAME_RE.match(col.name):
            raise PhysicalTableError(
                META_PHYSICAL_INVALID_COLUMN,
                f"invalid column name: {col.name}",
                422,
                [{"field": "columns.name", "message": "must match ^[a-z][a-z0-9_]{0,63}$"}],
            )
    return payload


def validate_physical_table(payload: PhysicalTableRegisterIn) -> PhysicalTableValidateOut:
    item = _validate_register(payload)
    return PhysicalTableValidateOut(valid=True, table_fqn=item.table_fqn, column_count=len(item.columns))


def register_physical_table(payload: PhysicalTableRegisterIn, user: UserContext) -> PhysicalTableOut:
    _assert_physical_write_access(user)
    item = _validate_register(payload)
    if item.table_fqn in _store:
        raise PhysicalTableError("META_PHYSICAL_CONFLICT", f"tableFqn already exists: {item.table_fqn}", 409)
    _store[item.table_fqn] = item.model_dump(by_alias=True, mode="json")
    return PhysicalTableOut.model_validate(_store[item.table_fqn])


def get_physical_table(fqn: str) -> PhysicalTableOut:
    if fqn not in _store:
        raise PhysicalTableError("META_PHYSICAL_NOT_FOUND", f"tableFqn not found: {fqn}", 404)
    return PhysicalTableOut.model_validate(_store[fqn])


def get_physical_lineage(fqn: str) -> dict:
    if fqn not in _store:
        raise PhysicalTableError("META_PHYSICAL_NOT_FOUND", f"tableFqn not found: {fqn}", 404)
    return physical_gov_refs.lineage_stub(fqn)


def bind_entity_type_code(fqn: str, type_code: str) -> None:
    if fqn not in _store:
        raise PhysicalTableError("META_PHYSICAL_NOT_FOUND", f"tableFqn not found: {fqn}", 404)
    _store[fqn]["entityTypeCode"] = type_code


def _normalize_fqn(schema: str, table: str, explicit: str | None) -> str:
    if explicit:
        return explicit.lower()
    return f"{schema.lower()}.{table.lower()}"


def register_from_schema(
    session,
    roles: list[str],
    payload: PhysicalTableRegisterFromSchemaIn,
    user: UserContext,
) -> PhysicalTableOut:
    _assert_physical_write_access(user)
    if payload.entity_type_code:
        try:
            entity_service.get_entity_type(payload.entity_type_code)
        except EntityTypeError as exc:
            if exc.code == "META_ENTITY_TYPE_NOT_FOUND":
                raise PhysicalTableError("META_ENTITY_TYPE_NOT_FOUND", exc.message, 422) from exc
            raise
    try:
        columns_resp = ds_metadata_service.list_columns(
            session,
            roles,
            payload.data_source_id,
            payload.schema_name,
            payload.table,
        )
    except DataSourceError as exc:
        if exc.code == "DATASOURCE_NOT_FOUND":
            raise PhysicalTableError("DATASOURCE_NOT_FOUND", exc.message, 404) from exc
        raise PhysicalTableError(exc.code, exc.message, exc.status) from exc
    table_fqn = _normalize_fqn(payload.schema_name, payload.table, payload.table_fqn)
    ds_key = _ds_key(payload.data_source_id, payload.schema_name, payload.table)
    if ds_key in _ds_table_index:
        raise PhysicalTableError(
            META_PHYSICAL_DS_TABLE_CONFLICT,
            "dataSourceId+schema+table already registered",
            409,
        )
    register_in = PhysicalTableRegisterIn(
        tableFqn=table_fqn,
        dataSourceId=payload.data_source_id,
        displayName=payload.display_name,
        entityTypeCode=payload.entity_type_code,
        columns=[
            {"name": c.name, "dataType": c.data_type, "nullable": c.nullable}
            for c in columns_resp.items
        ],
    )
    register_physical_table(register_in, user)
    if payload.entity_type_code:
        entity_service.increment_reference(payload.entity_type_code)
    _store[table_fqn]["sourceSchema"] = payload.schema_name
    _store[table_fqn]["sourceTable"] = payload.table
    _ds_table_index[ds_key] = table_fqn
    return PhysicalTableOut.model_validate(_store[table_fqn])


def list_physical_tables(
    limit: int = 50,
    offset: int = 0,
    entity_type_code: str | None = None,
) -> PhysicalTableListResponse:
    items = list(_store.values())
    if entity_type_code:
        items = [i for i in items if i.get("entityTypeCode") == entity_type_code]
    page = items[offset : offset + limit]
    return PhysicalTableListResponse(
        items=[PhysicalTableOut.model_validate(i) for i in page],
        total=len(items),
    )


def probe_validate_physical_budget_ms() -> PhysicalProbeResult:
    started = time.perf_counter()
    sample = PhysicalTableRegisterIn.model_validate({
        "tableFqn": "sales.probe_table",
        "dataSourceId": str(uuid.uuid4()),
        "displayName": "Probe Table",
        "entityTypeCode": "order",
        "columns": [{"name": "id", "dataType": "bigint", "nullable": False}],
    })
    validate_physical_table(sample)
    elapsed = (time.perf_counter() - started) * 1000
    return PhysicalProbeResult(elapsed_ms=elapsed, ok=elapsed < probe_physical_budget_ms_limit)


def probe_list_physical_tables_budget_ms() -> PhysicalProbeResult:
    started = time.perf_counter()
    list_physical_tables(limit=50, offset=0)
    elapsed = (time.perf_counter() - started) * 1000
    return PhysicalProbeResult(elapsed_ms=elapsed, ok=elapsed < probe_physical_budget_ms_limit)


def update_physical_table(fqn: str, payload: PhysicalTableUpdateIn, user: UserContext) -> PhysicalTableOut:
    _assert_physical_write_access(user)
    if fqn not in _store:
        raise PhysicalTableError("META_PHYSICAL_NOT_FOUND", f"tableFqn not found: {fqn}", 404)
    record = _store[fqn]
    if payload.display_name is not None:
        record["displayName"] = payload.display_name
    if payload.entity_type_code is not None:
        old_type = record.get("entityTypeCode")
        new_type = payload.entity_type_code or None
        if new_type:
            try:
                entity_service.get_entity_type(new_type)
            except EntityTypeError as exc:
                if exc.code == "META_ENTITY_TYPE_NOT_FOUND":
                    raise PhysicalTableError("META_ENTITY_TYPE_NOT_FOUND", exc.message, 422) from exc
                raise
        if old_type and old_type != new_type:
            entity_service.decrement_reference(old_type)
        if new_type and new_type != old_type:
            entity_service.increment_reference(new_type)
        record["entityTypeCode"] = new_type
        if new_type:
            bind_entity_type_code(fqn, new_type)
    return PhysicalTableOut.model_validate(record)


def delete_physical_table(fqn: str, user: UserContext) -> None:
    _assert_physical_write_access(user)
    if fqn not in _store:
        raise PhysicalTableError("META_PHYSICAL_NOT_FOUND", f"tableFqn not found: {fqn}", 404)
    if physical_gov_refs.catalog_ref_count(fqn) > 0:
        raise PhysicalTableError(
            META_PHYSICAL_GOV_IN_USE,
            "Physical table referenced by GOV catalog entries",
            409,
        )
    record = _store[fqn]
    type_code = record.get("entityTypeCode")
    if type_code:
        entity_service.decrement_reference(type_code)
    _remove_ds_index(record)
    del _store[fqn]
