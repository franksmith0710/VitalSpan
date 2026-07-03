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


import logging
import uuid

from fastapi.testclient import TestClient
from sqlalchemy import text

from app.datasources.credentials import CredentialDecryptError, decrypt_credential, encrypt_credential
from app.datasources.models import Base, DataSource, get_meta_engine, get_meta_session
from app.datasources.schemas import DataSourceCreate
from app.datasources.service import create_data_source
from app.main import app


@pytest.fixture(scope="module", autouse=True)
def ensure_data_sources_table():
    from app.datasources.models import get_meta_engine

    get_meta_engine.cache_clear()
    engine = get_meta_engine()
    Base.metadata.create_all(engine)
    yield
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM data_sources"))


@pytest.fixture(autouse=True)
def clean_data_sources_between_tests():
    from app.datasources.models import get_meta_engine

    yield
    engine = get_meta_engine()
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM data_sources"))


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def auth_headers() -> dict[str, str]:
    return {"Authorization": "Bearer dev"}


def _payload() -> dict:
    return {
        "name": "Demo MySQL",
        "code": "demo_mysql",
        "type": "mysql",
        "host": "127.0.0.1",
        "port": 3306,
        "database": "demo",
        "username": "root",
        "password": "plain-secret",
    }


def test_decrypt_corrupt_ciphertext_raises_credential_decrypt_error():
    """T-DS-K05: 损坏密文 → CredentialDecryptError。"""
    with pytest.raises(CredentialDecryptError):
        decrypt_credential("not-valid-fernet-token")


def test_decrypt_wrong_key_raises_credential_decrypt_error(monkeypatch):
    """T-DS-K06 单元部分: 错密钥 decrypt 失败。"""
    cipher = encrypt_credential("secret")
    monkeypatch.setenv("CREDENTIAL_FERNET_KEY", "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=")
    get_settings.cache_clear()
    with pytest.raises(CredentialDecryptError):
        decrypt_credential(cipher)


def test_create_path_logs_no_plain_password(caplog):
    """T-DS-K07: create 路径日志无 plain-secret。"""
    caplog.set_level(logging.INFO)
    session = get_meta_session()
    try:
        create_data_source(
            session,
            DataSourceCreate(
                name="Caplog DS",
                code="caplog_ds",
                type="mysql",
                host="127.0.0.1",
                port=3306,
                database="demo",
                username="root",
                password="plain-secret",
            ),
        )
    finally:
        session.close()
    assert "plain-secret" not in caplog.text


def test_api_responses_never_include_real_password(client, auth_headers):
    """T-DS-K08: create/get/list 响应无真实密码。"""
    payload = {
        "name": "Mask DS",
        "code": "mask_ds",
        "type": "mysql",
        "host": "127.0.0.1",
        "port": 3306,
        "database": "demo",
        "username": "root",
        "password": "plain-secret",
    }
    created = client.post("/api/v1/datasources", json=payload, headers=auth_headers)
    assert created.status_code == 201
    body = created.json()
    assert body["password"] == "***"
    assert "plain-secret" not in created.text
    listed = client.get("/api/v1/datasources", headers=auth_headers)
    assert "plain-secret" not in listed.text


@patch("app.datasources.dialects.mysql.pymysql.connect")
def test_saved_test_decrypt_failure_returns_500(mock_connect, client, auth_headers):
    """T-DS-K06 API: 损坏密文 test → 500 CREDENTIAL_DECRYPT_FAILED。"""
    created = client.post("/api/v1/datasources", json=_payload(), headers=auth_headers)
    ds_id = created.json()["id"]
    session = get_meta_session()
    row = session.get(DataSource, uuid.UUID(ds_id))
    row.password_encrypted = "corrupt"
    session.commit()
    session.close()
    resp = client.post(f"/api/v1/datasources/{ds_id}/test", headers=auth_headers)
    assert resp.status_code == 500
    assert resp.json()["code"] == "CREDENTIAL_DECRYPT_FAILED"
