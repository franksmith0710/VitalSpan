import os

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+psycopg://ci:ci@localhost:5432/ci",
)
os.environ.setdefault("SECRET_KEY", "ci-test-secret-key-min-32-chars-long!!")
os.environ.setdefault(
    "CREDENTIAL_FERNET_KEY",
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
)

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)
