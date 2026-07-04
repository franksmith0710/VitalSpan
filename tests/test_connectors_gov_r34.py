"""M11 连接器 + M13 治理 L1 kickoff r34 — CONN-021/009/015 + GOV-004/008."""
from __future__ import annotations

import os
import uuid
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.datasources.dialects.tidb import TidbConnector
from app.datasources.registry import export_type_catalog
from app.main import app

_R34_SQLITE_URL = "sqlite+pysqlite:///file:connectors_gov_r34?mode=memory&cache=shared&uri=true"
AUTH = {"Authorization": "Bearer dev"}


@pytest.fixture(scope="module", autouse=True)
def r34_sqlite_env():
    previous = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = _R34_SQLITE_URL
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


def test_tidb_in_types_catalog_r34():
    """T-CONN-R34-021-01: types 含 tidb relational。"""
    types = {item["type"]: item for item in export_type_catalog()}
    assert "tidb" in types
    assert types["tidb"]["category"] == "relational"
    assert "schema_browser" in types["tidb"]["capabilities"]


@patch("app.datasources.dialects.mysql.pymysql.connect")
def test_tidb_test_connection_ok_r34(mock_connect):
    """T-CONN-R34-021-02: mock pymysql 成功 → ok=True。"""
    conn = MagicMock()
    mock_connect.return_value = conn
    result = TidbConnector().test_connection(
        host="127.0.0.1", port=4000, database="test", username="root", password=""
    )
    assert result.ok is True
    conn.ping.assert_called_once_with(reconnect=False)
    conn.close.assert_called_once()
