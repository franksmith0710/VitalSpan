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
