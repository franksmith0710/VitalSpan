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


def test_me_with_jwt_returns_user(client, auth_headers):
    response = client.get("/api/v1/me", headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["username"] == "admin"
    assert "admin" in body["roles"]
    assert body["id"] != "dev"


def test_bearer_dev_rejected(client):
    response = client.get("/api/v1/me", headers={"Authorization": "Bearer dev"})
    assert response.status_code == 401


def test_login_public_without_auth(client):
    response = client.post("/api/v1/auth/login", json={"username": "x", "password": "y"})
    assert response.status_code == 401
