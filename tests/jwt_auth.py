"""Shared JWT auth headers for tests (replaces Bearer dev)."""

from app.auth.jwt import DEFAULT_TOKEN_VERSION, create_access_token

DEFAULT_USER_ID = "dev"


def jwt_auth_headers(
    *,
    user_id: str = DEFAULT_USER_ID,
    username: str = "dev",
    token_version: int = DEFAULT_TOKEN_VERSION,
) -> dict[str, str]:
    token = create_access_token(user_id, username, token_version=token_version)
    return {"Authorization": f"Bearer {token}"}


AUTH = jwt_auth_headers()
