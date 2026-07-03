from __future__ import annotations

import os

import pytest

from app.core.config import get_settings
from app.datasources import register_builtin_dialects
from app.datasources.dialects.mysql import MysqlConnector
from app.datasources.registry import (
    ConnectorInUseError,
    ConnectorNotFoundError,
    registry,
    register_usage_checker,
    unregister,
)

_DS_SQLITE_URL = "sqlite+pysqlite:///file:ds_r23_test?mode=memory&cache=shared&uri=true"


@pytest.fixture(scope="module", autouse=True)
def ds_r23_sqlite_env():
    previous = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = _DS_SQLITE_URL
    get_settings.cache_clear()
    yield
    if previous is None:
        os.environ.pop("DATABASE_URL", None)
    else:
        os.environ["DATABASE_URL"] = previous
    get_settings.cache_clear()


@pytest.fixture(autouse=True)
def reset_registry():
    registry._connectors.clear()
    register_builtin_dialects()
    yield
    registry._connectors.clear()


def test_unregister_mysql_removes_from_list_types():
    """T-DS-R05: unregister('mysql') 后 list_types 不含 mysql。"""
    unregister("mysql")
    assert "mysql" not in {item.type for item in registry.list_types()}


def test_unregister_blocked_when_usage_checker_true():
    """T-DS-R06: usage_checker 返回 True 时抛 ConnectorInUseError。"""

    def _in_use(type: str) -> bool:
        return type == "mysql"

    register_usage_checker(_in_use)
    with pytest.raises(ConnectorInUseError):
        unregister("mysql")


def test_get_unknown_still_raises_not_found():
    """T-DS-R07: get('unknown') 仍抛 ConnectorNotFoundError。"""
    with pytest.raises(ConnectorNotFoundError):
        registry.get("unknown")


def test_dialect_connector_protocol_smoke():
    """T-DS-R08: MysqlConnector 实现协议属性。"""
    connector = MysqlConnector()
    assert connector.type == "mysql"
    assert connector.category == "relational"
    assert "connectivity_test" in connector.capabilities
    assert callable(connector.test_connection)


import time
from unittest.mock import MagicMock, patch

import pymysql.err

from app.datasources.dialects.errors import (
    MYSQL_AUTH_FAILED,
    MYSQL_CONN_REFUSED,
    MYSQL_TIMEOUT,
    map_mysql_operational_error,
)


def test_map_mysql_operational_error_codes():
    code, _ = map_mysql_operational_error(pymysql.err.OperationalError(2003, "Connection refused"))
    assert code == MYSQL_CONN_REFUSED
    code, _ = map_mysql_operational_error(pymysql.err.OperationalError(1045, "Access denied"))
    assert code == MYSQL_AUTH_FAILED


@patch("app.datasources.dialects.mysql.pymysql.connect")
def test_mysql_connect_passes_charset_and_timeout(mock_connect):
    """T-CONN-M05: connect kwargs 含 charset=utf8mb4 与 timeout 整数。"""
    mock_connect.return_value = MagicMock()
    MysqlConnector().test_connection(
        host="127.0.0.1",
        port=3306,
        database="demo",
        username="root",
        password="x",
        timeout_sec=5.0,
    )
    kwargs = mock_connect.call_args.kwargs
    assert kwargs["charset"] == "utf8mb4"
    assert kwargs["connect_timeout"] == 5


@patch("app.datasources.dialects.mysql.pymysql.connect")
def test_mysql_operational_error_maps_conn_refused(mock_connect):
    """T-CONN-M06: 2003 → MYSQL_CONN_REFUSED。"""
    mock_connect.side_effect = pymysql.err.OperationalError(2003, "Connection refused")
    result = MysqlConnector().test_connection(
        host="h", port=3306, database="d", username="u", password="p",
    )
    assert MYSQL_CONN_REFUSED in result.message


@patch("app.datasources.dialects.mysql.pymysql.connect")
def test_mysql_operational_error_maps_auth_failed(mock_connect):
    """T-CONN-M07: 1045 → MYSQL_AUTH_FAILED。"""
    mock_connect.side_effect = pymysql.err.OperationalError(1045, "Access denied")
    result = MysqlConnector().test_connection(
        host="h", port=3306, database="d", username="u", password="p",
    )
    assert MYSQL_AUTH_FAILED in result.message


@patch("app.datasources.dialects.mysql.pymysql.connect")
def test_mysql_timeout_maps_code(mock_connect):
    """T-CONN-M08: 超时/延迟路径含 MYSQL_TIMEOUT 或 latencyMs。"""
    def slow_connect(**kwargs):
        time.sleep(0.01)
        raise pymysql.err.OperationalError(2003, "timed out")

    mock_connect.side_effect = slow_connect
    result = MysqlConnector().test_connection(
        host="h", port=3306, database="d", username="u", password="p", timeout_sec=1.0,
    )
    assert result.ok is False
    assert result.latency_ms is not None
    assert MYSQL_TIMEOUT in result.message or MYSQL_CONN_REFUSED in result.message


@patch("app.datasources.dialects.mysql.pymysql.connect")
def test_mysql_ssl_required_passes_ssl_kwarg(mock_connect):
    """T-CONN-M09: ssl_mode=required 时 connect 收到 ssl 参数。"""
    mock_connect.return_value = MagicMock()
    MysqlConnector().test_connection(
        host="h", port=3306, database="d", username="u", password="p", ssl_mode="required",
    )
    assert "ssl" in mock_connect.call_args.kwargs


def test_mysql_invalid_ssl_mode_raises():
    """T-CONN-M10: 非法 ssl_mode → ValueError。"""
    with pytest.raises(ValueError, match="ssl_mode"):
        MysqlConnector().test_connection(
            host="h", port=3306, database="d", username="u", password="p", ssl_mode="invalid",
        )
