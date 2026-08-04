from __future__ import annotations

import re
import time
import uuid
from dataclasses import dataclass

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.auth.deps import UserContext
from app.datasources.models import get_meta_session
from app.metadata.dataset.errors import (
    META_DATASET_DEMO_PROTECTED,
    META_DATASET_DUPLICATE_TABLE,
    META_DATASET_FORBIDDEN,
    DatasetError,
)
from app.metadata.dataset.demo_seed import is_demo_package_dataset
from app.metadata.dataset.models import DatasetRecord
from app.metadata.dataset.schemas import (
    DatasetItemIn,
    DatasetItemOut,
    DatasetListResponse,
    DatasetValidateOut,
)

META_DATASET_CONFIG_TYPE_INVALID = "META_DATASET_CONFIG_TYPE_INVALID"

_FIELD_RE = re.compile(r"^[a-z][a-z0-9_]{1,63}$")
_USER_DATASET_SCOPE: dict[str, str] = {}
probe_dataset_budget_ms_limit = 50


@dataclass(frozen=True)
class DatasetProbeResult:
    elapsed_ms: float
    ok: bool


class _StoreCompat:
    """Test helper: `.clear()` wipes ORM rows (replaces former in-memory dict)."""

    def clear(self) -> None:
        session = get_meta_session()
        try:
            session.execute(delete(DatasetRecord))
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()


_store = _StoreCompat()


def set_user_dataset_scope(user_id: str, id_prefix: str) -> None:
    _USER_DATASET_SCOPE[user_id] = id_prefix


def _with_session(fn):
    session = get_meta_session()
    try:
        result = fn(session)
        session.commit()
        return result
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def _row_to_out(row: DatasetRecord) -> DatasetItemOut:
    return DatasetItemOut.model_validate({
        "datasetId": row.dataset_id,
        "displayName": row.display_name,
        "tables": row.tables or [],
        "computedFields": row.computed_fields or [],
        "allowedRoles": list(row.allowed_roles or []),
        "boundConfigId": row.bound_config_id,
        "origin": row.origin or "manual",
        "syncJobId": row.sync_job_id,
        "isDemoPackage": is_demo_package_dataset(row.dataset_id, row.display_name),
    })


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


def _assert_dataset_read_access(user: UserContext, row: DatasetRecord) -> None:
    roles = set(user.roles)
    if "admin" in roles:
        return
    if "enterprise" in roles:
        prefix = _USER_DATASET_SCOPE.get(user.id, "ds-")
        if not row.dataset_id.startswith(prefix):
            raise DatasetError(META_DATASET_FORBIDDEN, "enterprise user out of dataset scope", 403)
    allowed = set(row.allowed_roles or [])
    if allowed and not roles.intersection(allowed):
        raise DatasetError(META_DATASET_FORBIDDEN, "role not allowed for dataset", 403)


def _can_read_dataset(user: UserContext, row: DatasetRecord) -> bool:
    try:
        _assert_dataset_read_access(user, row)
        return True
    except DatasetError:
        return False


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


def _dump_tables(payload: DatasetItemIn) -> list[dict]:
    return [t.model_dump(by_alias=True) for t in payload.tables]


def _dump_computed(payload: DatasetItemIn) -> list[dict]:
    return [c.model_dump(by_alias=True) for c in payload.computed_fields]


def create_dataset(payload: DatasetItemIn, user: UserContext) -> DatasetItemOut:
    _assert_dataset_write_access(user, payload.dataset_id)
    _validate_body(payload)

    def _op(session: Session) -> DatasetItemOut:
        existing = session.get(DatasetRecord, payload.dataset_id)
        if existing is not None:
            raise DatasetError("META_DATASET_CONFLICT", "Dataset already exists", 409)
        row = DatasetRecord(
            dataset_id=payload.dataset_id,
            display_name=payload.display_name,
            tables=_dump_tables(payload),
            computed_fields=_dump_computed(payload),
            allowed_roles=list(payload.allowed_roles),
            bound_config_id=None,
        )
        session.add(row)
        session.flush()
        return _row_to_out(row)

    return _with_session(_op)


