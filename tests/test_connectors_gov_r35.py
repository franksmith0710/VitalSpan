"""M11 连接器 + M13 治理 companion 质量推分 r35 — CONN-021/009/015 + GOV-004/008."""
from __future__ import annotations

import os
import uuid
from unittest.mock import MagicMock, patch

import pymysql.err
import pytest
from fastapi.testclient import TestClient

from app.auth.deps import UserContext, get_current_user
from app.core.config import get_settings
from app.datasources.dialects.tidb import TidbConnector
from app.datasources.registry import export_type_catalog
from app.main import app

_R35_SQLITE_URL = "sqlite+pysqlite:///file:connectors_gov_r35?mode=memory&cache=shared&uri=true"
AUTH = {"Authorization": "Bearer dev"}


@pytest.fixture(scope="module", autouse=True)
def r35_sqlite_env():
    previous = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = _R35_SQLITE_URL
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


def test_tidb_types_catalog_r35():
    """T-CONN-R35-021-01: types 含 tidb relational schema_browser。"""
    types = {item["type"]: item for item in export_type_catalog()}
    assert "tidb" in types
    assert types["tidb"]["category"] == "relational"
    assert "schema_browser" in types["tidb"]["capabilities"]


@patch("app.datasources.dialects.mysql.pymysql.connect")
def test_tidb_test_connection_ok_r35(mock_connect):
    """T-CONN-R35-021-02: mock ping 成功 → ok=True。"""
    conn = MagicMock()
    mock_connect.return_value = conn
    result = TidbConnector().test_connection(
        host="127.0.0.1", port=4000, database="test", username="root", password=""
    )
    assert result.ok is True
    conn.ping.assert_called_once_with(reconnect=False)


@patch("app.datasources.dialects.mysql.pymysql.connect")
def test_tidb_auth_failed_r35(mock_connect):
    """T-CONN-R35-021-03: mock 1045 → TIDB_AUTH_FAILED。"""
    mock_connect.side_effect = pymysql.err.OperationalError(1045, "Access denied")
    result = TidbConnector().test_connection(
        host="127.0.0.1", port=4000, database="test", username="bad", password="bad"
    )
    assert result.ok is False
    assert result.code == "TIDB_AUTH_FAILED"


@patch("app.datasources.dialects.mysql.pymysql.connect")
def test_tidb_conn_refused_r35(mock_connect):
    """T-CONN-R35-021-04: mock 2003 → TIDB_CONN_REFUSED。"""
    mock_connect.side_effect = pymysql.err.OperationalError(2003, "Can't connect")
    result = TidbConnector().test_connection(
        host="127.0.0.1", port=4000, database="test", username="root", password=""
    )
    assert result.ok is False
    assert result.code == "TIDB_CONN_REFUSED"


@patch("app.datasources.dialects.mysql.pymysql.connect")
def test_tidb_timeout_r35(mock_connect):
    """T-CONN-R35-021-05: mock 2013 → TIDB_TIMEOUT。"""
    mock_connect.side_effect = pymysql.err.OperationalError(2013, "Lost connection: timeout")
    result = TidbConnector().test_connection(
        host="127.0.0.1", port=4000, database="test", username="root", password=""
    )
    assert result.ok is False
    assert result.code == "TIDB_TIMEOUT"


@patch("app.datasources.dialects.mysql.pymysql.connect")
def test_tidb_empty_schemas_r35(mock_connect):
    """T-CONN-R35-021-06: mock 空 schemas → list_schemas []。"""
    conn = MagicMock()
    cursor = MagicMock()
    cursor.fetchall.return_value = []
    conn.cursor.return_value.__enter__.return_value = cursor
    mock_connect.return_value = conn
    connector = TidbConnector()
    connection = connector.open_connection(
        host="127.0.0.1", port=4000, database="test", username="root", password=""
    )
    assert connector.list_schemas(connection) == []


@patch("app.datasources.dialects.mysql.pymysql.connect")
def test_tidb_unknown_table_columns_r35(mock_connect):
    """T-CONN-R35-021-07: mock 未知表零行 → list_columns []。"""
    conn = MagicMock()
    cursor = MagicMock()
    cursor.fetchall.return_value = []
    conn.cursor.return_value.__enter__.return_value = cursor
    mock_connect.return_value = conn
    connector = TidbConnector()
    connection = connector.open_connection(
        host="127.0.0.1", port=4000, database="test", username="root", password=""
    )
    assert connector.list_columns(connection, "missing_db", "missing_tbl") == []
