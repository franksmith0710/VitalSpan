import importlib
import os
import subprocess
import sys
import time
from configparser import ConfigParser
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from pydantic import ValidationError
from sqlalchemy import pool as sa_pool
from sqlalchemy.exc import OperationalError

from app.core.config import Settings, get_settings

KNOWN_URL = "postgresql+psycopg://mock:mock@localhost:5432/mock"


def _migration_subprocess_env() -> dict[str, str]:
    env = os.environ.copy()
    env["DATABASE_URL"] = KNOWN_URL
    env["SECRET_KEY"] = "ci-test-secret-key-min-32-chars-long!!"
    env["CREDENTIAL_FERNET_KEY"] = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
    return env


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


def test_settings_empty_database_url_raises(monkeypatch):
    """T-MIG-06: 空白 DATABASE_URL → ValidationError。"""
    monkeypatch.setenv("DATABASE_URL", "")
    get_settings.cache_clear()
    with pytest.raises(ValidationError) as exc_info:
        get_settings()
    assert "DATABASE_URL" in str(exc_info.value) or "不能为空" in str(exc_info.value)


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


def test_settings_invalid_database_url_raises():
    """T-MIG-10: 非法格式 database_url → ValidationError 含协议提示。"""
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            database_url="not-a-url",
            secret_key="ci-test-secret-key-min-32-chars-long!!",
            credential_fernet_key="AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
        )
    assert "postgresql" in str(exc_info.value)


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
    """T-MIG-15: versions/*.py revision 唯一、单链、head 为 0011。"""
    versions_dir = (
        Path(__file__).resolve().parents[1] / "backend" / "migrations" / "versions"
    )
    revisions: dict[str, str | None] = {}
    for path in sorted(versions_dir.glob("*.py")):
        if path.name.startswith("__"):
            continue
        module = importlib.import_module(f"migrations.versions.{path.stem}")
        revisions[module.revision] = module.down_revision

    assert set(revisions.keys()) == {"0001", "0002", "0003", "0004", "0005", "0006", "0007", "0008", "0009", "0010", "0011"}
    assert len(revisions) == len(set(revisions.keys()))
    assert revisions["0001"] is None
    assert revisions["0002"] == "0001"
    assert revisions["0003"] == "0002"
    assert revisions["0004"] == "0003"
    assert revisions["0005"] == "0004"
    assert revisions["0006"] == "0005"
    assert revisions["0007"] == "0006"
    assert revisions["0008"] == "0007"
    assert revisions["0009"] == "0008"
    assert revisions["0010"] == "0009"
    assert revisions["0011"] == "0010"

    referred_down = {d for d in revisions.values() if d}
    heads = [rev for rev in revisions if rev not in referred_down]
    assert heads == ["0011"]


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


def test_alembic_upgrade_head_sql_contains_ingestion_tables():
    """T-MIG-19: alembic upgrade head --sql stdout 含 ingestion_sync_jobs。"""
    backend_dir = Path(__file__).resolve().parents[1] / "backend"
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head", "--sql"],
        cwd=backend_dir,
        env=_migration_subprocess_env(),
        capture_output=True,
        text=True,
        timeout=60,
    )
    assert result.returncode == 0, result.stderr
    stdout = result.stdout
    assert "ingestion_sync_jobs" in stdout
    assert "ingestion_sync_runs" in stdout
    assert "ingestion_etl_rules" in stdout


def test_revision_0002_source_defines_ingestion_table_names():
    """T-MIG-20: 0002 revision 源码含三张 ingestion 表名。"""
    rev_path = (
        Path(__file__).resolve().parents[1]
        / "backend"
        / "migrations"
        / "versions"
        / "0002_ingestion_tables.py"
    )
    source = rev_path.read_text(encoding="utf-8")
    for table in ("ingestion_sync_jobs", "ingestion_sync_runs", "ingestion_etl_rules"):
        assert table in source


