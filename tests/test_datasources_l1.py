from __future__ import annotations

import os
from unittest.mock import MagicMock, patch

import pytest
from pydantic import ValidationError

from app.core.config import Settings, get_settings
from app.datasources import register_builtin_dialects
from app.datasources.credentials import decrypt_credential, encrypt_credential
from app.datasources.dialects.mysql import MysqlConnector
from app.datasources.registry import (
    ConnectorAlreadyRegisteredError,
    ConnectorNotFoundError,
    registry,
    register_dialect,
)


@pytest.fixture(autouse=True)
def reset_registry():
    registry._connectors.clear()
    register_builtin_dialects()
    yield
    registry._connectors.clear()


def test_registry_list_types_includes_mysql():
    """T-DS-R01: list_types() 含 mysql。"""
    types = {item.type: item for item in registry.list_types()}
    assert "mysql" in types
    assert types["mysql"].category == "relational"
    assert "connectivity_test" in types["mysql"].capabilities


def test_registry_get_mysql_returns_connector():
    """T-DS-R02: get('mysql') 返回方言实例。"""
    connector = registry.get("mysql")
    assert connector.type == "mysql"
    assert callable(connector.test_connection)


def test_registry_get_unknown_raises():
    """T-DS-R03: get('unknown') 抛 ConnectorNotFoundError。"""
    with pytest.raises(ConnectorNotFoundError):
        registry.get("unknown")


def test_registry_duplicate_register_rejected():
    """T-DS-R04: 重复 register 同 type 抛 ConnectorAlreadyRegisteredError。"""
    with pytest.raises(ConnectorAlreadyRegisteredError):
        register_dialect(MysqlConnector())


def test_mysql_connector_attributes():
    """T-CONN-M01: 方言属性符合契约。"""
    connector = MysqlConnector()
    assert connector.type == "mysql"
    assert connector.category == "relational"
    assert connector.capabilities == ("connectivity_test",)


@patch("app.datasources.dialects.mysql.pymysql.connect")
def test_mysql_mock_connect_success(mock_connect):
    """T-CONN-M02: mock connect 成功。"""
    connection = MagicMock()
    mock_connect.return_value = connection
    result = MysqlConnector().test_connection(
        host="127.0.0.1",
        port=3306,
        database="demo",
        username="root",
        password="secret",
    )
    assert result.ok is True
    assert result.latency_ms is not None
    connection.ping.assert_called_once_with(reconnect=False)
    connection.close.assert_called_once()


@patch("app.datasources.dialects.mysql.pymysql.connect")
def test_mysql_mock_operational_error(mock_connect):
    """T-CONN-M03: mock OperationalError 脱敏失败。"""
    import pymysql.err

    mock_connect.side_effect = pymysql.err.OperationalError(1045, "Access denied for user")
    result = MysqlConnector().test_connection(
        host="127.0.0.1",
        port=3306,
        database="demo",
        username="root",
        password="secret",
    )
    assert result.ok is False
    assert "Access denied" in result.message
    assert "secret" not in result.message


def test_credential_encrypt_decrypt_roundtrip():
    """T-DS-K01: 加解密 round-trip。"""
    plain = "mysql-source-password"
    cipher = encrypt_credential(plain)
    assert cipher != plain
    assert decrypt_credential(cipher) == plain


def test_settings_missing_credential_fernet_key_raises(monkeypatch):
    """T-DS-K04: 缺 CREDENTIAL_FERNET_KEY 时 Settings 构造失败。"""
    monkeypatch.delenv("CREDENTIAL_FERNET_KEY", raising=False)
    get_settings.cache_clear()
    with pytest.raises(ValidationError):
        Settings(
            database_url=os.environ["DATABASE_URL"],
            secret_key=os.environ["SECRET_KEY"],
        )
    get_settings.cache_clear()
