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

# Fixture contract (BOOT-006):
# - client: TestClient(app) for all backend HTTP tests
# - auth_headers: {"Authorization": "Bearer dev"} for protected routes in development
# - unauthorized_headers: {"Authorization": "Bearer invalid"} for 401 negative cases


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def auth_headers() -> dict[str, str]:
    return {"Authorization": "Bearer dev"}


@pytest.fixture
def unauthorized_headers() -> dict[str, str]:
    return {"Authorization": "Bearer invalid"}
