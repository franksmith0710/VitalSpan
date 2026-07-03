from __future__ import annotations

import hashlib
import json
import logging
import threading
import time
import uuid
from datetime import UTC, datetime

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.models import AuthResourceGrant
from app.core.logging import trace_id_var
from app.datasources.credentials import CredentialDecryptError, decrypt_credential, encrypt_credential
from app.datasources.models import DataSource, get_meta_session
from app.datasources.registry import ConnectorNotFoundError, register_usage_checker, registry
from app.datasources.schemas import (
    ConnectionOptions,
    DataSourceCreate,
    DataSourceListResponse,
    DataSourceOut,
    DataSourcePatch,
    DataSourceUpdate,
    TestConnectionIn,
    TestConnectionOut,
)

logger = logging.getLogger("vitalspan.datasources")

_test_inflight: dict[str, float] = {}
_test_lock = threading.Lock()
_INFLIGHT_TTL_SEC = 2.0


class DataSourceError(Exception):
    def __init__(self, code: str, message: str, status: int = 400) -> None:
        self.code = code
        self.message = message
        self.status = status
        super().__init__(message)


def _connection_options_to_json(opts: ConnectionOptions | None) -> dict | None:
    if opts is None:
        return None
    return opts.model_dump(by_alias=False, exclude_none=True)


def _resolve_connection_options(
    *,
    row: DataSource | None = None,
    payload: ConnectionOptions | None = None,
) -> ConnectionOptions:
    if payload is not None:
        return payload
    if row is not None and row.connection_options:
        return ConnectionOptions.model_validate(row.connection_options)
    return ConnectionOptions()


def _to_out(row: DataSource) -> DataSourceOut:
    opts = None
    if row.connection_options is not None:
        opts = ConnectionOptions.model_validate(row.connection_options)
    return DataSourceOut(
        id=row.id,
        name=row.name,
        code=row.code,
        type=row.type,
        host=row.host,
        port=row.port,
        database=row.database,
        username=row.username,
        password="***",
        description=row.description,
        connection_options=opts,
    )


def _resolve_connector(type: str):
    try:
        return registry.get(type)
    except ConnectorNotFoundError as exc:
        raise DataSourceError("UNKNOWN_CONNECTOR_TYPE", f"Unknown connector type: {type}", 422) from exc


def _active_filter(stmt):
    return stmt.where(DataSource.deleted_at.is_(None))


def _count_active_by_type(type: str) -> bool:
    session = get_meta_session()
    try:
        count = session.scalar(
            select(func.count()).select_from(DataSource).where(
                DataSource.type == type, DataSource.deleted_at.is_(None)
            )
        )
        return bool(count and count > 0)
    finally:
        session.close()


register_usage_checker(_count_active_by_type)


def _inflight_key_saved(data_source_id: uuid.UUID) -> str:
    return f"saved:{data_source_id}"


def _inflight_key_draft(payload: TestConnectionIn) -> str:
    raw = json.dumps(payload.model_dump(), sort_keys=True)
    digest = hashlib.sha256(raw.encode()).hexdigest()
    return f"draft:{digest}"


def _release_test_slot(key: str) -> None:
    with _test_lock:
        _test_inflight.pop(key, None)


def _acquire_test_slot(key: str) -> None:
    now = time.monotonic()
    with _test_lock:
        expired = [k for k, exp in _test_inflight.items() if exp <= now]
        for k in expired:
            del _test_inflight[k]
        expires = _test_inflight.get(key)
        if expires is not None and expires > now:
            raise DataSourceError("TEST_IN_PROGRESS", "Connection test already in progress", 429)
        _test_inflight[key] = now + _INFLIGHT_TTL_SEC


