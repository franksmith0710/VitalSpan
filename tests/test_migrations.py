import importlib
import os
import sys
from configparser import ConfigParser
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from pydantic import ValidationError

from app.core.config import Settings, get_settings

KNOWN_URL = "postgresql+psycopg://mock:mock@localhost:5432/mock"


@pytest.fixture(autouse=True)
def clear_settings_cache():
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_settings_database_url_matches_env():
    """T-MIG-01: Settings 从环境变量加载 database_url。"""
    settings = get_settings()
    assert settings.database_url == os.environ["DATABASE_URL"]


def test_migrations_env_binds_settings_database_url(monkeypatch):
    """T-MIG-02: migrations/env.py 将 settings.database_url 写入 alembic config。"""
    fake_settings = Settings(
        database_url=KNOWN_URL,
        secret_key="ci-test-secret-key-min-32-chars-long!!",
        credential_fernet_key="AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    )
    monkeypatch.setattr("app.core.config.get_settings", lambda: fake_settings)
    get_settings.cache_clear()

    mock_config = MagicMock()
    mock_config.config_file_name = None

    sys.modules.pop("migrations.env", None)

    mock_context = MagicMock()
    mock_context.config = mock_config
    mock_context.is_offline_mode.return_value = True

    with patch("alembic.context", mock_context):
        importlib.import_module("migrations.env")

    mock_config.set_main_option.assert_called_with("sqlalchemy.url", KNOWN_URL)


def test_settings_missing_database_url_raises(monkeypatch):
    """T-MIG-03: 缺 DATABASE_URL 时 Settings 实例化失败。"""
    monkeypatch.delenv("DATABASE_URL", raising=False)
    get_settings.cache_clear()
    with pytest.raises(ValidationError):
        Settings(
            secret_key="ci-test-secret-key-min-32-chars-long!!",
            credential_fernet_key="AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
        )


def test_settings_env_override_database_url(monkeypatch):
    """T-MIG-04: env 覆盖 DATABASE_URL 生效。"""
    alt = "postgresql+psycopg://alt:alt@localhost:5432/alt"
    monkeypatch.setenv("DATABASE_URL", alt)
    get_settings.cache_clear()
    assert get_settings().database_url == alt


def test_alembic_ini_script_location_matches_repo():
    """T-MIG-05: alembic.ini script_location 与 migrations/ 目录一致。"""
    ini_path = Path(__file__).resolve().parents[1] / "backend" / "alembic.ini"
    parser = ConfigParser()
    parser.read(ini_path)
    assert parser.get("alembic", "script_location") == "migrations"
    migrations_dir = ini_path.parent / "migrations"
    assert migrations_dir.is_dir()


def test_settings_empty_database_url_documents_current_behavior(monkeypatch):
    """T-MIG-06: 空白 DATABASE_URL 记录现状（当前无格式校验）。"""
    monkeypatch.setenv("DATABASE_URL", "")
    get_settings.cache_clear()
    assert get_settings().database_url == ""
