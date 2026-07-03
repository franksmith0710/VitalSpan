import pytest

from app.core.config import get_settings

UNAUTHORIZED_BODY = {
    "code": "UNAUTHORIZED",
    "message": "Missing or invalid bearer token",
    "detail": None,
}


def test_me_without_token_returns_401(client):
    response = client.get("/api/v1/me")
    assert response.status_code == 401
    assert response.json() == UNAUTHORIZED_BODY


def test_me_with_bearer_dev_returns_200(client, auth_headers):
    response = client.get("/api/v1/me", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == {
        "id": "dev",
        "username": "dev",
        "roles": ["admin"],
    }


def test_me_invalid_bearer_returns_401(client, unauthorized_headers):
    """T-ME-03: Authorization: Bearer invalid → 401 + 标准 error body。"""
    response = client.get("/api/v1/me", headers=unauthorized_headers)
    assert response.status_code == 401
    assert response.json() == UNAUTHORIZED_BODY


def test_me_missing_authorization_header_returns_401(client):
    """T-ME-04: 无 Authorization header → 401。"""
    response = client.get("/api/v1/me")
    assert response.status_code == 401
    assert response.json() == UNAUTHORIZED_BODY


@pytest.mark.parametrize("path", ["/health", "/openapi.json", "/docs"])
def test_public_paths_accessible_without_token(client, path):
    """T-ME-05~07: 公开路径无 Token → 200。"""
    response = client.get(path)
    assert response.status_code == 200


def test_me_bearer_dev_rejected_in_production(client, auth_headers, monkeypatch):
    """T-ME-08: production 环境拒绝 Bearer dev。"""
    from app.auth.middleware import AuthMiddleware
    from app.main import app

    client.get("/health")
    auth_mw = None
    layer = app.middleware_stack
    while layer is not None:
        if isinstance(layer, AuthMiddleware):
            auth_mw = layer
            break
        layer = getattr(layer, "app", None)

    prev_settings = auth_mw.settings
    try:
        monkeypatch.setenv("VITALSPAN_ENV", "production")
        get_settings.cache_clear()
        auth_mw.settings = get_settings()
        response = client.get("/api/v1/me", headers=auth_headers)
        assert response.status_code == 401
        assert response.json() == UNAUTHORIZED_BODY
    finally:
        auth_mw.settings = prev_settings
        get_settings.cache_clear()
