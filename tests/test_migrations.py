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


def test_settings_missing_secret_key_raises(monkeypatch):
    """T-MIG-07: 缺 SECRET_KEY 时 Settings 实例化失败。"""
    monkeypatch.delenv("SECRET_KEY", raising=False)
    get_settings.cache_clear()
    with pytest.raises(ValidationError):
        Settings(
            database_url=KNOWN_URL,
            credential_fernet_key="AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
        )


def test_settings_missing_credential_fernet_key_raises(monkeypatch):
    """T-MIG-08: 缺 CREDENTIAL_FERNET_KEY 时 Settings 实例化失败。"""
    monkeypatch.delenv("CREDENTIAL_FERNET_KEY", raising=False)
    get_settings.cache_clear()
    with pytest.raises(ValidationError):
        Settings(
            database_url=KNOWN_URL,
            secret_key="ci-test-secret-key-min-32-chars-long!!",
        )


def test_migrations_env_fails_when_get_settings_raises(monkeypatch):
    """T-MIG-09: migrations/env.py 在 get_settings() 失败时无法完成 URL 绑定。"""
    validation_error = ValidationError.from_exception_data(
        "Settings",
        [{"type": "missing", "loc": ("database_url",), "input": {}}],
    )

    def raise_validation():
        raise validation_error

    monkeypatch.setattr("app.core.config.get_settings", raise_validation)
    get_settings.cache_clear()
    sys.modules.pop("migrations.env", None)

    mock_config = MagicMock()
    mock_config.config_file_name = None
    mock_context = MagicMock()
    mock_context.config = mock_config

    with patch("alembic.context", mock_context):
        with pytest.raises(ValidationError):
            importlib.import_module("migrations.env")


def test_settings_invalid_database_url_documents_current_behavior():
    """T-MIG-10: 非法格式 database_url 记录现状（当前无 URL 校验）。"""
    settings = Settings(
        database_url="not-a-url",
        secret_key="ci-test-secret-key-min-32-chars-long!!",
        credential_fernet_key="AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    )
    assert settings.database_url == "not-a-url"


def test_migrations_offline_url_matches_settings(monkeypatch):
    """T-MIG-11: offline 模式 context.configure 的 url 与 set_main_option 一致。"""
    fake_settings = Settings(
        database_url=KNOWN_URL,
        secret_key="ci-test-secret-key-min-32-chars-long!!",
        credential_fernet_key="AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    )
    monkeypatch.setattr("app.core.config.get_settings", lambda: fake_settings)
    get_settings.cache_clear()

    mock_config = MagicMock()
    mock_config.config_file_name = None
    mock_config.get_main_option.return_value = KNOWN_URL

    sys.modules.pop("migrations.env", None)

    mock_context = MagicMock()
    mock_context.config = mock_config
    mock_context.is_offline_mode.return_value = True
    captured_urls: list[str] = []

    def capture_configure(**kwargs):
        if "url" in kwargs:
            captured_urls.append(kwargs["url"])

    mock_context.configure = capture_configure
    mock_context.begin_transaction.return_value.__enter__ = MagicMock()
    mock_context.begin_transaction.return_value.__exit__ = MagicMock()

    with patch("alembic.context", mock_context):
        importlib.import_module("migrations.env")

    mock_config.set_main_option.assert_called_with("sqlalchemy.url", KNOWN_URL)
    assert captured_urls == [KNOWN_URL]


def test_revision_upgrade_downgrade_noop():
    """T-MIG-12: 0001/0002 upgrade/downgrade 空操作可调用。"""
    rev_0001 = importlib.import_module("migrations.versions.0001_initial")
    rev_0002 = importlib.import_module("migrations.versions.0002_ingestion_tables")
    rev_0001.upgrade()
    rev_0001.downgrade()
    with patch.object(rev_0002, "op", MagicMock()):
        rev_0002.upgrade()
        rev_0002.downgrade()


def test_revision_chain_0002_down_revision_is_0001():
    """T-MIG-13: revision 链 0002.down_revision == '0001'。"""
    rev_0001 = importlib.import_module("migrations.versions.0001_initial")
    rev_0002 = importlib.import_module("migrations.versions.0002_ingestion_tables")
    assert rev_0001.revision == "0001"
    assert rev_0002.revision == "0002"
    assert rev_0002.down_revision == "0001"


def test_migrations_offline_run_migrations_called(monkeypatch):
    """T-MIG-14: offline 模式触发 context.run_migrations()。"""
    fake_settings = Settings(
        database_url=KNOWN_URL,
        secret_key="ci-test-secret-key-min-32-chars-long!!",
        credential_fernet_key="AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    )
    monkeypatch.setattr("app.core.config.get_settings", lambda: fake_settings)
    get_settings.cache_clear()

    mock_config = MagicMock()
    mock_config.config_file_name = None
    mock_config.get_main_option.return_value = KNOWN_URL

    sys.modules.pop("migrations.env", None)

    mock_context = MagicMock()
    mock_context.config = mock_config
    mock_context.is_offline_mode.return_value = True
    mock_context.begin_transaction.return_value.__enter__ = MagicMock()
    mock_context.begin_transaction.return_value.__exit__ = MagicMock()

    with patch("alembic.context", mock_context):
        importlib.import_module("migrations.env")

    mock_context.run_migrations.assert_called_once()
    sys.modules.pop("migrations.env", None)
