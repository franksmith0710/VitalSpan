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
