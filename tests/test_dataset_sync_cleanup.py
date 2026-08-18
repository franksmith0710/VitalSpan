"""Dataset 与同步任务级联清理单测。"""

import os
import uuid
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

os.environ["DATABASE_URL"] = "sqlite+pysqlite:///file:dataset_cleanup?mode=memory&cache=shared&uri=true"
os.environ.setdefault(
    "ANALYTICS_DATABASE_URL",
    "postgresql+psycopg://vitalspan:vitalspan@localhost:5433/analytics",
)

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.config import get_settings
from app.ingestion.models import Base, SyncJob, get_meta_engine, get_meta_session
from app.main import app
from app.metadata.dataset.models import DatasetRecord

get_settings.cache_clear()
get_meta_engine.cache_clear()


@pytest.fixture(scope="module", autouse=True)
def ensure_tables():
    engine = get_meta_engine()
    Base.metadata.create_all(engine)
    import app.metadata.dataset.models  # noqa: F401
    import app.query.config_store.models  # noqa: F401
    from app.datasources.models import Base as MetaBase

    MetaBase.metadata.create_all(engine)
    yield
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM query_config_records"))
        conn.execute(text("DELETE FROM datasets"))
        conn.execute(text("DELETE FROM ingestion_sync_jobs"))


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_list_datasets_purges_orphan_sync_job_dataset(client, auth_headers):
    dataset_id = f"orphan_{uuid.uuid4().hex[:8]}"
    job_id = uuid.uuid4()
    db = get_meta_session()
    db.add(
        DatasetRecord(
            dataset_id=dataset_id,
            display_name="孤儿同步产物",
            tables=[{"name": f"public.{dataset_id}"}],
            computed_fields=[],
            allowed_roles=["analyst"],
            origin="sync_job",
            sync_job_id=job_id,
        ),
    )
    db.commit()
    db.close()

    listed = client.get("/api/v1/datasets", headers=auth_headers)
    assert listed.status_code == 200
    ids = [item["datasetId"] for item in listed.json()["items"]]
    assert dataset_id not in ids

    detail = client.get(f"/api/v1/datasets/{dataset_id}", headers=auth_headers)
    assert detail.status_code == 404


def test_delete_sync_job_cascades_bound_dataset(client, auth_headers):
    from app.core.crypto.credentials import encrypt_credential
    from app.datasources.models import DataSource, get_meta_session as ds_session

    db = ds_session()
    suffix = uuid.uuid4().hex[:8]
    row = DataSource(
        name=f"cleanup-mysql-{suffix}",
        code=f"cleanup_mysql_{suffix}",
        type="mysql",
        host="127.0.0.1",
        port=3307,
        database="sample_db",
        username="sample",
        password_encrypted=encrypt_credential("sample"),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    mysql_datasource_id = row.id
    db.close()

    target = f"cascade_{uuid.uuid4().hex[:8]}"
    payload = {
        "name": "cascade-job",
        "source_mode": "datasource",
        "source_data_source_id": str(mysql_datasource_id),
        "source_table": "dirty_orders",
        "target_table": target,
        "schedule_cron": None,
    }
    create = client.post("/api/v1/ingestion/sync-jobs", json=payload, headers=auth_headers)
    assert create.status_code == 201, create.text
    job_id = create.json()["id"]
    ds_id = uuid.uuid4()
    mock_columns = MagicMock()
    mock_columns.items = [SimpleNamespace(name="id"), SimpleNamespace(name="amount")]

    with (
        patch("app.ingestion.sync_consume.ensure_analytics_datasource", return_value=ds_id),
        patch("app.ingestion.sync_consume.list_columns", return_value=mock_columns),
    ):
        ensured = client.post(
            f"/api/v1/ingestion/sync-jobs/{job_id}/ensure-dataset",
            headers=auth_headers,
        )
    assert ensured.status_code == 200, ensured.text

    deleted = client.delete(f"/api/v1/ingestion/sync-jobs/{job_id}", headers=auth_headers)
    assert deleted.status_code == 204

    detail = client.get(f"/api/v1/datasets/{target}", headers=auth_headers)
    assert detail.status_code == 404

    db = get_meta_session()
    job = db.get(SyncJob, uuid.UUID(job_id))
    assert job is None
    row = db.get(DatasetRecord, target)
    assert row is None
    db.close()
