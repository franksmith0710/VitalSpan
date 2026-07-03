def test_me_without_token_returns_401(client):
    response = client.get("/api/v1/me")
    assert response.status_code == 401
    assert response.json() == {
        "code": "UNAUTHORIZED",
        "message": "Missing or invalid bearer token",
        "detail": None,
    }


def test_me_with_bearer_dev_returns_200(client):
    response = client.get(
        "/api/v1/me",
        headers={"Authorization": "Bearer dev"},
    )
    assert response.status_code == 200
    assert response.json() == {
        "id": "dev",
        "username": "dev",
        "roles": ["admin"],
    }
