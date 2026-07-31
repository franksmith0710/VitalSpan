"""官方示例 Dataset seed 幂等与删除保护。"""

from __future__ import annotations

import os

import pytest
from sqlalchemy import select, text

from app.core.config import get_settings
from app.datasources.models import Base, get_meta_engine, get_meta_session
from app.metadata.dataset.demo_seed import DEMO_DATASET_IDS, seed_demo_datasets
from app.metadata.dataset.models import DatasetRecord

_DEMO_DS_SQLITE = "sqlite+pysqlite:///file:demo_ds_seed?mode=memory&cache=shared&uri=true"


@pytest.fixture(scope="module", autouse=True)
def demo_ds_sqlite_env():
    previous = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = _DEMO_DS_SQLITE
    get_settings.cache_clear()
    from app.auth.models import get_meta_engine as auth_get_meta_engine

    get_meta_engine.cache_clear()
    auth_get_meta_engine.cache_clear()
    engine = get_meta_engine()
    Base.metadata.create_all(engine)
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM datasets"))
    yield
    if previous is None:
        os.environ.pop("DATABASE_URL", None)
    else:
        os.environ["DATABASE_URL"] = previous
    get_settings.cache_clear()
    get_meta_engine.cache_clear()
    auth_get_meta_engine.cache_clear()


@pytest.fixture
def db_session():
    session = get_meta_session()
    try:
        yield session
        session.rollback()
        session.execute(text("DELETE FROM datasets"))
        session.commit()
    finally:
        session.close()


def test_seed_demo_datasets_idempotent(db_session) -> None:
    first = seed_demo_datasets(db_session)
    assert first == len(DEMO_DATASET_IDS)

    ids = db_session.scalars(select(DatasetRecord.dataset_id)).all()
    assert set(ids) == set(DEMO_DATASET_IDS)

    names = db_session.scalars(select(DatasetRecord.display_name)).all()
    assert all(name.startswith("【官方示例】") for name in names)

    second = seed_demo_datasets(db_session)
    assert second == 0


def test_demo_dataset_delete_protected(client, auth_headers, db_session) -> None:
    seed_demo_datasets(db_session)

    res = client.delete("/api/v1/datasets/demo-sales-wide", headers=auth_headers)
    assert res.status_code == 409
    assert res.json()["code"] == "META_DATASET_DEMO_PROTECTED"


def test_dataset_list_marks_demo_package(client, auth_headers, db_session) -> None:
    seed_demo_datasets(db_session)

    res = client.get("/api/v1/datasets", headers=auth_headers)
    assert res.status_code == 200
    demo_items = [item for item in res.json()["items"] if item["datasetId"].startswith("demo-")]
    assert len(demo_items) == len(DEMO_DATASET_IDS)
    assert all(item["isDemoPackage"] is True for item in demo_items)
