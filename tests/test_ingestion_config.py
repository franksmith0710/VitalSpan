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
