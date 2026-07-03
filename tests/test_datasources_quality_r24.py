from __future__ import annotations

import time
from unittest.mock import MagicMock, patch

import pymysql.err
import pytest

from app.datasources.dialects.errors import MYSQL_SSL_ERROR, MYSQL_UNKNOWN_DATABASE
from app.datasources.dialects.mysql import MysqlConnector


@patch("app.datasources.dialects.mysql.pymysql.connect")
def test_mysql_collation_sets_init_command(mock_connect):
    """T-CONN-M11: collation=utf8mb4_unicode_ci → init_command SET NAMES。"""
    mock_connect.return_value = MagicMock()
    MysqlConnector().test_connection(
        host="h",
        port=3306,
        database="d",
        username="u",
        password="p",
        charset="utf8mb4",
        collation="utf8mb4_unicode_ci",
    )
    kwargs = mock_connect.call_args.kwargs
    assert kwargs.get("init_command") == "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"


@patch("app.datasources.dialects.mysql.pymysql.connect")
def test_mysql_layered_timeouts(mock_connect):
    """T-CONN-M12: connect_timeout_sec=3, read_timeout_sec=10。"""
    mock_connect.return_value = MagicMock()
    MysqlConnector().test_connection(
        host="h",
        port=3306,
        database="d",
        username="u",
        password="p",
        connect_timeout_sec=3.0,
        read_timeout_sec=10.0,
    )
    kwargs = mock_connect.call_args.kwargs
    assert kwargs["connect_timeout"] == 3
    assert kwargs["read_timeout"] == 10


@patch("app.datasources.dialects.mysql.pymysql.connect")
def test_mysql_ssl_preferred_omits_ssl_kwarg(mock_connect):
    """T-CONN-M13: ssl_mode=preferred 不传 ssl。"""
    mock_connect.return_value = MagicMock()
    MysqlConnector().test_connection(
        host="h", port=3306, database="d", username="u", password="p", ssl_mode="preferred",
    )
    assert "ssl" not in mock_connect.call_args.kwargs


@patch("app.datasources.dialects.mysql.pymysql.connect")
def test_mysql_errno_1049_maps_unknown_database(mock_connect):
    """T-CONN-M14: errno 1049 → code MYSQL_UNKNOWN_DATABASE。"""
    mock_connect.side_effect = pymysql.err.OperationalError(1049, "Unknown database 'missing'")
    result = MysqlConnector().test_connection(
        host="h", port=3306, database="missing", username="u", password="p",
    )
    assert result.ok is False
    assert result.code == MYSQL_UNKNOWN_DATABASE
    assert MYSQL_UNKNOWN_DATABASE in result.message


@patch("app.datasources.dialects.mysql.pymysql.connect")
def test_mysql_ssl_handshake_maps_ssl_error(mock_connect):
    """T-CONN-M15: SSL 握手失败 → MYSQL_SSL_ERROR。"""
    mock_connect.side_effect = pymysql.err.OperationalError(2026, "SSL connection error")
    result = MysqlConnector().test_connection(
        host="h", port=3306, database="d", username="u", password="p", ssl_mode="required",
    )
    assert result.code == MYSQL_SSL_ERROR


@patch("app.datasources.dialects.mysql.pymysql.connect")
def test_mysql_success_has_no_code(mock_connect):
    """T-CONN-M16: 成功 ok=True, code is None。"""
    mock_connect.return_value = MagicMock()
    result = MysqlConnector().test_connection(
        host="h", port=3306, database="d", username="u", password="p",
    )
    assert result.ok is True
    assert result.code is None
    assert result.latency_ms is not None
