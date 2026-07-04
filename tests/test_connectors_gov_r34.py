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


import pymysql.err

from app.datasources.dialects.starrocks import StarrocksConnector


def test_starrocks_in_types_catalog_r34():
    """T-CONN-R34-009-01: types 含 starrocks category olap。"""
    types = {item["type"]: item for item in export_type_catalog()}
    assert "starrocks" in types
    assert types["starrocks"]["category"] == "olap"


@patch("app.datasources.dialects.mysql.pymysql.connect")
def test_starrocks_timeout_structured_r34(mock_connect):
    """T-CONN-R34-009-02: 超时 OperationalError → ok=False 且 message 含 timeout 语义。"""
    mock_connect.side_effect = pymysql.err.OperationalError(2013, "Lost connection: timeout expired")
    result = StarrocksConnector().test_connection(
        host="127.0.0.1", port=9030, database="test", username="root", password=""
    )
    assert result.ok is False
    assert result.code == "STARROCKS_TIMEOUT"
    assert "timeout" in result.message.lower()


from app.datasources.dialects.elasticsearch import ElasticsearchConnector


def test_elasticsearch_in_types_catalog_r34():
    """T-CONN-R34-015-01: types 含 elasticsearch category search。"""
    types = {item["type"]: item for item in export_type_catalog()}
    assert "elasticsearch" in types
    assert types["elasticsearch"]["category"] == "search"


@patch("app.datasources.dialects.elasticsearch.Elasticsearch")
def test_elasticsearch_list_schemas_and_columns_r34(mock_es_cls):
    """T-CONN-R34-015-02: mock index list + mapping columns。"""
    client = MagicMock()
    mock_es_cls.return_value = client
    client.info.return_value = {"version": {"number": "8.11.0"}}
    client.cat.indices.return_value = [{"index": "orders"}, {"index": ".system"}]
    client.indices.get_mapping.return_value = {
        "orders": {"mappings": {"properties": {"amount": {"type": "long"}, "status": {"type": "keyword"}}}}
    }
    connector = ElasticsearchConnector()
    ok = connector.test_connection(host="127.0.0.1", port=9200, database="", username="", password="")
    assert ok.ok is True
    conn = connector.open_connection(host="127.0.0.1", port=9200, database="", username="", password="")
    schemas = connector.list_schemas(conn)
    assert [s.name for s in schemas] == ["orders"]
    tables = connector.list_tables(conn, "orders")
    assert tables[0].name == "_doc"
    cols = connector.list_columns(conn, "orders", "_doc")
    assert {c.name for c in cols} == {"amount", "status"}


def test_elasticsearch_invalid_host_r34():
    """T-CONN-R34-015-03: 空 host → ok=False 结构化。"""
    result = ElasticsearchConnector().test_connection(
        host="", port=9200, database="", username="", password=""
    )
    assert result.ok is False
    assert result.code == "ES_INVALID_HOST"
