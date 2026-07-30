import bcrypt
import pytest

from app.auth.password.service import hash_password, needs_password_rehash, verify_password
from app.core.config import get_settings


@pytest.fixture(autouse=True)
def _sm3_env(monkeypatch):
    monkeypatch.setenv("PASSWORD_HASH_ALGORITHM", "sm3")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_sm3_hash_and_verify():
    hashed = hash_password("MyPassword1!")
    assert hashed.startswith("$sm3$")
    assert verify_password("MyPassword1!", hashed)
    assert not verify_password("wrong", hashed)


def test_bcrypt_legacy_verify():
    legacy = bcrypt.hashpw(b"legacy-pass", bcrypt.gensalt()).decode()
    assert verify_password("legacy-pass", legacy)
    assert needs_password_rehash(legacy)


def test_sm3_no_rehash():
    hashed = hash_password("x")
    assert not needs_password_rehash(hashed)
