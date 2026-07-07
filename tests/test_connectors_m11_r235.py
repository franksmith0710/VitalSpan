"""M11 三期原生连接器扩展批次 1 r235 — CONN-009~013 集成验收。

可选 compose 端口（integration 分层 skip）：
  - StarRocks: 127.0.0.1:9030
  - Trino/Presto: 127.0.0.1:8080
  - InfluxDB: 127.0.0.1:8086
  - TDengine: 127.0.0.1:6041
  - TimescaleDB: 127.0.0.1:5433
"""
from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import app

_R235_SQLITE_URL = "sqlite+pysqlite:///file:connectors_m11_r235?mode=memory&cache=shared&uri=true"

pytestmark = [pytest.mark.integration]


@pytest.fixture(scope="module", autouse=True)
def r235_sqlite_env():
    previous = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = _R235_SQLITE_URL
    get_settings.cache_clear()
    from app.auth.models import Base as AuthBase, get_meta_engine as auth_engine
    from app.datasources.models import Base, get_meta_engine
    from app.query.models import Base as QueryBase
    import app.auth.models  # noqa: F401
    import app.dashboard.models  # noqa: F401
    import app.datasources.models  # noqa: F401
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
def client() -> TestClient:
    return TestClient(app)


def test_r235_scaffold_imports():
    """Scaffold: module loads and sqlite meta DB is ready."""
    assert app is not None