def test_alembic_downgrade_base_sql_contains_ingestion_drop():
    """T-MIG-21: alembic downgrade base --sql 子进程可预期降级链。"""
    backend_dir = Path(__file__).resolve().parents[1] / "backend"
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "downgrade", "head:base", "--sql"],
        cwd=backend_dir,
        env=_migration_subprocess_env(),
        capture_output=True,
        text=True,
        timeout=60,
    )
    assert result.returncode == 0, result.stderr
    stdout_upper = result.stdout.upper()
    assert "DROP" in stdout_upper or "ingestion_sync_jobs" in result.stdout


def test_alembic_upgrade_sql_stdout_excludes_secrets():
    """T-MIG-22: upgrade head --sql stdout 不含 SECRET_KEY 明文。"""
    backend_dir = Path(__file__).resolve().parents[1] / "backend"
    env = _migration_subprocess_env()
    secret = env["SECRET_KEY"]
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head", "--sql"],
        cwd=backend_dir,
        env=env,
        capture_output=True,
        text=True,
        timeout=60,
    )
    assert result.returncode == 0, result.stderr
    assert secret not in result.stdout
    assert "ci-test-secret" not in result.stdout


def test_settings_env_py_binding_end_to_end(monkeypatch):
    """T-MIG-23: 同一 DATABASE_URL 下 Settings 与 env.py set_main_option 一致。"""
    bound_url = "postgresql+psycopg://e2e:e2e@localhost:5432/e2e"
    monkeypatch.setenv("DATABASE_URL", bound_url)
    get_settings.cache_clear()
    assert get_settings().database_url == bound_url

    fake_settings = Settings(
        database_url=bound_url,
        secret_key="ci-test-secret-key-min-32-chars-long!!",
        credential_fernet_key="AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    )
    monkeypatch.setattr("app.core.config.get_settings", lambda: fake_settings)
    get_settings.cache_clear()
    sys.modules.pop("migrations.env", None)

    mock_config = MagicMock()
    mock_config.config_file_name = None
    mock_context = MagicMock()
    mock_context.config = mock_config
    mock_context.is_offline_mode.return_value = True

    with patch("alembic.context", mock_context):
        importlib.import_module("migrations.env")

    mock_config.set_main_option.assert_called_with("sqlalchemy.url", bound_url)
    sys.modules.pop("migrations.env", None)


def test_migrations_env_reimport_under_budget(monkeypatch):
    """T-MIG-24: DATABASE_URL 变更后重导入 migrations.env < 2s（rebind 路径）。"""
    url_a = "postgresql+psycopg://perf:a@localhost:5432/a"
    url_b = "postgresql+psycopg://perf:b@localhost:5432/b"

    def import_env_timed() -> float:
        sys.modules.pop("migrations.env", None)
        mock_config = MagicMock()
        mock_config.config_file_name = None
        mock_context = MagicMock()
        mock_context.config = mock_config
        mock_context.is_offline_mode.return_value = True
        mock_context.begin_transaction.return_value.__enter__ = MagicMock()
        mock_context.begin_transaction.return_value.__exit__ = MagicMock(return_value=False)
        start = time.perf_counter()
        with patch("alembic.context", mock_context):
            importlib.import_module("migrations.env")
        return time.perf_counter() - start

    monkeypatch.setenv("DATABASE_URL", url_a)
    get_settings.cache_clear()
    assert import_env_timed() < 2.0

    monkeypatch.setenv("DATABASE_URL", url_b)
    get_settings.cache_clear()
    assert import_env_timed() < 2.0
    sys.modules.pop("migrations.env", None)


def test_alembic_heads_single_head():
    """T-MIG-25: alembic heads 子进程 returncode==0 且 stdout 含 0011（单 head）。"""
    backend_dir = Path(__file__).resolve().parents[1] / "backend"
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "heads"],
        cwd=backend_dir,
        env=_migration_subprocess_env(),
        capture_output=True,
        text=True,
        timeout=60,
    )
    assert result.returncode == 0, result.stderr
    assert "0011" in result.stdout


