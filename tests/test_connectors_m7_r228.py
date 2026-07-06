"""M7 二期数据源类型扩展批次 1 r228 — CONN-003~007 集成 + 方言差异验收。

可选 compose 服务（integration 分层 skip）：
  docker compose up -d sample-mariadb sample-clickhouse
  - sample-mariadb: 127.0.0.1:3308
  - sample-clickhouse: 127.0.0.1:8124
SQLite 使用 tests/fixtures/m7/sample.db（无需 compose）。
"""
from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import app

_R228_SQLITE_URL = "sqlite+pysqlite:///file:connectors_m7_r228?mode=memory&cache=shared&uri=true"

pytestmark = [pytest.mark.integration]


@pytest.fixture(scope="module", autouse=True)
def r228_sqlite_env():
    previous = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = _R228_SQLITE_URL
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


from app.datasources.dialects.mariadb import MariadbConnector
from app.datasources.registry import export_type_catalog, registry


from app.datasources.dialects.relational_hints import (
    build_limit_clause,
    normalize_column_type,
    quote_identifier,
)


def test_conn_r228_005_01_quote_oracle():
    """T-CONN-R228-005-01: quote_identifier oracle → 大写双引号。"""
    assert quote_identifier("oracle", "My Table") == '"MY TABLE"'


def test_conn_r228_005_02_quote_sqlserver():
    """T-CONN-R228-005-02: quote_identifier sqlserver → bracket。"""
    assert quote_identifier("sqlserver", "My Table") == "[My Table]"


def test_conn_r228_005_03_build_limit_sqlserver():
    """T-CONN-R228-005-03: build_limit_clause 含 OFFSET/FETCH。"""
    clause = build_limit_clause("sqlserver", 10, 20)
    assert "OFFSET 20" in clause
    assert "FETCH NEXT 10" in clause


def test_conn_r228_005_04_normalize_oracle_number():
    """T-CONN-R228-005-04: normalize_column_type oracle NUMBER → decimal。"""
    assert normalize_column_type("oracle", "NUMBER") == "decimal"
    assert normalize_column_type("oracle", "VARCHAR2") == "string"
    assert normalize_column_type("oracle", "DATE") == "datetime"


def test_conn_r228_005_05_normalize_sqlserver_types():
    """T-CONN-R228-005-05: normalize_column_type sqlserver nvarchar/datetime2/bit。"""
    assert normalize_column_type("sqlserver", "nvarchar") == "string"
    assert normalize_column_type("sqlserver", "datetime2") == "datetime"
    assert normalize_column_type("sqlserver", "bit") == "boolean"


def test_conn_r228_003_01_mariadb_type_and_catalog():
    """T-CONN-R228-003-01: MariadbConnector.type=mariadb；catalog 含 mariadb+hive。"""
    assert MariadbConnector().type == "mariadb"
    types = {item["type"]: item for item in export_type_catalog()}
    assert "mariadb" in types
    assert types["mariadb"]["category"] == "relational"
    assert "hive" in types
    assert types["hive"]["category"] == "lake"


def test_conn_r228_003_05_registry_no_conflict():
    """T-CONN-R228-005-05 预检: registry 同时含 oracle 与 sqlserver（mariadb 注册后不冲突）。"""
    assert registry.get("mariadb") is not None
    assert registry.get("oracle") is not None
    assert registry.get("sqlserver") is not None


def test_r228_scaffold():
    """占位：fixture 可加载。"""
    assert app is not None
