from __future__ import annotations

import os
import threading
import time
from unittest.mock import MagicMock, patch

import pymysql.err
import pytest

from app.core.config import get_settings
from app.datasources import register_builtin_dialects
from app.datasources.models import Base, get_meta_engine
from app.datasources.dialects.base import TestConnectionResult
from app.datasources.dialects.errors import MYSQL_SSL_ERROR, MYSQL_UNKNOWN_DATABASE
from app.datasources.dialects.mysql import MysqlConnector
from app.datasources.registry import (
    ConnectorAlreadyRegisteredError,
    export_type_catalog,
    registry,
    register_dialect,
    unregister,
)

_DS_SQLITE_URL = "sqlite+pysqlite:///file:ds_r24_test?mode=memory&cache=shared&uri=true"


@pytest.fixture(scope="module", autouse=True)
def ds_r24_sqlite_env():
    previous = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = _DS_SQLITE_URL
    get_settings.cache_clear()
    from app.auth.models import get_meta_engine as auth_get_meta_engine
    from app.datasources.models import get_meta_engine as ds_get_meta_engine

    ds_get_meta_engine.cache_clear()
    auth_get_meta_engine.cache_clear()
    yield
    if previous is None:
        os.environ.pop("DATABASE_URL", None)
    else:
        os.environ["DATABASE_URL"] = previous
    get_settings.cache_clear()
    ds_get_meta_engine.cache_clear()
    auth_get_meta_engine.cache_clear()


@pytest.fixture(scope="module", autouse=True)
def ensure_data_sources_table_r24():
    get_meta_engine.cache_clear()
    engine = get_meta_engine()
    Base.metadata.create_all(engine)
    yield


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


class _StubConnector:
    def __init__(self, type: str) -> None:
        self._type = type

    @property
    def type(self) -> str:
        return self._type

    @property
    def category(self) -> str:
        return "stub"

    @property
    def capabilities(self) -> tuple[str, ...]:
        return ("connectivity_test",)

    def test_connection(self, **kwargs) -> TestConnectionResult:
        return TestConnectionResult(ok=True, message="ok", latency_ms=0)


def test_concurrent_register_unregister_stub_connectors():
    """T-DS-R09: 10 线程交替 register/unregister stub，最终含 mysql。"""
    registry._connectors.clear()
    register_builtin_dialects()
    errors: list[Exception] = []

    def worker(i: int) -> None:
        name = f"stub_{i % 3}"
        try:
            if name in registry._connectors:
                unregister(name)
            else:
                register_dialect(_StubConnector(name))
        except Exception as exc:
            errors.append(exc)

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(10)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert not errors
    types = {item.type for item in registry.list_types()}
    assert "mysql" in types


def test_duplicate_register_raises():
    """T-DS-R10: 重复 register 同 type → ConnectorAlreadyRegisteredError。"""
    registry._connectors.clear()
    register_dialect(_StubConnector("dup_test"))
    with pytest.raises(ConnectorAlreadyRegisteredError):
        register_dialect(_StubConnector("dup_test"))


def test_export_type_catalog_matches_list_types():
    """T-DS-R11: export_type_catalog 与 list_types 一致。"""
    registry._connectors.clear()
    register_builtin_dialects()
    catalog = export_type_catalog()
    listed = registry.list_types()
    assert len(catalog) == len(listed)
    for entry, desc in zip(catalog, listed, strict=True):
        assert entry["type"] == desc.type
        assert entry["category"] == desc.category
        assert entry["capabilities"] == list(desc.capabilities)


def test_ingestion_mysql_type_in_catalog():
    """T-DS-R12: mysql ∈ catalog；postgres 未注册为已知差距（CONN-002）。"""
    registry._connectors.clear()
    register_builtin_dialects()
    types = {entry["type"] for entry in export_type_catalog()}
    assert "mysql" in types
    assert "postgres" not in types  # CONN-002 待实现


