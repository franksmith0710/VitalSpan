from __future__ import annotations

import re

from app.metadata.dataset.errors import DatasetError
from app.metadata.dataset.schemas import (
    DatasetItemIn,
    DatasetItemOut,
    DatasetListResponse,
    DatasetValidateOut,
)

_store: dict[str, dict] = {}
_FIELD_RE = re.compile(r"^[a-z][a-z0-9_]{1,63}$")


def _to_out(record: dict) -> DatasetItemOut:
    return DatasetItemOut.model_validate(record)


def _validate_body(payload: DatasetItemIn) -> None:
    if not payload.tables:
        raise DatasetError(
            "META_DATASET_EMPTY_TABLES",
            "At least one table is required",
            422,
            fields=[{"field": "tables", "message": "must not be empty"}],
        )
    for field in payload.computed_fields:
        if not _FIELD_RE.match(field.name):
            raise DatasetError(
                "META_DATASET_INVALID_FIELD",
                "Invalid computed field name",
                422,
                fields=[{"field": "computedFields", "message": field.name}],
            )


def create_dataset(payload: DatasetItemIn) -> DatasetItemOut:
    _validate_body(payload)
    if payload.dataset_id in _store:
        raise DatasetError("META_DATASET_CONFLICT", "Dataset already exists", 409)
    record = payload.model_dump(by_alias=True)
    _store[payload.dataset_id] = record
    return _to_out(record)


def list_datasets(limit: int = 50, offset: int = 0) -> DatasetListResponse:
    items = sorted(_store.values(), key=lambda r: r["datasetId"])
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
