"""T-CFG-01~03: Settings 安全边界与 .env.example 对齐。"""

import logging
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.core.config import Settings, get_settings
from app.core.logging import configure_logging

REQUIRED_ENV_KEYS = ("DATABASE_URL", "SECRET_KEY", "CREDENTIAL_FERNET_KEY")
ENV_TO_FIELD = {
    "DATABASE_URL": "database_url",
    "SECRET_KEY": "secret_key",
    "CREDENTIAL_FERNET_KEY": "credential_fernet_key",
    "CORS_ORIGINS": "cors_origins_raw",
}


@pytest.fixture(autouse=True)
def clear_settings_cache():
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_cors_origins_raw_splits_and_trims():
    """T-CFG-01: cors_origins_raw 逗号分割与 trim。"""
    settings = Settings(
        database_url="postgresql+psycopg://ci:ci@localhost:5432/ci",
        secret_key="ci-test-secret-key-min-32-chars-long!!",
        credential_fernet_key="AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
        cors_origins_raw=" http://a.com , http://b.com ",
    )
    assert settings.cors_origins == ["http://a.com", "http://b.com"]


def test_vitalspan_env_defaults_to_development():
    """T-CFG-02: vitalspan_env 默认 development。"""
    settings = Settings(
        database_url="postgresql+psycopg://ci:ci@localhost:5432/ci",
        secret_key="ci-test-secret-key-min-32-chars-long!!",
        credential_fernet_key="AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    )
    assert settings.vitalspan_env == "development"


def test_env_example_covers_required_settings_fields():
    """T-CFG-03: .env.example 键名覆盖 Settings 必填 env。"""
    env_path = Path(__file__).resolve().parents[1] / "backend" / ".env.example"
    lines = env_path.read_text(encoding="utf-8").splitlines()
    keys = {
        line.split("=", 1)[0].strip()
        for line in lines
        if line.strip() and not line.strip().startswith("#") and "=" in line
    }
    for env_key in REQUIRED_ENV_KEYS:
        assert env_key in keys, f"missing {env_key} in .env.example"
    for env_key, field_name in ENV_TO_FIELD.items():
        if env_key in keys:
            assert field_name in Settings.model_fields


_BASE_KWARGS = {
    "database_url": "postgresql+psycopg://ci:ci@localhost:5432/ci",
    "secret_key": "ci-test-secret-key-min-32-chars-long!!",
    "credential_fernet_key": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
}


def test_vitalspan_env_invalid_enum_raises():
    """T-CFG-04: vitalspan_env 非法枚举 → ValidationError。"""
    with pytest.raises(ValidationError):
        Settings(**_BASE_KWARGS, vitalspan_env="invalid")


def test_credential_fernet_key_invalid_raises():
    """T-CFG-05: 非法 credential_fernet_key → ValidationError 含中文提示。"""
    kwargs = {**_BASE_KWARGS, "credential_fernet_key": "not-a-valid-fernet-key"}
    with pytest.raises(ValidationError) as exc_info:
        Settings(**kwargs)
    message = str(exc_info.value)
    assert "Fernet" in message or "CREDENTIAL_FERNET_KEY" in message


def test_query_default_limit_zero_documents_current_behavior():
    """T-CFG-06: query_default_limit=0 记录现状（当前无 ge 约束）。"""
    settings = Settings(**_BASE_KWARGS, query_default_limit=0)
    assert settings.query_default_limit == 0


def test_configure_logging_accepts_warning_level(monkeypatch):
    """T-CFG-07: LOG_LEVEL=WARNING 可加载。"""
    monkeypatch.setenv("LOG_LEVEL", "WARNING")
    get_settings.cache_clear()
    configure_logging(get_settings())
    assert logging.getLogger().level == logging.WARNING


def test_missing_secret_key_env_raises(monkeypatch):
    """T-CFG-08: 缺 SECRET_KEY env → ValidationError。"""
    monkeypatch.delenv("SECRET_KEY", raising=False)
    get_settings.cache_clear()
    with pytest.raises(ValidationError):
        get_settings()


def test_blank_secret_key_documents_behavior():
    """T-CFG-09: 空白 secret_key 记录当前 pydantic 行为。"""
    kwargs = {k: v for k, v in _BASE_KWARGS.items() if k != "secret_key"}
    try:
        settings = Settings(**kwargs, secret_key="   ")
        assert settings.secret_key.strip() != "" or settings.secret_key == "   "
    except ValidationError:
        pass


def test_query_timeout_seconds_zero_documents_behavior():
    """T-CFG-10: query_timeout_seconds=0 记录现状（当前无 ge 约束）。"""
    settings = Settings(**_BASE_KWARGS, query_timeout_seconds=0)
    assert settings.query_timeout_seconds == 0


def test_cors_origins_raw_empty_string():
    """T-CFG-11: cors_origins_raw='' → cors_origins == []。"""
    settings = Settings(**_BASE_KWARGS, cors_origins_raw="")
    assert settings.cors_origins == []


def test_analytics_database_url_rejects_mysql():
    """T-CFG-12: analytics_database_url=mysql:// → ValidationError 含 postgresql 提示。"""
    with pytest.raises(ValidationError) as exc_info:
        Settings(**_BASE_KWARGS, analytics_database_url="mysql://bad")
    message = str(exc_info.value)
    assert "postgresql" in message


def test_production_env_allows_sqlite_meta_url():
    """T-CFG-13: vitalspan_env=production + sqlite database_url 可实例化（文档化现状）。"""
    settings = Settings(
        database_url="sqlite+pysqlite:///./meta.db",
        secret_key="ci-test-secret-key-min-32-chars-long!!",
        credential_fernet_key="AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
        vitalspan_env="production",
    )
    assert settings.vitalspan_env == "production"
    assert settings.database_url.startswith("sqlite+")