def test_migrations_online_uses_null_pool(monkeypatch):
    """T-MIG-26: online 路径 engine_from_config 使用 poolclass=NullPool。"""
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

    captured_kwargs: dict = {}

    def capture_engine_from_config(configuration, prefix="sqlalchemy.", **kwargs):
        captured_kwargs.update(kwargs)
        return mock_engine

    with patch("alembic.context", mock_context):
        with patch("sqlalchemy.engine_from_config", side_effect=capture_engine_from_config):
            importlib.import_module("migrations.env")

    assert captured_kwargs.get("poolclass") is sa_pool.NullPool
    sys.modules.pop("migrations.env", None)


def test_settings_mysql_protocol_raises():
    """T-MIG-27: mysql:// 协议 Settings → ValidationError 含 postgresql。"""
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            database_url="mysql://user:pass@localhost:3306/db",
            secret_key="ci-test-secret-key-min-32-chars-long!!",
            credential_fernet_key="AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
        )
    assert "postgresql" in str(exc_info.value)


def test_migrations_online_connect_operational_error_propagates(monkeypatch):
    """T-MIG-28: online connect() 抛 OperationalError 向上传播。"""
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

    mock_engine = MagicMock()
    mock_engine.connect.side_effect = OperationalError("stmt", {}, Exception("connection refused"))

    mock_context = MagicMock()
    mock_context.config = mock_config
    mock_context.is_offline_mode.return_value = False

    with patch("alembic.context", mock_context):
        with patch("sqlalchemy.engine_from_config", return_value=mock_engine):
            with pytest.raises(OperationalError):
                importlib.import_module("migrations.env")

    sys.modules.pop("migrations.env", None)


def test_alembic_upgrade_head_sql_subprocess_smoke():
    """T-MIG-29: alembic upgrade head --sql 子进程 returncode==0 且含 CREATE TABLE 或 ingestion_sync_jobs。"""
    backend_dir = Path(__file__).resolve().parents[1] / "backend"
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head", "--sql"],
        cwd=backend_dir,
        env=_migration_subprocess_env(),
        capture_output=True,
        text=True,
        timeout=60,
    )
    assert result.returncode == 0, result.stderr
    stdout_upper = result.stdout.upper()
    assert "ingestion_sync_jobs" in result.stdout or "CREATE TABLE" in stdout_upper


def test_revision_chain_no_orphans_head_0003():
    """T-MIG-30: revision 链无 orphan；唯一 head 为 0011。"""
    versions_dir = (
        Path(__file__).resolve().parents[1] / "backend" / "migrations" / "versions"
    )
    revisions: dict[str, str | None] = {}
    for path in sorted(versions_dir.glob("*.py")):
        if path.name.startswith("__"):
            continue
        module = importlib.import_module(f"migrations.versions.{path.stem}")
        revisions[module.revision] = module.down_revision

    all_ids = set(revisions.keys())
    for rev, down in revisions.items():
        if down is not None:
            assert down in all_ids, f"orphan down_revision {down!r} for {rev}"

    referred_down = {d for d in revisions.values() if d}
    heads = [rev for rev in revisions if rev not in referred_down]
    assert heads == ["0011"]


def test_revision_chain_head_is_0011():
    """T-MIG-34: revision 链唯一 head 为 0011；0011.down_revision==0010。"""
    versions_dir = Path(__file__).resolve().parents[1] / "backend" / "migrations" / "versions"
    revisions: dict[str, str | None] = {}
    for path in sorted(versions_dir.glob("*.py")):
        if path.name.startswith("__"):
            continue
        module = importlib.import_module(f"migrations.versions.{path.stem}")
        revisions[module.revision] = module.down_revision

    heads = [rev for rev, down in revisions.items() if not any(d == rev for d in revisions.values())]
    assert heads == ["0011"]

    mod = importlib.import_module("migrations.versions.0011_chart_query_bindings")
    assert mod.down_revision == "0010"


def test_alembic_upgrade_sql_contains_auth_roles():
    """T-MIG-33: alembic upgrade head --sql 输出含 auth_roles。"""
    backend_dir = Path(__file__).resolve().parents[1] / "backend"
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head", "--sql"],
        cwd=backend_dir,
        env=_migration_subprocess_env(),
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0
    assert "auth_roles" in result.stdout


