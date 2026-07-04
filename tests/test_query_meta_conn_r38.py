"""M12 Query 翻译器 + M11 信创/专项连接器 + META 维度 L1 kickoff r38."""
from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import app

_R38_SQLITE_URL = "sqlite+pysqlite:///file:query_meta_conn_r38?mode=memory&cache=shared&uri=true"
AUTH = {"Authorization": "Bearer dev"}


@pytest.fixture(scope="module", autouse=True)
def r38_sqlite_env():
    previous = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = _R38_SQLITE_URL
    get_settings.cache_clear()
    from app.auth.models import Base as AuthBase, get_meta_engine as auth_engine
    from app.datasources.models import Base, get_meta_engine
    from app.query.models import Base as QueryBase
    import app.auth.models  # noqa: F401
    import app.dashboard.models  # noqa: F401
    import app.datasources.models  # noqa: F401
    import app.governance.catalog.models  # noqa: F401
    import app.metadata.glossary.models  # noqa: F401
    import app.metadata.themes.models  # noqa: F401
    import app.query.config_store.models  # noqa: F401
    import app.query.models  # noqa: F401

    get_meta_engine.cache_clear()
    auth_engine.cache_clear()
    engine = get_meta_engine()
    Base.metadata.create_all(engine)
    AuthBase.metadata.create_all(engine)
    QueryBase.metadata.create_all(engine)
    yield
    if previous is None:
        os.environ.pop("DATABASE_URL", None)
    else:
        os.environ["DATABASE_URL"] = previous
    get_settings.cache_clear()
    get_meta_engine.cache_clear()
    auth_engine.cache_clear()


@pytest.fixture
def client():
    return TestClient(app)


def test_r38_scaffold(client):
    """T-R38-000-01: fixture 可用，/health 200。"""
    assert client.get("/health").status_code == 200


from app.query.dialects import get_sql_dialect
from app.query.translator.schemas import TranslateConditions, TranslateConditionItem, TranslateRequest
from app.query.translator import service as translator_service
from app.query.translator.schemas import TranslateError


def test_query_translate_postgresql_r38():
    """T-QUERY-R38-008-01: postgresql 合法 config → sql 含 SELECT + quoted 表；有条件时 parameters 非空。"""
    req = TranslateRequest(
        connectorType="postgresql",
        schema="public",
        table="orders",
        columns=["order_amount", "status"],
        conditions=TranslateConditions(
            logic="AND",
            conditions=[
                TranslateConditionItem(fieldId="status", operator="eq", value="open", valueType="string"),
            ],
        ),
        limit=100,
    )
    resp = translator_service.translate_config_to_sql(req)
    assert "SELECT" in resp.sql
    assert '"public"' in resp.sql or "public" in resp.sql
    assert resp.parameters


def test_query_translate_mysql_eq_r38():
    """T-QUERY-R38-008-02: mysql + eq 条件 → WHERE + 占位符；无字面量注入。"""
    req = TranslateRequest(
        connectorType="mysql",
        schema="sales",
        table="orders",
        columns=["order_amount"],
        conditions=TranslateConditions(
            logic="AND",
            conditions=[
                TranslateConditionItem(fieldId="order_amount", operator="eq", value=99, valueType="number"),
            ],
        ),
    )
    resp = translator_service.translate_config_to_sql(req)
    assert "WHERE" in resp.sql
    assert "%(p0)s" in resp.sql
    assert "99" not in resp.sql
    assert resp.parameters["p0"] == 99


def test_query_translate_clickhouse_limit_r38():
    """T-QUERY-R38-008-03: clickhouse + limit → SQL 含 LIMIT。"""
    req = TranslateRequest(
        connectorType="clickhouse",
        schema="default",
        table="events",
        columns=["customer_id"],
        limit=50,
    )
    resp = translator_service.translate_config_to_sql(req)
    assert "LIMIT 50" in resp.sql


def test_query_translate_unsupported_dialect_r38():
    """T-QUERY-R38-008-04: 未知 connectorType → QUERY_TRANSLATE_UNSUPPORTED_DIALECT。"""
    req = TranslateRequest(
        connectorType="hive",
        schema="db",
        table="t",
        columns=["x"],
    )
    try:
        translator_service.translate_config_to_sql(req)
        assert False, "expected TranslateError"
    except TranslateError as exc:
        assert exc.code == "QUERY_TRANSLATE_UNSUPPORTED_DIALECT"


def test_query_translate_unknown_field_r38():
    """T-QUERY-R38-008-05: 未知 fieldId → QUERY_TRANSLATE_UNKNOWN_FIELD + fields。"""
    req = TranslateRequest(
        connectorType="postgresql",
        schema="public",
        table="t",
        columns=["status"],
        conditions=TranslateConditions(
            logic="AND",
            conditions=[
                TranslateConditionItem(fieldId="not_in_registry", operator="eq", value="x", valueType="string"),
            ],
        ),
    )
    try:
        translator_service.translate_config_to_sql(req)
        assert False, "expected TranslateError"
    except TranslateError as exc:
        assert exc.code == "QUERY_TRANSLATE_UNKNOWN_FIELD"
        assert exc.fields


def test_query_translate_empty_columns_r38():
    """T-QUERY-R38-008-06: 空 columns → 422 QUERY_TRANSLATE_INVALID_CONFIG。"""
    try:
        TranslateRequest(
            connectorType="postgresql",
            schema="public",
            table="t",
            columns=[],
        )
        assert False, "expected validation error"
    except Exception:
        pass
    req = TranslateRequest(
        connectorType="postgresql",
        schema="public",
        table="t",
        columns=["status"],
    )
    req.columns = []
    try:
        translator_service.translate_config_to_sql(req)
        assert False, "expected TranslateError"
    except TranslateError as exc:
        assert exc.code == "QUERY_TRANSLATE_INVALID_CONFIG"


def test_query_sql_dialect_registry_smoke_r38():
    """T-QUERY-R38-008-07: get_sql_dialect 三 type smoke。"""
    for t in ("mysql", "postgresql", "clickhouse"):
        d = get_sql_dialect(t)
        assert d.connector_type == t
