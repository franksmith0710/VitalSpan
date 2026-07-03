from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy.orm import Session

from app.auth.deps import UserContext
from app.datasources.credentials import CredentialDecryptError, decrypt_credential
from app.datasources.models import DataSource
from app.datasources.pool import pool_manager
from app.datasources.registry import ConnectorNotFoundError, registry
from app.datasources.service import _resolve_connection_options
from app.query.dialects import get_sql_dialect
from app.query.readonly import assert_readonly_sql
from app.query.rls.guard import apply_rls_to_sql
from app.query.schemas import QueryError
from app.query.table import build_table_sql


@dataclass
class QueryResult:
    columns: list[str]
    rows: list[list[Any]]
    row_count: int
    truncated: bool


def _serialize_cell(value: Any) -> Any:
    if isinstance(value, bytes):
        return "0x" + value.hex()
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, uuid.UUID):
        return str(value)
    return value


def _map_execution_error(exc: Exception) -> QueryError:
    msg = str(exc)
    lowered = msg.lower()
    if "timeout" in lowered or "timed out" in lowered:
        return QueryError("QUERY_TIMEOUT", msg, 504)
    if (
        "doesn't exist" in lowered
        or "does not exist" in lowered
        or "unknown table" in lowered
        or "code: 60" in lowered
    ):
        return QueryError("QUERY_TABLE_NOT_FOUND", msg, 404)
    if "syntax error" in lowered or "code: 62" in lowered:
        return QueryError("QUERY_SYNTAX_ERROR", msg, 400)
    return QueryError("QUERY_EXECUTION_ERROR", msg, 400)


class QueryExecutor:
    def execute_sql(
        self, session: Session, user: UserContext, data_source_id: uuid.UUID, sql: str, *,
        limit: int, offset: int = 0, rls_config: dict | None = None, apply_rls: bool = True,
    ) -> QueryResult:
        return self._run(
            session, user, data_source_id, sql, limit=limit, offset=offset,
            rls_config=rls_config, apply_rls=apply_rls,
        )

    def execute_table(
        self, session: Session, user: UserContext, data_source_id: uuid.UUID,
        schema: str, table: str, *, limit: int, offset: int = 0,
        rls_config: dict | None = None, apply_rls: bool = True,
    ) -> QueryResult:
        row = self._load_row(session, data_source_id)
        sql = build_table_sql(row.type, schema, table, limit=limit, offset=offset)
        cfg = dict(rls_config or {})
        cfg.setdefault("table_alias", "t")
        wrapped = f"SELECT * FROM ({sql}) AS t"
        return self._run(
            session, user, data_source_id, wrapped, limit=limit, offset=offset,
            rls_config=cfg, apply_rls=apply_rls, skip_wrap_limit=True,
        )

    def _load_row(self, session: Session, data_source_id: uuid.UUID) -> DataSource:
        row = session.get(DataSource, data_source_id)
        if row is None or row.deleted_at is not None:
            raise QueryError("DATASOURCE_NOT_FOUND", "Data source not found", 404)
        return row

    def _connector_kwargs(self, row: DataSource) -> tuple[Any, dict, int]:
        try:
            connector = registry.get(row.type)
        except ConnectorNotFoundError as exc:
            raise QueryError("UNKNOWN_CONNECTOR_TYPE", str(exc), 422) from exc
        try:
            password = decrypt_credential(row.password_encrypted)
        except CredentialDecryptError as exc:
            raise QueryError("CREDENTIAL_DECRYPT_FAILED", str(exc), 500) from exc
        opts = _resolve_connection_options(row=row)
        kwargs = {
            "host": row.host,
            "port": row.port,
            "database": row.database,
            "username": row.username,
            "password": password,
            "connect_timeout_sec": opts.connect_timeout_sec,
            "ssl_mode": opts.ssl_mode,
        }
        return connector, kwargs, opts.pool_size

    def _run(
        self, session: Session, user: UserContext, data_source_id: uuid.UUID, sql: str, *,
        limit: int, offset: int, rls_config: dict | None, apply_rls: bool,
        skip_wrap_limit: bool = False,
    ) -> QueryResult:
        row = self._load_row(session, data_source_id)
        dialect = get_sql_dialect(row.type)
        assert_readonly_sql(sql)
        final_sql = sql if skip_wrap_limit else dialect.wrap_limit(sql, limit=limit, offset=offset)
        if apply_rls:
            final_sql = apply_rls_to_sql(session, user, final_sql, rls_config=rls_config)
        connector, kwargs, pool_size = self._connector_kwargs(row)
        try:
            with pool_manager.pooled_connection(
                data_source_id, connector=connector, connect_kwargs=kwargs, pool_size=pool_size,
            ) as conn:
                cur = conn.cursor()
                cur.execute(final_sql)
                columns = [col[0] for col in (cur.description or [])]
                raw_rows = cur.fetchmany(limit + 1)
        except QueryError:
            raise
        except Exception as exc:
            msg = str(exc)
            if "connection" in msg.lower() or "refused" in msg.lower():
                raise QueryError("QUERY_CONNECTION_FAILED", msg, 502) from exc
            raise _map_execution_error(exc) from exc
        truncated = len(raw_rows) > limit
        rows = raw_rows[:limit]
        serialized = [[_serialize_cell(c) for c in r] for r in rows]
        return QueryResult(
            columns=columns,
            rows=serialized,
            row_count=len(serialized),
            truncated=truncated,
        )