def test_alembic_upgrade_sql_contains_dimension_groups():
    """T-MIG-35: upgrade head --sql 含 auth_dimension_groups。"""
    backend_dir = Path(__file__).resolve().parents[1] / "backend"
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head", "--sql"],
        cwd=backend_dir,
        env=_migration_subprocess_env(),
        capture_output=True,
        text=True,
        timeout=60,
    )
    assert result.returncode == 0, result.stderr
    assert "auth_dimension_groups" in result.stdout


def test_revision_chain_head_0011_down_revision():
    """T-MIG-36: heads 含 0011；0011.down_revision==0010。"""
    versions_dir = Path(__file__).resolve().parents[1] / "backend" / "migrations" / "versions"
    revisions: dict[str, str | None] = {}
    for path in sorted(versions_dir.glob("*.py")):
        if path.name.startswith("__"):
            continue
        mod = importlib.import_module(f"migrations.versions.{path.stem}")
        revisions[mod.revision] = mod.down_revision
    heads = [rev for rev in revisions if rev not in revisions.values()]
    assert "0011" in heads
    assert revisions["0011"] == "0010"


def test_alembic_upgrade_head_sql_contains_data_sources():
    """T-MIG-37: upgrade head --sql 含 data_sources。"""
    backend_dir = Path(__file__).resolve().parents[1] / "backend"
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head", "--sql"],
        cwd=backend_dir,
        env=_migration_subprocess_env(),
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0
    assert "data_sources" in result.stdout


def test_revision_chain_head_0011_down_revision_t_mig38():
    """T-MIG-38: heads 含 0011；0011.down_revision==0010。"""
    versions_dir = Path(__file__).resolve().parents[1] / "backend" / "migrations" / "versions"
    revisions: dict[str, str | None] = {}
    for path in sorted(versions_dir.glob("*.py")):
        if path.name.startswith("__"):
            continue
        mod = importlib.import_module(f"migrations.versions.{path.stem}")
        revisions[mod.revision] = mod.down_revision
    heads = [rev for rev in revisions if rev not in revisions.values()]
    assert "0011" in heads
    assert revisions["0011"] == "0010"


def test_alembic_upgrade_head_sql_contains_chart_query_bindings():
    """T-MIG-39: upgrade head --sql 含 chart_query_bindings。"""
    backend_dir = Path(__file__).resolve().parents[1] / "backend"
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head", "--sql"],
        cwd=backend_dir,
        env=_migration_subprocess_env(),
        capture_output=True,
        text=True,
        check=True,
    )
    assert "chart_query_bindings" in result.stdout


def test_unreachable_host_operational_error_message(monkeypatch):
    """T-MIG-31: 不可达 host DATABASE_URL online 导入传播 OperationalError 且消息含 connection/refused。"""
    unreachable_url = "postgresql+psycopg://ci:ci@127.0.0.1:1/ci_unreachable"
    fake_settings = Settings(
        database_url=unreachable_url,
        secret_key="ci-test-secret-key-min-32-chars-long!!",
        credential_fernet_key="AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    )
    monkeypatch.setattr("app.core.config.get_settings", lambda: fake_settings)
    get_settings.cache_clear()
    sys.modules.pop("migrations.env", None)

    mock_config = MagicMock()
    mock_config.config_file_name = None
    mock_config.get_section.return_value = {}

    mock_engine = MagicMock()
    mock_engine.connect.side_effect = OperationalError(
        "stmt", {}, Exception("connection refused")
    )

    mock_context = MagicMock()
    mock_context.config = mock_config
    mock_context.is_offline_mode.return_value = False

    with patch("alembic.context", mock_context):
        with patch("sqlalchemy.engine_from_config", return_value=mock_engine):
            with pytest.raises(OperationalError) as exc_info:
                importlib.import_module("migrations.env")

    message = str(exc_info.value).lower()
    assert "connection" in message or "refused" in message
    sys.modules.pop("migrations.env", None)
