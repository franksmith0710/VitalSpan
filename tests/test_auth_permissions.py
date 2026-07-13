from app.auth.models import AuthPermission, AuthRole, AuthRolePermission, AuthUser


def test_permission_models_have_required_constraints():
    """T-PERM-01: 权限表 code 唯一，角色权限绑定复合主键。"""
    assert AuthPermission.__table__.c.code.unique
    assert AuthRole.__table__.c.code.unique
    assert set(AuthRolePermission.__table__.primary_key.columns.keys()) == {
        "role_id",
        "permission_id",
    }


def test_role_and_user_security_fields_exist():
    """T-PERM-02: 角色与用户安全字段齐备。"""
    assert {"is_system", "is_root", "permission_version", "rls_version"} <= set(
        AuthRole.__table__.c.keys()
    )
    assert {
        "is_active",
        "failed_login_count",
        "locked_until",
        "password_changed_at",
        "updated_at",
        "token_version",
    } <= set(AuthUser.__table__.c.keys())


def test_auth_roles_root_code_check_constraint():
    """T-PERM-03: auth_roles 存在 root code CHECK 约束。"""
    check_names = {
        c.name for c in AuthRole.__table__.constraints if c.__class__.__name__ == "CheckConstraint"
    }
    assert "ck_auth_roles_root_code" in check_names
