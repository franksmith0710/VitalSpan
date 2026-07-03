from __future__ import annotations

import os
from unittest.mock import MagicMock, patch

import psycopg
import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.datasources import register_builtin_dialects
from app.datasources.dialects.errors import PG_AUTH_FAILED
from app.datasources.dialects.postgres import PostgresConnector
from app.datasources.registry import registry
from app.main import app

_DS_SQLITE_URL = "sqlite+pysqlite:///file:ds_r25_test?mode=memory&cache=shared&uri=true"
AUTH = {"Authorization": "Bearer dev"}


@pytest.fixture(scope="module", autouse=True)
def ds_r25_sqlite_env():
    previous = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = _DS_SQLITE_URL
    get_settings.cache_clear()
    from app.auth.models import get_meta_engine as auth_get_meta_engine
    from app.datasources.models import get_meta_engine

    get_meta_engine.cache_clear()
    auth_get_meta_engine.cache_clear()
    yield
    if previous is None:
        os.environ.pop("DATABASE_URL", None)
    else:
        os.environ["DATABASE_URL"] = previous
    get_settings.cache_clear()
    get_meta_engine.cache_clear()
    auth_get_meta_engine.cache_clear()


@pytest.fixture(autouse=True)
def reset_registry():
    registry._connectors.clear()
    register_builtin_dialects()
    yield
    registry._connectors.clear()


def test_registry_get_postgresql():
    """T-CONN-P01: registry.get('postgresql') 含 schema_browser。"""
    connector = registry.get("postgresql")
    assert connector.type == "postgresql"
    assert "schema_browser" in connector.capabilities


@patch("app.datasources.dialects.postgres.psycopg.connect")
def test_postgres_test_connection_ok(mock_connect):
    """T-CONN-P02: mock connect 成功 → ok=true。"""
    mock_conn = MagicMock()
    mock_connect.return_value = mock_conn
    result = PostgresConnector().test_connection(
        host="h", port=5432, database="d", username="u", password="p",
    )
    assert result.ok is True
    mock_conn.close.assert_called_once()


@patch("app.datasources.dialects.postgres.psycopg.connect")
def test_postgres_auth_failed_no_password_in_message(mock_connect):
    """T-CONN-P03: 认证失败 → PG_AUTH_FAILED，message 无密码。"""
    exc = psycopg.OperationalError("auth failed for user")
    exc.sqlstate = "28P01"
    mock_connect.side_effect = exc
    result = PostgresConnector().test_connection(
        host="h", port=5432, database="d", username="u", password="secret",
    )
    assert result.ok is False
    assert result.code == PG_AUTH_FAILED
    assert "secret" not in result.message


@patch.object(PostgresConnector, "open_connection")
def test_postgres_list_schemas(mock_open):
    """T-CONN-P04: list_schemas mock cursor。"""
    cur = MagicMock()
    cur.fetchall.return_value = [("public",)]
    conn = MagicMock()
    conn.cursor.return_value.__enter__.return_value = cur
    mock_open.return_value = conn
    items = PostgresConnector().list_schemas(conn)
    assert [s.name for s in items] == ["public"]


@pytest.fixture
def client():
    return TestClient(app)


def test_types_lists_mysql_and_postgresql(client):
    """T-DS-TY01/TY02: GET /types 含 mysql 与 postgresql + capabilities。"""
    resp = client.get("/api/v1/datasources/types", headers=AUTH)
    assert resp.status_code == 200
    types = {item["type"]: item for item in resp.json()["items"]}
    assert "mysql" in types and "postgresql" in types
    for key in ("displayName", "category", "capabilities"):
        assert key in types["mysql"]
    assert "connectivity_test" in types["mysql"]["capabilities"]


def test_types_empty_registry(client):
    """T-DS-TY03: 清空注册表 → items: []。"""
    registry._connectors.clear()
    resp = client.get("/api/v1/datasources/types", headers=AUTH)
    assert resp.status_code == 200
    assert resp.json()["items"] == []


def test_types_unauthenticated_401(client):
    """T-DS-TY04: 未认证 → 401。"""
    assert client.get("/api/v1/datasources/types").status_code == 401


import threading
import uuid
from unittest.mock import MagicMock

from app.datasources.pool import DataSourcePoolManager


def test_pool_reuses_connection_same_id():
    """T-DS-PL01: 同一 dataSourceId 复用连接。"""
    mgr = DataSourcePoolManager()
    ds_id = uuid.uuid4()
    connector = MagicMock()
    conn1 = MagicMock()
    connector.open_connection.return_value = conn1
    kwargs = {"host": "a", "port": 5432, "database": "d", "username": "u", "password": "p"}
    with mgr.pooled_connection(ds_id, connector=connector, connect_kwargs=kwargs) as c1:
        pass
    with mgr.pooled_connection(ds_id, connector=connector, connect_kwargs=kwargs) as c2:
        pass
    assert connector.open_connection.call_count == 1
    assert c2 is conn1


def test_pool_isolates_different_ids():
    """T-DS-PL02: 不同 dataSourceId 不混用 connect 参数。"""
    mgr = DataSourcePoolManager()
    connector = MagicMock()
    connector.open_connection.side_effect = [MagicMock(name="a"), MagicMock(name="b")]
    with mgr.pooled_connection(uuid.uuid4(), connector=connector, connect_kwargs={"host": "a", "port": 1, "database": "d", "username": "u", "password": "p"}):
        pass
    with mgr.pooled_connection(uuid.uuid4(), connector=connector, connect_kwargs={"host": "b", "port": 2, "database": "d", "username": "u", "password": "p"}):
        pass
    assert connector.open_connection.call_count == 2


def test_evict_pool_closes_and_decrements():
    """T-DS-PL03: evict_pool 关闭连接并减计数。"""
    mgr = DataSourcePoolManager()
    ds_id = uuid.uuid4()
    connector = MagicMock()
    conn = MagicMock()
    connector.open_connection.return_value = conn
    kwargs = {"host": "h", "port": 1, "database": "d", "username": "u", "password": "p"}
    with mgr.pooled_connection(ds_id, connector=connector, connect_kwargs=kwargs):
        pass
    assert mgr.active_pool_count() == 1
    mgr.evict_pool(ds_id)
    assert mgr.active_pool_count() == 0
    conn.close.assert_called()


def test_pool_concurrent_smoke():
    """T-DS-PL04: 4 线程同一 id 无异常。"""
    mgr = DataSourcePoolManager()
    ds_id = uuid.uuid4()
    connector = MagicMock()
    connector.open_connection.return_value = MagicMock()
    kwargs = {"host": "h", "port": 1, "database": "d", "username": "u", "password": "p"}
    errors: list[Exception] = []

    def worker():
        try:
            with mgr.pooled_connection(ds_id, connector=connector, connect_kwargs=kwargs):
                pass
        except Exception as exc:
            errors.append(exc)

    threads = [threading.Thread(target=worker) for _ in range(4)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert errors == []
