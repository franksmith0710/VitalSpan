"""M12 Query 翻译器 + M11 信创/专项连接器 + META 维度 L1 kickoff r38."""
from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import app

_R38_SQLITE_URL = "sqlite+pysqlite:///file:query_meta_conn_r38?mode=memory&cache=shared&uri=true"
AUTH = {"Authorization": "Bearer dev"}


@pytest.fixture(scope="module", autouse=True)
def r38_sqlite_env():
    previous = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = _R38_SQLITE_URL
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


def test_r38_scaffold(client):
    """T-R38-000-01: fixture 可用，/health 200。"""
    assert client.get("/health").status_code == 200
