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
