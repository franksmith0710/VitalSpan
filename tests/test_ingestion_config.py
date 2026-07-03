import os

import pytest

from app.core.config import Settings, get_settings


@pytest.fixture(autouse=True)
def clear_settings_cache():
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_settings_loads_analytics_database_url_from_env(monkeypatch):
    url = "postgresql+psycopg://vitalspan:vitalspan@localhost:5433/analytics"
    monkeypatch.setenv("ANALYTICS_DATABASE_URL", url)
    settings = Settings(
        database_url=os.environ["DATABASE_URL"],
        secret_key=os.environ["SECRET_KEY"],
        credential_fernet_key=os.environ["CREDENTIAL_FERNET_KEY"],
    )
    assert settings.analytics_database_url == url


def test_settings_analytics_database_url_optional(monkeypatch):
    monkeypatch.delenv("ANALYTICS_DATABASE_URL", raising=False)
    settings = Settings(
        database_url=os.environ["DATABASE_URL"],
        secret_key=os.environ["SECRET_KEY"],
        credential_fernet_key=os.environ["CREDENTIAL_FERNET_KEY"],
    )
    assert settings.analytics_database_url is None


from pydantic import ValidationError


def test_settings_analytics_url_blank_treated_as_none(monkeypatch):
    """T-D04-03: 空白 ANALYTICS_DATABASE_URL → None。"""
    monkeypatch.setenv("ANALYTICS_DATABASE_URL", "   ")
    settings = Settings(
        database_url=os.environ["DATABASE_URL"],
        secret_key=os.environ["SECRET_KEY"],
        credential_fernet_key=os.environ["CREDENTIAL_FERNET_KEY"],
    )
    assert settings.analytics_database_url is None


def test_settings_analytics_url_invalid_raises_validation_error(monkeypatch):
    """T-D04-03: 非法 scheme → ValidationError。"""
    monkeypatch.setenv("ANALYTICS_DATABASE_URL", "not-a-valid-url")
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            database_url=os.environ["DATABASE_URL"],
            secret_key=os.environ["SECRET_KEY"],
            credential_fernet_key=os.environ["CREDENTIAL_FERNET_KEY"],
        )
    assert "托管分析库 URL" in str(exc_info.value)


def test_settings_analytics_url_valid_postgresql_passes(monkeypatch):
    """T-D04-08: 合法 postgresql+psycopg URL 通过。"""
    url = "postgresql+psycopg://vitalspan:vitalspan@localhost:5433/analytics"
    monkeypatch.setenv("ANALYTICS_DATABASE_URL", url)
    settings = Settings(
        database_url=os.environ["DATABASE_URL"],
        secret_key=os.environ["SECRET_KEY"],
        credential_fernet_key=os.environ["CREDENTIAL_FERNET_KEY"],
    )
    assert settings.analytics_database_url == url


def test_ingestion_migration_0002_revision_and_tables_exist():
    """T-D04-09: 0002 ingestion 迁移 revision 与三表名锚点。"""
    import importlib
    from pathlib import Path

    rev = importlib.import_module("migrations.versions.0002_ingestion_tables")
    assert rev.revision == "0002"
    text = Path("migrations/versions/0002_ingestion_tables.py").read_text(encoding="utf-8")
    for table in (
        "ingestion_sync_jobs",
        "ingestion_sync_runs",
        "ingestion_etl_rules",
    ):
        assert table in text


def test_settings_missing_credential_fernet_key_raises(monkeypatch):
    """T-D04-04: 缺 CREDENTIAL_FERNET_KEY 时 Settings 实例化失败。"""
    monkeypatch.delenv("CREDENTIAL_FERNET_KEY", raising=False)
    with pytest.raises(ValidationError):
        Settings(
            database_url=os.environ["DATABASE_URL"],
            secret_key=os.environ["SECRET_KEY"],
        )


from unittest.mock import MagicMock, patch

from app.ingestion.models import SyncJob, encrypt_password
from app.ingestion.sync_executor import _write_analytics


@patch("app.ingestion.sync_executor.create_engine")
@patch("app.ingestion.sync_executor.get_settings")
def test_write_analytics_uses_pool_pre_ping(mock_get_settings, mock_create_engine):
    """T-D04-11: _write_analytics 使用 pool_pre_ping=True。"""
    mock_get_settings.return_value.analytics_database_url = (
        "postgresql+psycopg://vitalspan:vitalspan@localhost:5433/analytics"
    )
    mock_engine = MagicMock()
    mock_conn = MagicMock()
    mock_create_engine.return_value = mock_engine
    mock_engine.begin.return_value.__enter__.return_value = mock_conn

    job = SyncJob(
        name="pool-ping-job",
        source_type="mysql",
        source_host="127.0.0.1",
        source_port=3307,
        source_database="db",
        source_username="u",
        source_password_encrypted=encrypt_password("p"),
        source_table="t",
        target_table="tgt_pool",
        enabled=True,
    )
    _write_analytics(job, [{"col": "val"}])

    mock_create_engine.assert_called_once_with(
        "postgresql+psycopg://vitalspan:vitalspan@localhost:5433/analytics",
        pool_pre_ping=True,
    )


def test_analytics_sqlite_fixture_contract(analytics_sqlite):
    """T-D04-12: analytics_sqlite fixture 返回内存 sqlite URL。"""
    assert analytics_sqlite == "sqlite+pysqlite:///:memory:"


