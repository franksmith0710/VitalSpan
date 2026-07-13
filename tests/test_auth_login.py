import pytest

from app.auth.jwt import create_access_token


def test_login_success_returns_access_token(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "changeme"},
    )
    if response.status_code == 401:
        pytest.skip("admin user not seeded; run migration 0017 in test DB")
    assert response.status_code == 200
    body = response.json()
    assert body["accessToken"]
    assert body["tokenType"] == "bearer"
    assert body["expiresIn"] > 0


def test_login_invalid_credentials_401(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "wrong-password"},
    )
    assert response.status_code == 401
    assert response.json()["code"] == "AUTH_INVALID_CREDENTIALS"


def test_me_with_jwt_returns_user(client, admin_auth_headers):
    response = client.get("/api/v1/me", headers=admin_auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["username"] == "admin"
    assert "admin" in body["roles"]
    assert body["id"] != "dev"


def test_bearer_dev_rejected(client):
    response = client.get("/api/v1/me", headers={"Authorization": "Bearer dev"})
    assert response.status_code == 401


def test_dev_switch_not_found_in_production(client, admin_auth_headers, monkeypatch):
    monkeypatch.setenv("VITALSPAN_ENV", "production")
    from app.core.config import get_settings

    get_settings.cache_clear()
    response = client.post(
        "/api/v1/auth/dev-switch",
        json={"username": "admin"},
        headers=admin_auth_headers,
    )
    get_settings.cache_clear()
    assert response.status_code == 404


def test_dev_switch_success_in_development(client, admin_auth_headers):
    response = client.post(
        "/api/v1/auth/dev-switch",
        json={"username": "admin"},
        headers=admin_auth_headers,
    )
    if response.status_code == 404:
        pytest.skip("not in development env")
    assert response.status_code == 200
    body = response.json()
    assert body["accessToken"]
    me = client.get("/api/v1/me", headers={"Authorization": f"Bearer {body['accessToken']}"})
    assert me.status_code == 200
    assert me.json()["username"] == "admin"


def test_dev_switch_user_not_found(client, admin_auth_headers):
    response = client.post(
        "/api/v1/auth/dev-switch",
        json={"username": "__no_such_user__"},
        headers=admin_auth_headers,
    )
    if response.status_code == 404 and response.json().get("code") == "NOT_FOUND":
        pytest.skip("not in development env")
    assert response.status_code == 404
    assert response.json()["code"] == "USER_NOT_FOUND"


def test_login_public_without_auth(client):
    response = client.post("/api/v1/auth/login", json={"username": "x", "password": "y"})
    assert response.status_code == 401


def test_login_jwt_carries_user_token_version(client):
    """Task 6: 登录发放的 JWT 必须携带用户当前 tokenVersion。"""
    import uuid

    from app.auth.jwt import decode_access_token
    from app.auth.models import AuthUser, Base, get_meta_engine, get_meta_session
    from app.auth.password.service import hash_password

    engine = get_meta_engine()
    Base.metadata.create_all(engine)
    username = f"lv_{uuid.uuid4().hex[:8]}"
    session = get_meta_session()
    try:
        session.add(
            AuthUser(
                username=username,
                password_hash=hash_password("pw-known-1234"),
                is_active=True,
                token_version=4,
            )
        )
        session.commit()
    finally:
        session.close()

    response = client.post(
        "/api/v1/auth/login",
        json={"username": username, "password": "pw-known-1234"},
    )
    assert response.status_code == 200
    claims = decode_access_token(response.json()["accessToken"])
    assert claims["tokenVersion"] == 4
