import importlib
import os
import sys
import time
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


def test_revision_directory_single_head_chain():
    """T-MIG-15: versions/*.py revision 唯一、单链、head 为 0002。"""
    versions_dir = (
        Path(__file__).resolve().parents[1] / "backend" / "migrations" / "versions"
    )
    revisions: dict[str, str | None] = {}
    for path in sorted(versions_dir.glob("*.py")):
        if path.name.startswith("__"):
            continue
        module = importlib.import_module(f"migrations.versions.{path.stem}")
        revisions[module.revision] = module.down_revision

    assert set(revisions.keys()) == {"0001", "0002"}
    assert len(revisions) == len(set(revisions.keys()))
    assert revisions["0001"] is None
    assert revisions["0002"] == "0001"

    referred_down = {d for d in revisions.values() if d}
    heads = [rev for rev in revisions if rev not in referred_down]
    assert heads == ["0002"]


def test_migrations_online_path_connects_and_runs(monkeypatch):
    """T-MIG-16: is_offline_mode=False 时 connect() 与 run_migrations() 被调用。"""
    fake_settings = Settings(
        database_url=KNOWN_URL,
        secret_key="ci-test-secret-key-min-32-chars-long!!",
        credential_fernet_key="AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    )
    monkeypatch.setattr("app.core.config.get_settings", lambda: fake_settings)
    get_settings.cache_clear()
    sys.modules.pop("migrations.env", None)

    mock_config = MagicMock()
    mock_config.config_file_name = None
    mock_config.get_section.return_value = {}

    mock_connection = MagicMock()
    mock_engine = MagicMock()
    mock_engine.connect.return_value.__enter__ = MagicMock(return_value=mock_connection)
    mock_engine.connect.return_value.__exit__ = MagicMock(return_value=False)

    mock_context = MagicMock()
    mock_context.config = mock_config
    mock_context.is_offline_mode.return_value = False
    mock_context.begin_transaction.return_value.__enter__ = MagicMock()
    mock_context.begin_transaction.return_value.__exit__ = MagicMock(return_value=False)

    with patch("alembic.context", mock_context):
        with patch("sqlalchemy.engine_from_config", return_value=mock_engine):
            importlib.import_module("migrations.env")

    mock_engine.connect.assert_called_once()
    mock_context.run_migrations.assert_called_once()
    sys.modules.pop("migrations.env", None)


def test_migrations_offline_import_under_budget(monkeypatch):
    """T-MIG-17: offline 导入 migrations.env 全流程 < 2s。"""
    fake_settings = Settings(
        database_url=KNOWN_URL,
        secret_key="ci-test-secret-key-min-32-chars-long!!",
        credential_fernet_key="AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    )
    monkeypatch.setattr("app.core.config.get_settings", lambda: fake_settings)
    get_settings.cache_clear()
    sys.modules.pop("migrations.env", None)

    mock_config = MagicMock()
    mock_config.config_file_name = None
    mock_config.get_main_option.return_value = KNOWN_URL

    mock_context = MagicMock()
    mock_context.config = mock_config
    mock_context.is_offline_mode.return_value = True
    mock_context.begin_transaction.return_value.__enter__ = MagicMock()
    mock_context.begin_transaction.return_value.__exit__ = MagicMock(return_value=False)

    start = time.perf_counter()
    with patch("alembic.context", mock_context):
        importlib.import_module("migrations.env")
    elapsed = time.perf_counter() - start

    assert elapsed < 2.0
    sys.modules.pop("migrations.env", None)


def test_migrations_env_rebinds_on_settings_change(monkeypatch):
    """T-MIG-18: DATABASE_URL 变更后重导入 migrations.env 绑定新 URL。"""
    url_a = "postgresql+psycopg://a:a@localhost:5432/a"
    url_b = "postgresql+psycopg://b:b@localhost:5432/b"

    def import_env_and_capture_url() -> str:
        sys.modules.pop("migrations.env", None)
        mock_config = MagicMock()
        mock_config.config_file_name = None
        mock_context = MagicMock()
        mock_context.config = mock_config
        mock_context.is_offline_mode.return_value = True
        with patch("alembic.context", mock_context):
            importlib.import_module("migrations.env")
        call_args = mock_config.set_main_option.call_args
        assert call_args is not None
        return call_args[0][1]

    monkeypatch.setenv("DATABASE_URL", url_a)
    get_settings.cache_clear()
    assert import_env_and_capture_url() == url_a

    monkeypatch.setenv("DATABASE_URL", url_b)
    get_settings.cache_clear()
    assert import_env_and_capture_url() == url_b
    sys.modules.pop("migrations.env", None)
