"""sync_consume 域集成：ensure-dataset 不经 endpoint 层 mock。"""
from __future__ import annotations

import os
import uuid
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy.orm import Session

from app.auth.deps import UserContext
from app.core.config import get_settings
from app.ingestion.models import Base as IngestionBase, SyncJob, get_meta_engine
from app.ingestion.sync_consume import ensure_dataset_for_sync_job
from app.metadata.dataset.models import DatasetRecord

_SQLITE_URL = "sqlite+pysqlite:///file:sync_consume_test?mode=memory&cache=shared&uri=true"


@pytest.fixture(scope="module", autouse=True)
def sync_consume_sqlite_env():
    previous = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = _SQLITE_URL
    os.environ.setdefault(
        "ANALYTICS_DATABASE_URL",
        "postgresql+psycopg://vitalspan:vitalspan@localhost:5433/analytics",
    )
    get_settings.cache_clear()
    get_meta_engine.cache_clear()

    import app.metadata.dataset.models  # noqa: F401
    import app.query.config_store.models  # noqa: F401
    from app.datasources.models import Base as MetaBase

    engine = get_meta_engine()
    IngestionBase.metadata.create_all(engine)
    MetaBase.metadata.create_all(engine)
    yield
    if previous is None:
        os.environ.pop("DATABASE_URL", None)
    else:
        os.environ["DATABASE_URL"] = previous
    get_settings.cache_clear()
    get_meta_engine.cache_clear()


@pytest.fixture
def db_session() -> Session:
    from app.ingestion.models import get_meta_session

    session = get_meta_session()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def admin_actor() -> UserContext:
    return UserContext(id=str(uuid.uuid4()), username="admin", roles=["admin"])


def test_ensure_dataset_for_sync_job_creates_and_binds(
    db_session: Session,
    admin_actor: UserContext,
) -> None:
    ds_id = uuid.uuid4()
    dataset_id = f"truth_ensure_{uuid.uuid4().hex[:8]}"
    job = SyncJob(
        name="truth-job",
        target_table=dataset_id,
        schedule_cron=None,
        enabled=True,
        source_type="mysql",
        source_host="127.0.0.1",
        source_port=3307,
        source_database="sample_db",
        source_username="sample",
        source_password_encrypted="x",
        source_table="dirty_orders",
    )
    db_session.add(job)
    db_session.commit()

    mock_columns = MagicMock()
    mock_columns.items = [SimpleNamespace(name="id"), SimpleNamespace(name="amount")]

    with (
        patch(
            "app.ingestion.sync_consume.ensure_analytics_datasource",
            return_value=ds_id,
        ),
        patch(
            "app.ingestion.sync_consume.list_columns",
            return_value=mock_columns,
        ),
    ):
        result = ensure_dataset_for_sync_job(db_session, job, admin_actor)

    assert result.dataset_id == dataset_id
    assert result.bound is True
    assert result.bound_config_id is not None

    row = db_session.get(DatasetRecord, dataset_id)
    assert row is not None
    assert row.bound_config_id == result.bound_config_id

    db_session.delete(job)
    if row:
        db_session.delete(row)
    db_session.commit()


def test_ensure_dataset_for_sync_job_idempotent_when_bound(
    db_session: Session,
    admin_actor: UserContext,
) -> None:
    ds_id = uuid.uuid4()
    dataset_id = f"truth_bound_{uuid.uuid4().hex[:8]}"
    job = SyncJob(
        name="truth-job-bound",
        target_table=dataset_id,
        schedule_cron=None,
        enabled=True,
        source_type="mysql",
        source_host="127.0.0.1",
        source_port=3307,
        source_database="sample_db",
        source_username="sample",
        source_password_encrypted="x",
        source_table="dirty_orders",
    )
    db_session.add(job)
    db_session.commit()

    mock_columns = MagicMock()
    mock_columns.items = [SimpleNamespace(name="id")]

    with (
        patch(
            "app.ingestion.sync_consume.ensure_analytics_datasource",
            return_value=ds_id,
        ),
        patch(
            "app.ingestion.sync_consume.list_columns",
            return_value=mock_columns,
        ),
    ):
        first = ensure_dataset_for_sync_job(db_session, job, admin_actor)
        second = ensure_dataset_for_sync_job(db_session, job, admin_actor)

    assert first.bound is True
    assert second.bound is False
    assert second.bound_config_id == first.bound_config_id

    row = db_session.get(DatasetRecord, dataset_id)
    db_session.delete(job)
    if row:
        db_session.delete(row)
    db_session.commit()
