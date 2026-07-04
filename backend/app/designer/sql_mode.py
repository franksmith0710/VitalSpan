from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.designer.schemas import DesignerError, SqlModeSpec
from app.query.config_store import service as config_store
from app.query.config_store.schemas import ConfigUpsert
from app.query.readonly import assert_readonly_sql
from app.query.schemas import QueryError

_MAX_SQL_LEN = 65536


def validate_sql_mode(spec: SqlModeSpec) -> SqlModeSpec:
    if not spec.sql.strip():
        raise DesignerError("DESIGN_SQL_EMPTY", "SQL must not be empty", 422)
    try:
        assert_readonly_sql(spec.sql)
    except QueryError as exc:
        if exc.code == "QUERY_SQL_TOO_LONG":
            raise DesignerError("DESIGN_SQL_TOO_LONG", exc.message, exc.status) from exc
        raise DesignerError("DESIGN_SQL_NOT_READONLY", exc.message, 422) from exc
    return spec


def sql_mode_capabilities() -> dict[str, object]:
    return {
        "allowedStatements": ["SELECT"],
        "maxSqlLength": _MAX_SQL_LEN,
        "highlightSupported": False,
    }


def _payload(spec: SqlModeSpec) -> dict:
    return {
        "schemaVersion": spec.schema_version,
        "dataSourceId": str(spec.data_source_id),
        "sql": spec.sql,
        "parameters": spec.parameters,
    }


def save_sql_mode(session: Session, spec: SqlModeSpec, owner_id: uuid.UUID | None = None):
    validate_sql_mode(spec)
    record = config_store.upsert_config(
        session,
        ConfigUpsert(
            config_type="sql_mode",
            schema_version=spec.schema_version,
            ref_type=spec.ref_type,
            ref_id=spec.ref_id,
            payload=_payload(spec),
        ),
        owner_id=owner_id,
    )
    return spec, record


def get_sql_mode(session: Session, ref_type: str, ref_id: uuid.UUID) -> SqlModeSpec:
    record = config_store.get_config_by_ref(session, "sql_mode", ref_type, ref_id)
    payload = record.payload
    return SqlModeSpec(
        schema_version=payload.get("schemaVersion", "1.0"),
        data_source_id=uuid.UUID(payload["dataSourceId"]),
        sql=payload["sql"],
        parameters=payload.get("parameters", {}),
        ref_type=ref_type,
        ref_id=ref_id,
    )
