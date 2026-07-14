# auth-admin-orphan-no-permissions

- **影响**: be · auth · admin-ui
- **症状**: 使用 `admin` 登录后 `/me` 返回 `roles: []`、`isRoot: false`、`permissions: []`；导航与 API 全部无权限。
- **根因**: 0025 迁移只把 `code=admin` 角色标为 `is_root`，**不写** `auth_user_roles`。若库中已有其他测试用户占用 root 绑定，`bootstrap_root` 前置短路认为「已初始化」，不会给 `username=admin` 补绑。
- **修复**: `ensure_admin_username_root_binding()`（`backend/app/auth/bootstrap_root.py`）幂等补绑；`python -m app.auth.bootstrap_root` 在无密码时优先执行修复。
- **验证**:
  - `python -m app.auth.bootstrap_root` → `repaired: admin (...) bound to root admin role`
  - 重新登录后 `/me` 应含 `roles: ["admin"]`、`isRoot: true`
  - `pytest tests/test_auth_user_lifecycle.py::test_ensure_admin_username_root_binding_repairs_orphan_admin -q`
- **锚点**: `backend/app/auth/bootstrap_root.py` · `backend/app/auth/permissions/service.py::resolve_user_permissions`
