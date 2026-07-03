"""T-CFT-01~03: 显式固化 conftest fixture 契约（BOOT-006）。"""


def test_client_fixture_health_ok(client):
    """T-CFT-01: client fixture GET /health。"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_client_fixture_me_unauthorized(client):
    """T-CFT-02: client GET /api/v1/me 无 Token → 401。"""
    response = client.get("/api/v1/me")
    assert response.status_code == 401
    assert response.json()["code"] == "UNAUTHORIZED"


def test_client_fixture_me_with_auth_headers(client, auth_headers):
    """T-CFT-03: client + auth_headers GET /api/v1/me → 200 username dev。"""
    response = client.get("/api/v1/me", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["username"] == "dev"


def test_unauthorized_headers_fixture_returns_401(client, unauthorized_headers):
    """T-CFT-04: unauthorized_headers + client → GET /api/v1/me 401 UNAUTHORIZED。"""
    response = client.get("/api/v1/me", headers=unauthorized_headers)
    assert response.status_code == 401
    assert response.json()["code"] == "UNAUTHORIZED"


def test_trace_id_headers_fixture_echoes_trace(client, trace_id_headers):
    """T-CFT-05: trace_id_headers + client → 响应头 X-Trace-Id 回显。"""
    incoming = trace_id_headers["X-Trace-Id"]
    response = client.get("/health", headers=trace_id_headers)
    assert response.status_code == 200
    assert response.headers.get("X-Trace-Id") == incoming
