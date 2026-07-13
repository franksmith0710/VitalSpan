"""Shared JWT auth headers for tests (replaces Bearer dev)."""

from app.auth.jwt import DEFAULT_TOKEN_VERSION, create_access_token

# conftest._seed_ci_admin_user 幂等 seed 的 root 管理员 UUID（每个测试前重建）。
# 默认 JWT 身份必须对应真实 DB 用户，才能被 AuthMiddleware 解析出
# roles=["admin"]、is_root=True——移除 middleware admin 回退后，历史测试
# 依赖此默认身份为真实 root。
DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001"


def jwt_auth_headers(
    *,
    user_id: str = DEFAULT_USER_ID,
    username: str = "admin",
    token_version: int = DEFAULT_TOKEN_VERSION,
) -> dict[str, str]:
    token = create_access_token(user_id, username, token_version=token_version)
    return {"Authorization": f"Bearer {token}"}


AUTH = jwt_auth_headers()
