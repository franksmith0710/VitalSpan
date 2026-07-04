"""M11 关系型/OLAP 连接器 companion 质量推分 r37 — CONN-004/008/005/003/007."""
from __future__ import annotations

import os
import uuid
from contextlib import contextmanager
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.datasources.models import get_meta_session
from app.datasources.schemas import DataSourceCreate
from app.datasources.service import create_data_source
from app.main import app

_R37_SQLITE_URL = "sqlite+pysqlite:///file:connectors_gov_r37?mode=memory&cache=shared&uri=true"
AUTH = {"Authorization": "Bearer dev"}


@pytest.fixture(scope="module", autouse=True)
def r37_sqlite_env():
    previous = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = _R37_SQLITE_URL
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


def _create_typed_ds(ds_type: str, name_suffix: str | None = None):
    suffix = name_suffix or uuid.uuid4().hex[:8]
    session = get_meta_session()
    try:
        defaults = {
            "mysql": dict(port=3306),
            "doris": dict(port=9030),
            "hive": dict(port=10000, database="default"),
            "clickhouse": dict(port=8123, database="default"),
            "sqlserver": dict(port=1433, database="master"),
            "oracle": dict(port=1521, database="ORCL"),
        }
        extra = defaults.get(ds_type, {})
        return create_data_source(
            session,
            DataSourceCreate(
                name=f"{ds_type}-{suffix}",
                code=f"{ds_type}-{suffix}",
                type=ds_type,
                host="127.0.0.1",
                port=extra.get("port", 5432),
                database=extra.get("database", "test"),
                username="user",
                password="secret",
            ),
        )
    finally:
        session.close()


def test_r37_scaffold():
    """占位：fixture 可加载。"""
    assert app is not None