def test_settings_rejects_sqlite_analytics_url(monkeypatch):
    """T-D04-12: Settings 校验拒绝 sqlite 托管库 URL（生产仅 postgresql）。"""
    monkeypatch.setenv("ANALYTICS_DATABASE_URL", "sqlite+pysqlite:///:memory:")
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            database_url=os.environ["DATABASE_URL"],
            secret_key=os.environ["SECRET_KEY"],
            credential_fernet_key=os.environ["CREDENTIAL_FERNET_KEY"],
        )
    assert "托管分析库 URL" in str(exc_info.value)


import uuid

from sqlalchemy import select, text
from sqlalchemy.exc import OperationalError

from app.ingestion.models import (
    Base,
    EtlRuleSet,
    SyncRun,
    encrypt_password,
    get_meta_engine,
    get_meta_session,
)
from app.ingestion.sync_executor import run_job

os.environ.setdefault(
    "DATABASE_URL",
    "sqlite+pysqlite:///file:ingestion_config_run?mode=memory&cache=shared&uri=true",
)
get_meta_engine.cache_clear()


@pytest.fixture(scope="module", autouse=True)
def ensure_ingestion_meta_tables():
    engine = get_meta_engine()
    Base.metadata.create_all(engine)
    yield
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM ingestion_sync_runs"))
        conn.execute(text("DELETE FROM ingestion_etl_rules"))
        conn.execute(text("DELETE FROM ingestion_sync_jobs"))


def _seed_config_run_job() -> uuid.UUID:
    db = get_meta_session()
    job = SyncJob(
        name="analytics-fail-job",
        source_type="mysql",
        source_host="127.0.0.1",
        source_port=3307,
        source_database="db",
        source_username="u",
        source_password_encrypted=encrypt_password("p"),
        source_table="t",
        target_table="tgt_analytics_fail",
        enabled=True,
    )
    db.add(job)
    db.flush()
    db.add(EtlRuleSet(job_id=job.id, rules=[]))
    db.commit()
    job_id = job.id
    db.close()
    return job_id


def _latest_run_for_config(job_id: uuid.UUID) -> SyncRun:
    db = get_meta_session()
    run = db.scalar(
        select(SyncRun).where(SyncRun.job_id == job_id).order_by(SyncRun.started_at.desc())
    )
    db.close()
    assert run is not None
    return run


@patch("app.ingestion.sync_executor.create_engine")
@patch("app.ingestion.sync_executor.get_settings")
def test_write_analytics_connection_refused_propagates(mock_get_settings, mock_create_engine):
    """T-D04-14: begin() OperationalError → _write_analytics 向外传播。"""
    mock_get_settings.return_value.analytics_database_url = (
        "postgresql+psycopg://vitalspan:vitalspan@localhost:5433/analytics"
    )
    mock_engine = MagicMock()
    mock_create_engine.return_value = mock_engine
    mock_engine.begin.side_effect = OperationalError("connection refused", None, None)

    job = SyncJob(
        name="conn-refused-direct",
        source_type="mysql",
        source_host="127.0.0.1",
        source_port=3307,
        source_database="db",
        source_username="u",
        source_password_encrypted=encrypt_password("p"),
        source_table="t",
        target_table="tgt_refused",
        enabled=True,
    )
    with pytest.raises(OperationalError, match="connection refused"):
        _write_analytics(job, [{"col": "val"}])


@patch("app.ingestion.sync_executor.create_engine")
@patch("app.ingestion.sync_executor.get_settings")
@patch(
    "app.ingestion.sync_executor._fetch_mysql_rows",
    return_value=[{"product_name": "A", "amount": "1", "status": "active", "note": None}],
)
def test_run_job_analytics_connection_refused_failed(
    mock_fetch, mock_get_settings, mock_create_engine
):
    """T-D04-14: analytics 连接拒绝经 run_job → failed + 可读 error_message ≤500。"""
    mock_get_settings.return_value.analytics_database_url = (
        "postgresql+psycopg://vitalspan:vitalspan@localhost:5433/analytics"
    )
    mock_engine = MagicMock()
    mock_create_engine.return_value = mock_engine
    mock_engine.begin.side_effect = OperationalError("connection refused", None, None)

    job_id = _seed_config_run_job()
    run_job(job_id, "trace-analytics-refused")
    run = _latest_run_for_config(job_id)
    assert run.status == "failed"
    assert run.error_message is not None
    assert "connection refused" in run.error_message or "refused" in run.error_message.lower()
    assert len(run.error_message) <= 500


@patch("app.ingestion.sync_executor.create_engine")
@patch("app.ingestion.sync_executor.get_settings")
@patch(
    "app.ingestion.sync_executor._fetch_mysql_rows",
    return_value=[{"col": "v"}],
)
def test_run_job_bad_analytics_host_runtime_write_failed(
    mock_fetch, mock_get_settings, mock_create_engine
):
    """T-D04-15: 非法 host URL Settings 可过但 runtime write 失败 → failed。"""
    bad_url = "postgresql+psycopg://bad:bad@127.0.0.1:1/none"
    mock_get_settings.return_value.analytics_database_url = bad_url
    mock_engine = MagicMock()
    mock_create_engine.return_value = mock_engine
    mock_engine.begin.side_effect = OperationalError("could not connect", None, None)

    job_id = _seed_config_run_job()
    run_job(job_id, "trace-bad-host")
    run = _latest_run_for_config(job_id)
    assert run.status == "failed"
    assert run.error_message is not None
    assert len(run.error_message) <= 500
    mock_create_engine.assert_called_with(bad_url, pool_pre_ping=True)