import logging
import uuid

from cryptography.fernet import Fernet

from app.datasources.credentials import CredentialDecryptError, decrypt_credential, encrypt_credential
from app.datasources.models import DataSource, get_meta_session
from sqlalchemy import text


@pytest.fixture(autouse=True)
def clean_data_sources_r24():
    yield
    with get_meta_engine().begin() as conn:
        conn.execute(text("DELETE FROM data_sources"))


def test_decrypt_with_previous_key_roundtrip(monkeypatch):
    """T-DS-K09: PREVIOUS key 可解密旧密文。"""
    old_key = Fernet.generate_key().decode()
    new_key = Fernet.generate_key().decode()
    plain = "rotate-me"
    cipher = Fernet(old_key.encode()).encrypt(plain.encode()).decode()
    monkeypatch.setenv("CREDENTIAL_FERNET_KEY", new_key)
    monkeypatch.setenv("CREDENTIAL_FERNET_KEY_PREVIOUS", old_key)
    get_settings.cache_clear()
    assert decrypt_credential(cipher) == plain


def test_decrypt_both_keys_fail_raises(monkeypatch):
    """T-DS-K10: 双钥均失败 → CredentialDecryptError。"""
    monkeypatch.setenv("CREDENTIAL_FERNET_KEY", Fernet.generate_key().decode())
    monkeypatch.setenv("CREDENTIAL_FERNET_KEY_PREVIOUS", Fernet.generate_key().decode())
    get_settings.cache_clear()
    with pytest.raises(CredentialDecryptError):
        decrypt_credential("not-valid-fernet-token")


def test_settings_fails_without_credential_fernet_key(monkeypatch):
    """T-DS-K11: 缺 CREDENTIAL_FERNET_KEY → Settings 构造失败。"""
    monkeypatch.delenv("CREDENTIAL_FERNET_KEY", raising=False)
    get_settings.cache_clear()
    with pytest.raises(Exception):
        get_settings()


def test_test_failure_path_logs_no_secrets(caplog, client, auth_headers):
    """T-DS-K12: test 失败路径 caplog 无 password 明文与完整 cipher。"""
    caplog.set_level(logging.INFO)
    created = client.post(
        "/api/v1/datasources",
        json={
            "name": "Log DS",
            "code": "log_ds",
            "type": "mysql",
            "host": "127.0.0.1",
            "port": 3306,
            "database": "demo",
            "username": "root",
            "password": "plain-secret",
        },
        headers=auth_headers,
    )
    ds_id = created.json()["id"]
    session = get_meta_session()
    row = session.get(DataSource, uuid.UUID(ds_id))
    cipher = row.password_encrypted
    row.password_encrypted = "corrupt-cipher"
    session.commit()
    session.close()
    with patch("app.datasources.dialects.mysql.pymysql.connect") as mock_connect:
        mock_connect.side_effect = pymysql.err.OperationalError(2003, "refused")
        client.post(f"/api/v1/datasources/{ds_id}/test", headers=auth_headers)
    assert "plain-secret" not in caplog.text
    assert "password=" not in caplog.text.lower()
    assert cipher not in caplog.text


from app.datasources.schemas import ConnectionOptions, DataSourceCreate


def test_connection_options_defaults():
    opts = ConnectionOptions()
    assert opts.charset == "utf8mb4"
    assert opts.ssl_mode == "preferred"
    assert opts.connect_timeout_sec == 5.0


def test_datasource_create_accepts_connection_options():
    payload = DataSourceCreate(
        name="Opts DS",
        code="opts_ds",
        type="mysql",
        host="127.0.0.1",
        port=3306,
        database="demo",
        username="root",
        password="secret",
        connection_options=ConnectionOptions(ssl_mode="required", connect_timeout_sec=3.0),
    )
    assert payload.connection_options is not None
    assert payload.connection_options.ssl_mode == "required"
