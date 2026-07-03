from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.datasources.credentials import decrypt_credential, encrypt_credential
from app.datasources.models import DataSource
from app.datasources.registry import ConnectorNotFoundError, registry
from app.datasources.schemas import (
    DataSourceCreate,
    DataSourceOut,
    DataSourceUpdate,
    TestConnectionIn,
    TestConnectionOut,
)


class DataSourceError(Exception):
    def __init__(self, code: str, message: str, status: int = 400) -> None:
        self.code = code
        self.message = message
        self.status = status
        super().__init__(message)


def _to_out(row: DataSource) -> DataSourceOut:
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
    )


def _resolve_connector(type: str):
    try:
        return registry.get(type)
    except ConnectorNotFoundError as exc:
        raise DataSourceError("UNKNOWN_CONNECTOR_TYPE", f"Unknown connector type: {type}", 422) from exc


def _run_test(
    connector,
    *,
    host: str,
    port: int,
    database: str,
    username: str,
    password: str,
) -> TestConnectionOut:
    result = connector.test_connection(
        host=host,
        port=port,
        database=database,
        username=username,
        password=password,
    )
    return TestConnectionOut.from_result(result)


def list_data_sources(session: Session) -> list[DataSourceOut]:
    rows = list(session.scalars(select(DataSource).order_by(DataSource.code)))
    return [_to_out(row) for row in rows]


def create_data_source(session: Session, payload: DataSourceCreate) -> DataSourceOut:
    _resolve_connector(payload.type)
    existing_code = session.scalar(select(DataSource).where(DataSource.code == payload.code))
    if existing_code is not None:
        raise DataSourceError("DATASOURCE_CODE_CONFLICT", "Data source code already exists", 409)
    existing_name = session.scalar(select(DataSource).where(DataSource.name == payload.name))
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
    if row is None:
        raise DataSourceError("DATASOURCE_NOT_FOUND", "Data source not found", 404)
    return _to_out(row)


def update_data_source(
    session: Session,
    data_source_id: uuid.UUID,
    payload: DataSourceUpdate,
) -> DataSourceOut:
    row = session.get(DataSource, data_source_id)
    if row is None:
        raise DataSourceError("DATASOURCE_NOT_FOUND", "Data source not found", 404)
    row.name = payload.name
    row.host = payload.host
    row.port = payload.port
    row.database = payload.database
    row.username = payload.username
    if payload.password:
        row.password_encrypted = encrypt_credential(payload.password)
    row.description = payload.description
    existing_name = session.scalar(
        select(DataSource).where(DataSource.name == payload.name, DataSource.id != data_source_id)
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


def delete_data_source(session: Session, data_source_id: uuid.UUID) -> None:
    row = session.get(DataSource, data_source_id)
    if row is None:
        raise DataSourceError("DATASOURCE_NOT_FOUND", "Data source not found", 404)
    session.delete(row)
    session.commit()


def test_connection_draft(payload: TestConnectionIn) -> TestConnectionOut:
    connector = _resolve_connector(payload.type)
    return _run_test(
        connector,
        host=payload.host,
        port=payload.port,
        database=payload.database,
        username=payload.username,
        password=payload.password,
    )


def test_connection_by_id(session: Session, data_source_id: uuid.UUID) -> TestConnectionOut:
    row = session.get(DataSource, data_source_id)
    if row is None:
        raise DataSourceError("DATASOURCE_NOT_FOUND", "Data source not found", 404)
    connector = _resolve_connector(row.type)
    password = decrypt_credential(row.password_encrypted)
    return _run_test(
        connector,
        host=row.host,
        port=row.port,
        database=row.database,
        username=row.username,
        password=password,
    )