def list_datasets(
    limit: int = 50, offset: int = 0, user: UserContext | None = None,
) -> DatasetListResponse:
    def _op(session: Session) -> DatasetListResponse:
        stmt = select(DatasetRecord).order_by(DatasetRecord.dataset_id)
        if user is not None and "enterprise" in set(user.roles) and "admin" not in set(user.roles):
            prefix = _USER_DATASET_SCOPE.get(user.id, "ds-")
            stmt = stmt.where(DatasetRecord.dataset_id.startswith(prefix))
        capped = min(max(limit, 1), 500)
        rows = list(session.scalars(stmt))
        rows.sort(
            key=lambda r: (
                0 if is_demo_package_dataset(r.dataset_id, r.display_name) else 1,
                r.dataset_id,
            ),
        )
        if user is not None and "admin" not in set(user.roles):
            rows = [r for r in rows if _can_read_dataset(user, r)]
        total = len(rows)
        page = rows[max(offset, 0) : max(offset, 0) + capped]
        return DatasetListResponse(items=[_row_to_out(r) for r in page], total=total)

    session = get_meta_session()
    try:
        return _op(session)
    finally:
        session.close()


def get_dataset(dataset_id: str, user: UserContext | None = None) -> DatasetItemOut:
    session = get_meta_session()
    try:
        row = session.get(DatasetRecord, dataset_id)
        if row is None:
            raise DatasetError("META_DATASET_NOT_FOUND", "Dataset not found", 404)
        if user is not None:
            _assert_dataset_read_access(user, row)
        return _row_to_out(row)
    finally:
        session.close()


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


def update_dataset(dataset_id: str, payload: DatasetItemIn, user: UserContext) -> DatasetItemOut:
    _assert_dataset_write_access(user, dataset_id)
    if payload.dataset_id != dataset_id:
        raise DatasetError("META_DATASET_ID_MISMATCH", "datasetId mismatch", 422)
    _validate_body(payload)

    def _op(session: Session) -> DatasetItemOut:
        row = session.get(DatasetRecord, dataset_id)
        if row is None:
            raise DatasetError("META_DATASET_NOT_FOUND", "Dataset not found", 404)
        row.display_name = payload.display_name
        row.tables = _dump_tables(payload)
        row.computed_fields = _dump_computed(payload)
        row.allowed_roles = list(payload.allowed_roles)
        session.flush()
        return _row_to_out(row)

    return _with_session(_op)


def delete_dataset(dataset_id: str, user: UserContext) -> None:
    _assert_dataset_write_access(user, dataset_id)

    def _op(session: Session) -> None:
        row = session.get(DatasetRecord, dataset_id)
        if row is None:
            raise DatasetError("META_DATASET_NOT_FOUND", "Dataset not found", 404)
        if is_demo_package_dataset(row.dataset_id, row.display_name):
            raise DatasetError(
                META_DATASET_DEMO_PROTECTED,
                "Official demo datasets cannot be deleted",
                409,
            )
        session.delete(row)

    _with_session(_op)


def bind_query_config(dataset_id: str, config_id: uuid.UUID, user: UserContext) -> DatasetItemOut:
    _assert_dataset_write_access(user, dataset_id)
    from app.query.config_store.service import get_config_by_id

    def _op(session: Session) -> DatasetItemOut:
        row = session.get(DatasetRecord, dataset_id)
        if row is None:
            raise DatasetError("META_DATASET_NOT_FOUND", "Dataset not found", 404)
        record = get_config_by_id(session, config_id)
        if record.config_type != "dataset_query":
            raise DatasetError(
                META_DATASET_CONFIG_TYPE_INVALID, "config must be dataset_query", 422,
            )
        row.bound_config_id = config_id
        session.flush()
        return _row_to_out(row)

    return _with_session(_op)


def find_dataset_by_bound_config(config_id: uuid.UUID) -> DatasetItemOut | None:
    session = get_meta_session()
    try:
        row = session.scalar(
            select(DatasetRecord).where(DatasetRecord.bound_config_id == config_id).limit(1),
        )
        return _row_to_out(row) if row is not None else None
    finally:
        session.close()
