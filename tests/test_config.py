"""T-CFG-01~03: Settings 安全边界与 .env.example 对齐。"""

from pathlib import Path

import pytest

from app.core.config import Settings, get_settings

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
