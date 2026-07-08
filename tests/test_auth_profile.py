"""Account self-service profile and password change."""

from __future__ import annotations

import os
import uuid

import pytest
from fastapi.testclient import TestClient

from app.auth.jwt import create_access_token
from app.main import app


@pytest.fixture
def profile_client() -> TestClient:
    return TestClient(app)


def _login_headers(client: TestClient) -> dict[str, str]:
    password = os.environ.get("VITALSPAN_DEV_ADMIN_PASSWORD", "changeme")
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": password},
    )
    if response.status_code == 200:
        token = response.json()["accessToken"]
        return {"Authorization": f"Bearer {token}"}
    token = create_access_token("00000000-0000-0000-0000-000000000001", "admin")
    return {"Authorization": f"Bearer {token}"}


def test_me_includes_profile_fields(profile_client: TestClient):
    headers = _login_headers(profile_client)
    response = profile_client.get("/api/v1/me", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["username"] == "admin"
    assert "displayName" in body
    assert "email" in body
    assert "@" in body["email"]


def test_patch_me_updates_profile(profile_client: TestClient):
    headers = _login_headers(profile_client)
    suffix = uuid.uuid4().hex[:8]
    email = f"admin-{suffix}@example.com"
    response = profile_client.patch(
        "/api/v1/me",
        headers=headers,
        json={"displayName": f"Admin {suffix}", "email": email},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["displayName"] == f"Admin {suffix}"
    assert body["email"] == email

    me = profile_client.get("/api/v1/me", headers=headers)
    assert me.json()["email"] == email


def test_patch_me_invalid_email_returns_422(profile_client: TestClient):
    headers = _login_headers(profile_client)
    response = profile_client.patch(
        "/api/v1/me",
        headers=headers,
        json={"email": "not-an-email"},
    )
    assert response.status_code == 422


def test_change_password_success_and_relogin(profile_client: TestClient):
    headers = _login_headers(profile_client)
    password = os.environ.get("VITALSPAN_DEV_ADMIN_PASSWORD", "changeme")
    new_password = f"{password}-rotated-{uuid.uuid4().hex[:6]}"
    response = profile_client.post(
        "/api/v1/auth/change-password",
        headers=headers,
        json={"currentPassword": password, "newPassword": new_password},
    )
    assert response.status_code == 204

    bad_login = profile_client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": password},
    )
    assert bad_login.status_code == 401

    good_login = profile_client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": new_password},
    )
    assert good_login.status_code == 200

    # restore original password for other tests
    token = good_login.json()["accessToken"]
    restore_headers = {"Authorization": f"Bearer {token}"}
    restore = profile_client.post(
        "/api/v1/auth/change-password",
        headers=restore_headers,
        json={"currentPassword": new_password, "newPassword": password},
    )
    assert restore.status_code == 204


def test_change_password_wrong_current_returns_401(profile_client: TestClient):
    headers = _login_headers(profile_client)
    response = profile_client.post(
        "/api/v1/auth/change-password",
        headers=headers,
        json={"currentPassword": "definitely-wrong", "newPassword": "newpassword123"},
    )
    assert response.status_code == 401
    assert response.json()["code"] == "AUTH_INVALID_CURRENT_PASSWORD"
