from concurrent.futures import ThreadPoolExecutor

import asyncio

import pytest
from fastapi import HTTPException, Request

from app.auth.deps import get_current_user

UNAUTHORIZED_BODY = {
    "code": "UNAUTHORIZED",
    "message": "Missing or invalid bearer token",
    "detail": None,
}


def test_me_without_token_returns_401(client):
    response = client.get("/api/v1/me")
    assert response.status_code == 401
    assert response.json() == UNAUTHORIZED_BODY


def test_me_with_jwt_returns_200(client, admin_auth_headers):
    response = client.get("/api/v1/me", headers=admin_auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["username"] == "admin"
    assert "admin" in body["roles"]
    assert body["id"] != "dev"


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


@pytest.mark.parametrize(
    "path",
    ["/health", "/docs", "/redoc", "/openapi.json"],
)
def test_public_paths_accessible_without_token(client, path):
    """T-ME-13: PUBLIC_PATHS 矩阵含 /redoc，无 Token → 200。"""
    response = client.get(path)
    assert response.status_code == 200


def test_me_jwt_valid_in_production(client, admin_auth_headers, monkeypatch):
    """T-ME-08: production 环境 JWT 仍有效（secret 一致）。"""
    from app.auth.middleware import AuthMiddleware
    from app.core.config import get_settings
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
        response = client.get("/api/v1/me", headers=admin_auth_headers)
        assert response.status_code == 200
        assert response.json()["username"] == "admin"
    finally:
        auth_mw.settings = prev_settings
        get_settings.cache_clear()


def test_me_empty_bearer_token_returns_401(client):
    """T-ME-09: Authorization: Bearer（空 token / 仅空格）→ 401 + UNAUTHORIZED body。"""
    for header_value in ("Bearer", "Bearer "):
        response = client.get("/api/v1/me", headers={"Authorization": header_value})
        assert response.status_code == 401
        assert response.json() == UNAUTHORIZED_BODY


def test_me_lowercase_bearer_scheme_returns_401(client, lowercase_bearer_headers):
    """T-ME-10: Authorization: bearer dev（小写 scheme）→ 401。"""
    response = client.get("/api/v1/me", headers=lowercase_bearer_headers)
    assert response.status_code == 401
    assert response.json() == UNAUTHORIZED_BODY


def test_me_malformed_bearer_header_returns_401(client, malformed_auth_headers):
    """T-ME-11: Authorization: Bearerde（无空格分隔）→ 401。"""
    response = client.get("/api/v1/me", headers=malformed_auth_headers)
    assert response.status_code == 401
    assert response.json() == UNAUTHORIZED_BODY


def test_me_concurrent_requests_stable(client, admin_auth_headers, monkeypatch):
    """T-ME-12: 并发 5× GET /api/v1/me + auth_headers 全部 200 且用户上下文一致。"""
    monkeypatch.setattr(
        "app.auth.middleware.user_service.resolve_role_codes_for_user",
        lambda _session, _user_id: ["admin"],
    )

    def fetch_me():
        return client.get("/api/v1/me", headers=admin_auth_headers)

    with ThreadPoolExecutor(max_workers=5) as executor:
        responses = list(executor.map(lambda _: fetch_me(), range(5)))

    for response in responses:
        assert response.status_code == 200
        body = response.json()
        assert body["username"] == "admin"
        assert body["roles"] == ["admin"]


def test_me_options_preflight_not_blocked(client):
    """T-ME-14: OPTIONS /api/v1/me 预检不被鉴权中间件 401 拦截。"""
    response = client.options(
        "/api/v1/me",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code != 401


def test_health_public_vs_healthz_protected(client):
    """T-ME-15: /health 公开 200；/healthz 受保护 401 + UNAUTHORIZED body。"""
    health = client.get("/health")
    assert health.status_code == 200

    healthz = client.get("/healthz")
    assert healthz.status_code == 401
    assert healthz.json() == UNAUTHORIZED_BODY


def test_me_basic_auth_scheme_returns_401(client, basic_auth_headers):
    """T-ME-16: Authorization: Basic dev → 401。"""
    response = client.get("/api/v1/me", headers=basic_auth_headers)
    assert response.status_code == 401
    assert response.json() == UNAUTHORIZED_BODY


def test_me_expired_placeholder_token_returns_401(client):
    """T-ME-17: Authorization: Bearer expired-placeholder → 401。"""
    response = client.get(
        "/api/v1/me",
        headers={"Authorization": "Bearer expired-placeholder"},
    )
    assert response.status_code == 401
    assert response.json() == UNAUTHORIZED_BODY


def test_get_current_user_without_state_user_raises_401():
    """T-ME-18: get_current_user 无 state.user → HTTPException 401 UNAUTHORIZED。"""
    request = Request(
        scope={"type": "http", "method": "GET", "path": "/api/v1/me", "headers": []},
    )
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(get_current_user(request))
    assert exc_info.value.status_code == 401
    assert exc_info.value.detail["code"] == "UNAUTHORIZED"
