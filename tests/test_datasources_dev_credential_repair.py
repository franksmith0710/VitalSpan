from __future__ import annotations

import uuid

from cryptography.fernet import Fernet

from app.datasources.credentials import decrypt_credential
from app.datasources.dev_credential_repair import guess_dev_datasource_password, repair_dev_datasource_credentials
from app.datasources.models import DataSource


def test_guess_dev_password_for_sample_mysql() -> None:
    row = DataSource(
        id=uuid.uuid4(),
        name="Sample",
        code="sample-mysql",
        type="mysql",
        host="127.0.0.1",
        port=3307,
        database="sample_db",
        username="sample",
        password_encrypted="x",
    )
    assert guess_dev_datasource_password(row) == "sample"


def test_repair_dev_datasource_credentials_reencrypts_with_current_key(monkeypatch) -> None:
    key = Fernet.generate_key().decode()
    monkeypatch.setenv("CREDENTIAL_FERNET_KEY", key)
    from app.core.config import get_settings

    get_settings.cache_clear()

    old_key = Fernet.generate_key().decode()
    row = DataSource(
        id=uuid.uuid4(),
        name="Sample",
        code="demo-mysql-3307",
        type="mysql",
        host="127.0.0.1",
        port=3307,
        database="sample_db",
        username="sample",
        password_encrypted=Fernet(old_key.encode()).encrypt(b"sample").decode(),
    )

    class _FakeSession:
        def __init__(self) -> None:
            self.rows = [row]
            self.committed = False

        def scalars(self, _stmt):
            class _Result:
                def all(self_inner):
                    return self.rows

            return _Result()

        def commit(self) -> None:
            self.committed = True

    session = _FakeSession()
    repaired = repair_dev_datasource_credentials(session)  # type: ignore[arg-type]
    assert repaired == 1
    assert session.committed is True
    assert decrypt_credential(row.password_encrypted) == "sample"

    get_settings.cache_clear()