def _run_test(
    connector,
    *,
    host: str,
    port: int,
    database: str,
    username: str,
    password: str,
    options: ConnectionOptions | None = None,
    data_source_id: uuid.UUID | None = None,
) -> TestConnectionOut:
    opts = options or ConnectionOptions()
    result = connector.test_connection(
        host=host,
        port=port,
        database=database,
        username=username,
        password=password,
        timeout_sec=opts.connect_timeout_sec,
        charset=opts.charset,
        collation=opts.collation,
        ssl_mode=opts.ssl_mode,
        connect_timeout_sec=opts.connect_timeout_sec,
        read_timeout_sec=opts.read_timeout_sec,
    )
    trace = trace_id_var.get() or ""
    out = TestConnectionOut.from_result(result, trace_id=trace)
    extra: dict = {"traceId": trace, "ok": result.ok}
    if data_source_id is not None:
        extra["dataSourceId"] = str(data_source_id)
    logger.info("datasource_test", extra=extra)
    return out


def list_data_sources(
    session: Session,
    *,
    limit: int = 50,
    offset: int = 0,
    type: str | None = None,
    q: str | None = None,
) -> DataSourceListResponse:
    limit = max(1, min(limit, 100))
    offset = max(0, offset)
    base = select(DataSource)
    base = _active_filter(base)
    if type:
        base = base.where(DataSource.type == type)
    if q:
        pattern = f"%{q}%"
        base = base.where(or_(DataSource.name.ilike(pattern), DataSource.code.ilike(pattern)))
    count_stmt = select(func.count()).select_from(DataSource)
    count_stmt = _active_filter(count_stmt)
    if type:
        count_stmt = count_stmt.where(DataSource.type == type)
    if q:
        pattern = f"%{q}%"
        count_stmt = count_stmt.where(or_(DataSource.name.ilike(pattern), DataSource.code.ilike(pattern)))
    total = session.scalar(count_stmt) or 0
    rows = list(session.scalars(base.order_by(DataSource.code).limit(limit).offset(offset)))
    return DataSourceListResponse(
        items=[_to_out(row) for row in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


def create_data_source(session: Session, payload: DataSourceCreate) -> DataSourceOut:
    _resolve_connector(payload.type)
    existing_code = session.scalar(
        select(DataSource).where(DataSource.code == payload.code, DataSource.deleted_at.is_(None))
    )
    if existing_code is not None:
        raise DataSourceError("DATASOURCE_CODE_CONFLICT", "Data source code already exists", 409)
    existing_name = session.scalar(
        select(DataSource).where(DataSource.name == payload.name, DataSource.deleted_at.is_(None))
    )
    if existing_name is not None:
        raise DataSourceError("DATASOURCE_NAME_CONFLICT", "Data source name already exists", 409)
    row = DataSource(
        name=payload.name,
        code=payload.code,
        type=payload.type,
        host=payload.host,
        port=payload.port,
        database=payload.database,
        username=payload.username,
        password_encrypted=encrypt_credential(payload.password),
        description=payload.description,
        connection_options=_connection_options_to_json(payload.connection_options),
    )
    session.add(row)
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        message = str(exc.orig).lower() if exc.orig else ""
        if "code" in message:
            raise DataSourceError("DATASOURCE_CODE_CONFLICT", "Data source code already exists", 409) from exc
        raise DataSourceError("DATASOURCE_NAME_CONFLICT", "Data source name already exists", 409) from exc
    session.refresh(row)
    return _to_out(row)


def get_data_source(session: Session, data_source_id: uuid.UUID) -> DataSourceOut:
    row = session.get(DataSource, data_source_id)
    if row is None or row.deleted_at is not None:
        raise DataSourceError("DATASOURCE_NOT_FOUND", "Data source not found", 404)
    return _to_out(row)


def update_data_source(
    session: Session,
    data_source_id: uuid.UUID,
    payload: DataSourceUpdate,
) -> DataSourceOut:
    row = session.get(DataSource, data_source_id)
    if row is None or row.deleted_at is not None:
        raise DataSourceError("DATASOURCE_NOT_FOUND", "Data source not found", 404)
    row.name = payload.name
    row.host = payload.host
    row.port = payload.port
    row.database = payload.database
    row.username = payload.username
    if payload.password:
        row.password_encrypted = encrypt_credential(payload.password)
    row.description = payload.description
    if payload.connection_options is not None:
        row.connection_options = _connection_options_to_json(payload.connection_options)
    existing_name = session.scalar(
        select(DataSource).where(
            DataSource.name == payload.name,
            DataSource.id != data_source_id,
            DataSource.deleted_at.is_(None),
        )
    )
    if existing_name is not None:
        raise DataSourceError("DATASOURCE_NAME_CONFLICT", "Data source name already exists", 409)
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise DataSourceError("DATASOURCE_NAME_CONFLICT", "Data source name already exists", 409) from exc
    session.refresh(row)
    return _to_out(row)


def patch_data_source(
    session: Session,
    data_source_id: uuid.UUID,
    payload: DataSourcePatch,
) -> DataSourceOut:
    row = session.get(DataSource, data_source_id)
    if row is None or row.deleted_at is not None:
        raise DataSourceError("DATASOURCE_NOT_FOUND", "Data source not found", 404)
    data = payload.model_dump(exclude_unset=True, by_alias=False)
    if "connection_options" in data:
        raw = data.pop("connection_options")
        row.connection_options = _connection_options_to_json(
            ConnectionOptions.model_validate(raw) if raw is not None else None
        )
    if "name" in data and data["name"] != row.name:
        conflict = session.scalar(
            select(DataSource).where(
                DataSource.name == data["name"],
                DataSource.id != data_source_id,
                DataSource.deleted_at.is_(None),
            )
        )
        if conflict:
            raise DataSourceError("DATASOURCE_NAME_CONFLICT", "Data source name already exists", 409)
    for field, value in data.items():
        if field == "password" and value:
            row.password_encrypted = encrypt_credential(value)
        elif field != "password" and value is not None:
            setattr(row, field, value)
    session.commit()
    session.refresh(row)
    return _to_out(row)


def delete_data_source(session: Session, data_source_id: uuid.UUID) -> None:
    row = session.get(DataSource, data_source_id)
    if row is None or row.deleted_at is not None:
        raise DataSourceError("DATASOURCE_NOT_FOUND", "Data source not found", 404)
    grant = session.scalar(
        select(AuthResourceGrant)
        .where(
            AuthResourceGrant.resource_type == "datasource",
            AuthResourceGrant.resource_id == data_source_id,
        )
        .limit(1)
    )
    if grant is not None:
        raise DataSourceError("DATASOURCE_IN_USE", "Data source is referenced by grants", 409)
    row.deleted_at = datetime.now(UTC)
    session.commit()


def test_connection_draft(payload: TestConnectionIn) -> TestConnectionOut:
    key = _inflight_key_draft(payload)
    _acquire_test_slot(key)
    try:
        connector = _resolve_connector(payload.type)
        return _run_test(
            connector,
            host=payload.host,
            port=payload.port,
            database=payload.database,
            username=payload.username,
            password=payload.password,
            options=payload.connection_options,
        )
    finally:
        _release_test_slot(key)


def test_connection_by_id(session: Session, data_source_id: uuid.UUID) -> TestConnectionOut:
    key = _inflight_key_saved(data_source_id)
    _acquire_test_slot(key)
    try:
        row = session.get(DataSource, data_source_id)
        if row is None or row.deleted_at is not None:
            raise DataSourceError("DATASOURCE_NOT_FOUND", "Data source not found", 404)
        connector = _resolve_connector(row.type)
        try:
            password = decrypt_credential(row.password_encrypted)
        except CredentialDecryptError as exc:
            raise DataSourceError("CREDENTIAL_DECRYPT_FAILED", str(exc), 500) from exc
        return _run_test(
            connector,
            host=row.host,
            port=row.port,
            database=row.database,
            username=row.username,
            password=password,
            options=_resolve_connection_options(row=row),
            data_source_id=data_source_id,
        )
    finally:
        _release_test_slot(key)
