from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.datasources.models import DataSource
from app.ingestion.models import (
    SourceConnectionIn,
    SourceConnectionUpdateIn,
    SyncJob,
    encrypt_password,
)
from app.query.rls.guard import validate_identifier


class SourceResolverError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 422) -> None:
        self.code = code
        self.message = message
        self.status_code = status_code
        super().__init__(message)


def _load_mysql_datasource(db: Session, data_source_id: uuid.UUID) -> DataSource:
    row = db.get(DataSource, data_source_id)
    if row is None or row.deleted_at is not None:
        raise SourceResolverError("NOT_FOUND", "数据源不存在", status.HTTP_404_NOT_FOUND)
    if row.type != "mysql":
        raise SourceResolverError(
            "UNSUPPORTED_SOURCE_TYPE",
            "同步任务 M1B 仅支持 MySQL 数据源",
            status.HTTP_422_UNPROCESSABLE_ENTITY,
        )
    return row


def apply_datasource_snapshot(job: SyncJob, ds: DataSource, source_table: str) -> None:
    validate_identifier(source_table)
    job.source_type = "mysql"
    job.source_host = ds.host
    job.source_port = ds.port
    job.source_database = ds.database
    job.source_username = ds.username
    job.source_password_encrypted = ds.password_encrypted
    job.source_table = source_table
    job.source_data_source_id = ds.id


def apply_inline_source(
    job: SyncJob,
    source: SourceConnectionIn | SourceConnectionUpdateIn,
    *,
    preserve_password: bool = False,
) -> None:
    if source.type != "mysql":
        raise SourceResolverError(
            "UNSUPPORTED_SOURCE_TYPE",
            "同步任务 M1B 仅支持 MySQL 源",
            status.HTTP_422_UNPROCESSABLE_ENTITY,
        )
    job.source_type = source.type
    job.source_host = source.host
    job.source_port = source.port
    job.source_database = source.database
    job.source_username = source.username
    if not (preserve_password and not source.password):
        job.source_password_encrypted = encrypt_password(source.password)
    job.source_table = source.table
    job.source_data_source_id = None


def resolve_and_apply_source(
    db: Session,
    job: SyncJob,
    *,
    source_mode: str,
    source_table: str | None,
    source_data_source_id: uuid.UUID | None,
    inline_source: SourceConnectionIn | SourceConnectionUpdateIn | None,
    preserve_password: bool = False,
) -> None:
    if source_mode == "datasource":
        if source_data_source_id is None:
            raise SourceResolverError("VALIDATION_ERROR", "数据源模式须指定 source_data_source_id")
        if not source_table:
            raise SourceResolverError("VALIDATION_ERROR", "须指定 source_table")
        ds = _load_mysql_datasource(db, source_data_source_id)
        apply_datasource_snapshot(job, ds, source_table)
        return

    if inline_source is None:
        raise SourceResolverError("VALIDATION_ERROR", "内联模式须指定 source")
    apply_inline_source(job, inline_source, preserve_password=preserve_password)


def http_exception_from_resolver(exc: SourceResolverError) -> HTTPException:
    return HTTPException(
        status_code=exc.status_code,
        detail={"code": exc.code, "message": exc.message, "detail": None},
    )
