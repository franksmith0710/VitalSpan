import os

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+psycopg://vitalspan:vitalspan@localhost:5432/vitalspan",
)
os.environ.setdefault("SECRET_KEY", "ci-test-secret-key-min-32-chars-long!!")
os.environ.setdefault(
    "CREDENTIAL_FERNET_KEY",
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
)

import socket

import pytest
from fastapi.testclient import TestClient

from app.main import app

# Fixture contract (BOOT-006):
# - client: TestClient(app) for all backend HTTP tests
# - auth_headers: {"Authorization": "Bearer dev"} for protected routes in development
# - unauthorized_headers: {"Authorization": "Bearer invalid"} for 401 negative cases
# - trace_id_headers: {"X-Trace-Id": "<32-hex>"} for TraceId passthrough tests


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def auth_headers() -> dict[str, str]:
    return {"Authorization": "Bearer dev"}


@pytest.fixture
def unauthorized_headers() -> dict[str, str]:
    return {"Authorization": "Bearer invalid"}


@pytest.fixture
def trace_id_headers() -> dict[str, str]:
    return {"X-Trace-Id": "a1b2c3d4e5f6789012345678abcdef01"}


def _port_open(host: str, port: int, timeout: float = 1.0) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


@pytest.fixture(scope="session")
def integration_env():
    mysql_ok = _port_open("127.0.0.1", 3307)
    pg_ok = _port_open("127.0.0.1", 5433)
    if not (mysql_ok and pg_ok):
        pytest.skip("compose services not running — start: docker compose up -d sample-mysql analytics-postgres")
    return {
        "analytics_url": "postgresql+psycopg://vitalspan:vitalspan@localhost:5433/analytics",
    }
