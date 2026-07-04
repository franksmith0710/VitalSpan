from __future__ import annotations

import re
import time
from dataclasses import dataclass

from app.auth.deps import UserContext
from app.metadata.dataset.errors import (
    META_DATASET_DUPLICATE_TABLE,
    META_DATASET_FORBIDDEN,
    DatasetError,
)
from app.metadata.dataset.schemas import (
    DatasetItemIn,
    DatasetItemOut,
    DatasetListResponse,
    DatasetValidateOut,
)

_store: dict[str, dict] = {}
_FIELD_RE = re.compile(r"^[a-z][a-z0-9_]{1,63}$")
_USER_DATASET_SCOPE: dict[str, str] = {}
probe_dataset_budget_ms_limit = 50


@dataclass(frozen=True)
class DatasetProbeResult:
    elapsed_ms: float
    ok: bool


def set_user_dataset_scope(user_id: str, id_prefix: str) -> None:
    _USER_DATASET_SCOPE[user_id] = id_prefix


def _to_out(record: dict) -> DatasetItemOut:
    return DatasetItemOut.model_validate(record)


def _assert_dataset_write_access(user: UserContext, dataset_id: str) -> None:
    roles = set(user.roles)
    if roles.intersection({"admin", "analyst"}):
        return
    if "viewer" in roles and not roles.intersection({"editor", "analyst", "admin"}):
        raise DatasetError(META_DATASET_FORBIDDEN, "viewer cannot create datasets", 403)
    if "enterprise" in roles:
        prefix = _USER_DATASET_SCOPE.get(user.id, "ds-")
        if not dataset_id.startswith(prefix):
            raise DatasetError(META_DATASET_FORBIDDEN, "enterprise user out of dataset scope", 403)


def _validate_body(payload: DatasetItemIn) -> None:
    if not payload.tables:
        raise DatasetError(
            "META_DATASET_EMPTY_TABLES",
            "At least one table is required",
            422,
            fields=[{"field": "tables", "message": "must not be empty"}],
        )
    table_names = [t.name for t in payload.tables]
    if len(table_names) != len(set(table_names)):
        raise DatasetError(META_DATASET_DUPLICATE_TABLE, "duplicate table name", 422)
    for field in payload.computed_fields:
        if not _FIELD_RE.match(field.name):
            raise DatasetError(
                "META_DATASET_INVALID_FIELD",
                "Invalid computed field name",
                422,
                fields=[{"field": "computedFields", "message": field.name}],
            )


def create_dataset(payload: DatasetItemIn, user: UserContext) -> DatasetItemOut:
    _assert_dataset_write_access(user, payload.dataset_id)
    _validate_body(payload)
    if payload.dataset_id in _store:
        raise DatasetError("META_DATASET_CONFLICT", "Dataset already exists", 409)
    record = payload.model_dump(by_alias=True)
    _store[payload.dataset_id] = record
    return _to_out(record)


def list_datasets(
    limit: int = 50, offset: int = 0, user: UserContext | None = None,
) -> DatasetListResponse:
    items = sorted(_store.values(), key=lambda r: r["datasetId"])
    if user is not None and "enterprise" in set(user.roles) and "admin" not in set(user.roles):
        prefix = _USER_DATASET_SCOPE.get(user.id, "ds-")
        items = [r for r in items if str(r.get("datasetId", "")).startswith(prefix)]
    capped = min(max(limit, 1), 500)
    sliced = items[max(offset, 0) : max(offset, 0) + capped]
    return DatasetListResponse(items=[_to_out(r) for r in sliced], total=len(items))


def get_dataset(dataset_id: str) -> DatasetItemOut:
    record = _store.get(dataset_id)
    if record is None:
        raise DatasetError("META_DATASET_NOT_FOUND", "Dataset not found", 404)
    return _to_out(record)


def validate_dataset_draft(payload: DatasetItemIn) -> DatasetValidateOut:
    _validate_body(payload)
    return DatasetValidateOut(
        valid=True,
        dataset_id=payload.dataset_id,
        table_count=len(payload.tables),
        computed_field_count=len(payload.computed_fields),
    )


def probe_validate_dataset_budget_ms() -> DatasetProbeResult:
    started = time.perf_counter()
    sample = DatasetItemIn.model_validate({
        "datasetId": "ds-probe-sample",
        "displayName": "Probe",
        "tables": [{"name": "orders"}],
    })
    validate_dataset_draft(sample)
    elapsed = (time.perf_counter() - started) * 1000
    return DatasetProbeResult(elapsed_ms=elapsed, ok=elapsed < probe_dataset_budget_ms_limit)


def probe_list_datasets_budget_ms() -> DatasetProbeResult:
    started = time.perf_counter()
    list_datasets(limit=50, offset=0)
    elapsed = (time.perf_counter() - started) * 1000
    return DatasetProbeResult(elapsed_ms=elapsed, ok=elapsed < probe_dataset_budget_ms_limit)
