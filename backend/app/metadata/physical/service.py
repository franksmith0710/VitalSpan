from __future__ import annotations

import re
import time
import uuid
from dataclasses import dataclass

from app.auth.deps import UserContext
from app.metadata.physical.errors import (
    META_PHYSICAL_FORBIDDEN,
    META_PHYSICAL_INVALID_COLUMN,
    PhysicalTableError,
)
from app.metadata.physical.schemas import (
    PhysicalTableListResponse,
    PhysicalTableOut,
    PhysicalTableRegisterIn,
    PhysicalTableValidateOut,
)

_FQN_RE = re.compile(r"^[a-z][a-z0-9_]{0,62}\.[a-z][a-z0-9_]{1,63}$")
_COLUMN_NAME_RE = re.compile(r"^[a-z][a-z0-9_]{0,63}$")
_store: dict[str, dict] = {}
probe_physical_budget_ms_limit = 50


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


def list_physical_tables(limit: int = 50, offset: int = 0) -> PhysicalTableListResponse:
    items = list(_store.values())
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
