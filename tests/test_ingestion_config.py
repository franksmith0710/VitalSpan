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
