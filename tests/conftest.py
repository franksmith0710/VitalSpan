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
# - auth_headers: JWT Bearer for protected routes (login or signed fallback)
# - unauthorized_headers: {"Authorization": "Bearer invalid"} for 401 negative cases
# - trace_id_headers: {"X-Trace-Id": "<32-hex>"} for TraceId passthrough tests
# - combined_auth_trace_headers: auth_headers ∪ trace_id_headers for me+trace combo tests
# - lowercase_bearer_headers: {"Authorization": "bearer dev"} for RFC scheme case sensitivity tests
# - malformed_auth_headers: {"Authorization": "Bearerde"} for missing space separator tests
# - basic_auth_headers: {"Authorization": "Basic dev"} for non-Bearer scheme tests


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def auth_headers() -> dict[str, str]:
    """JWT as dev user (replaces legacy Bearer dev)."""
    from jwt_auth import jwt_auth_headers

    return jwt_auth_headers()


@pytest.fixture
def admin_auth_headers() -> dict[str, str]:
    """JWT as admin user for /me and login contract tests."""
    try:
        from fastapi.testclient import TestClient

        from app.main import app

        client = TestClient(app)
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": os.environ.get("VITALSPAN_DEV_ADMIN_PASSWORD", "changeme")},
        )
        if response.status_code == 200:
            token = response.json()["accessToken"]
            return {"Authorization": f"Bearer {token}"}
    except Exception:
        pass
    from app.auth.jwt import create_access_token

    token = create_access_token("00000000-0000-0000-0000-000000000001", "admin")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def unauthorized_headers() -> dict[str, str]:
    return {"Authorization": "Bearer invalid"}


@pytest.fixture
def trace_id_headers() -> dict[str, str]:
    return {"X-Trace-Id": "a1b2c3d4e5f6789012345678abcdef01"}


@pytest.fixture
def combined_auth_trace_headers(
    admin_auth_headers: dict[str, str],
    trace_id_headers: dict[str, str],
) -> dict[str, str]:
    return {**admin_auth_headers, **trace_id_headers}


@pytest.fixture
def lowercase_bearer_headers() -> dict[str, str]:
    return {"Authorization": "bearer dev"}


@pytest.fixture
def malformed_auth_headers() -> dict[str, str]:
    return {"Authorization": "Bearerde"}


@pytest.fixture
def basic_auth_headers() -> dict[str, str]:
    return {"Authorization": "Basic dev"}


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


@pytest.fixture
def analytics_sqlite() -> str:
    """In-memory sqlite URL for mock L1 analytics (no compose)."""
    return "sqlite+pysqlite:///:memory:"


@pytest.fixture
def l1_analytics_engine(analytics_sqlite: str):
    """Yield SQLAlchemy engine bound to in-memory analytics; drop test tables after."""
    from sqlalchemy import create_engine, text

    engine = create_engine(analytics_sqlite)
    yield engine
    with engine.begin() as conn:
        conn.execute(text('DROP TABLE IF EXISTS "orders_l1_write"'))
        conn.execute(text('DROP TABLE IF EXISTS "orders_l1_order_r11"'))
