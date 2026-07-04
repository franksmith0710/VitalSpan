from __future__ import annotations

import uuid

from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.query.config_store.models import QueryConfigRecord
from app.query.config_store.schemas import (
    ALLOWED_CONFIG_TYPES,
    ALLOWED_SCHEMA_VERSIONS,
    ConfigError,
    ConfigUpsert,
    DEFAULT_REF_TYPE,
)


def _validate_upsert(payload: ConfigUpsert) -> None:
    if payload.config_type not in ALLOWED_CONFIG_TYPES:
        raise ConfigError("CONFIG_UNKNOWN_TYPE", f"Unknown config type: {payload.config_type}", 422)
    if payload.schema_version not in ALLOWED_SCHEMA_VERSIONS:
        raise ConfigError("CONFIG_UNKNOWN_SCHEMA_VERSION", "Unknown schema version", 422)
    if not isinstance(payload.payload, dict):
        raise ConfigError("CONFIG_INVALID_PAYLOAD", "Payload must be a JSON object", 422)


def upsert_config(
    session: Session,
    payload: ConfigUpsert,
    owner_id: uuid.UUID | None = None,
) -> QueryConfigRecord:
    _validate_upsert(payload)
    ref_type = payload.ref_type or DEFAULT_REF_TYPE
    stmt = select(QueryConfigRecord).where(
        and_(
            QueryConfigRecord.config_type == payload.config_type,
            QueryConfigRecord.ref_type == ref_type,
            QueryConfigRecord.ref_id == payload.ref_id,
            QueryConfigRecord.schema_version == payload.schema_version,
        )
    )
    existing = session.scalar(stmt)
    if existing is not None:
        existing.payload = payload.payload
        existing.revision += 1
        if owner_id is not None:
            existing.owner_id = owner_id
        session.commit()
        session.refresh(existing)
        return existing
    record = QueryConfigRecord(
        config_type=payload.config_type,
        schema_version=payload.schema_version,
        ref_type=ref_type,
        ref_id=payload.ref_id,
        owner_id=owner_id,
        payload=payload.payload,
        revision=1,
    )
    session.add(record)
    session.commit()
    session.refresh(record)
    return record


def get_config_by_id(session: Session, config_id: uuid.UUID) -> QueryConfigRecord:
    record = session.get(QueryConfigRecord, config_id)
    if record is None:
        raise ConfigError("CONFIG_NOT_FOUND", "Config record not found", 404)
    return record


def list_configs(
    session: Session,
    config_type: str | None = None,
    ref_type: str | None = None,
    ref_id: uuid.UUID | None = None,
    limit: int = 100,
    offset: int = 0,
) -> tuple[list[QueryConfigRecord], int]:
    capped = min(max(limit, 1), 500)
    base = select(QueryConfigRecord).order_by(QueryConfigRecord.updated_at.desc())
    count_stmt = select(func.count()).select_from(QueryConfigRecord)
    if config_type is not None:
        base = base.where(QueryConfigRecord.config_type == config_type)
        count_stmt = count_stmt.where(QueryConfigRecord.config_type == config_type)
    if ref_type is not None:
        base = base.where(QueryConfigRecord.ref_type == ref_type)
        count_stmt = count_stmt.where(QueryConfigRecord.ref_type == ref_type)
    if ref_id is not None:
        base = base.where(QueryConfigRecord.ref_id == ref_id)
        count_stmt = count_stmt.where(QueryConfigRecord.ref_id == ref_id)
    total = session.scalar(count_stmt) or 0
    items = list(session.scalars(base.limit(capped).offset(max(offset, 0))))
    return items, total


def get_config_by_ref(
    session: Session,
    config_type: str,
    ref_type: str,
    ref_id: uuid.UUID,
    schema_version: str = "1.0",
) -> QueryConfigRecord:
    stmt = select(QueryConfigRecord).where(
        and_(
            QueryConfigRecord.config_type == config_type,
            QueryConfigRecord.ref_type == ref_type,
            QueryConfigRecord.ref_id == ref_id,
            QueryConfigRecord.schema_version == schema_version,
        )
    )
    record = session.scalar(stmt)
    if record is None:
        raise ConfigError("CONFIG_NOT_FOUND", "Config record not found", 404)
    return record
