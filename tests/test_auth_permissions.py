import json
import uuid as uuid_mod

import pytest
from sqlalchemy import select

from app.auth.models import (
    AuthAuditEvent,
    AuthPermission,
    AuthRole,
    AuthRolePermission,
    AuthUser,
    AuthUserRole,
    Base,
    get_meta_engine,
    get_meta_session,
)


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


# --------------------------------------------------------------------------- #
# Task 2: 权限匹配、目录与角色权限服务
# --------------------------------------------------------------------------- #


def _new_session():
    engine = get_meta_engine()
    Base.metadata.create_all(engine)
    return get_meta_session()


def _make_role(session, *, code=None, is_root=False, is_active=True, permission_version=0):
    if is_root:
        # root code CHECK 约束强制 code='admin'，且全局唯一 → 复用或提升现有 admin 角色。
        role = session.scalar(select(AuthRole).where(AuthRole.code == "admin"))
        if role is None:
            role = AuthRole(code="admin", name="admin")
            session.add(role)
        role.is_root = True
        role.is_system = True
        role.is_active = is_active
        session.commit()
        session.refresh(role)
        return role
    if code is None:
        code = f"r_{uuid_mod.uuid4().hex[:10]}"
    role = AuthRole(
        code=code,
        name=code,
        is_root=is_root,
        is_system=is_root,
        is_active=is_active,
        permission_version=permission_version,
    )
    session.add(role)
    session.commit()
    session.refresh(role)
    return role


def _make_user(session, *, is_active=True, role_ids=()):
    user = AuthUser(username=f"u_{uuid_mod.uuid4().hex[:10]}", is_active=is_active)
    session.add(user)
    session.commit()
    session.refresh(user)
    for rid in role_ids:
        session.add(AuthUserRole(user_id=user.id, role_id=rid))
    session.commit()
    return user


def _audit_ctx():
    from app.auth.permissions import AuditWriteContext

    return AuditWriteContext(actor_id="dev", actor_username="dev", trace_id="t-perm")


def test_permission_matches_semantics():
    """T-PERM-10: permission_matches 精确/通配/root/缺权限。"""
    from app.auth.permissions import permission_matches

    assert permission_matches({"system:user.read"}, "system:user.read", False)
    assert permission_matches({"system:*"}, "system:user.manage", False)
    assert permission_matches(set(), "system:user.manage", True)
    assert not permission_matches({"system:user.read"}, "system:user.manage", False)


def test_permission_catalog_contains_full_set():
    """T-PERM-11: 目录含 §5.1 全集 + theme/ingestion。"""
    from app.auth.permissions import PERMISSION_CATALOG

    codes = {definition.code for definition in PERMISSION_CATALOG}
    required = {
        "system:role.read",
        "system:role.manage",
        "system:user.read",
        "system:user.manage",
        "system:user.password.reset",
        "system:grant.read",
        "system:grant.manage",
        "system:rls.read",
        "system:rls.manage",
        "system:org.read",
        "system:org.manage",
        "system:audit.read",
        "datasource:read",
        "datasource:manage",
        "dashboard:read",
        "dashboard:edit",
        "report:read",
        "report:manage",
        "dataset:read",
        "dataset:manage",
        "metadata:read",
        "metadata:manage",
        "governance:read",
        "governance:manage",
        "theme:read",
        "theme:manage",
        "ingestion:read",
        "ingestion:manage",
    }
    assert required <= codes
    # 目录不得包含通配编码
    assert not any(":" in c and c.endswith(":*") for c in codes)


def test_replace_role_permissions_rejects_unknown_code():
    """T-PERM-12: 未登记编码 → PERMISSION_CODE_INVALID。"""
    from app.auth.permissions import (
        PermissionServiceError,
        replace_role_permissions,
    )

    session = _new_session()
    try:
        role = _make_role(session)
        with pytest.raises(PermissionServiceError) as exc:
            replace_role_permissions(
                session,
                role.id,
                ["system:not.a.real.code"],
                expected_version=0,
                audit=_audit_ctx(),
            )
        assert exc.value.code == "PERMISSION_CODE_INVALID"
        assert exc.value.status == 422
    finally:
        session.close()


def test_replace_role_permissions_rejects_wildcard_persist():
    """T-PERM-13: domain:* 通配入库 → PERMISSION_CODE_INVALID。"""
    from app.auth.permissions import (
        PermissionServiceError,
        replace_role_permissions,
    )

    session = _new_session()
    try:
        role = _make_role(session)
        with pytest.raises(PermissionServiceError) as exc:
            replace_role_permissions(
                session,
                role.id,
                ["system:*"],
                expected_version=0,
                audit=_audit_ctx(),
            )
        assert exc.value.code == "PERMISSION_CODE_INVALID"
    finally:
        session.close()


def test_replace_role_permissions_rejects_root_role():
    """T-PERM-14: root 角色权限不可替换。"""
    from app.auth.permissions import (
        PermissionServiceError,
        replace_role_permissions,
    )

    session = _new_session()
    try:
        role = _make_role(session, is_root=True)
        with pytest.raises(PermissionServiceError) as exc:
            replace_role_permissions(
                session,
                role.id,
                ["system:user.read"],
                expected_version=0,
                audit=_audit_ctx(),
            )
        assert exc.value.code == "AUTH_ROOT_ROLE_IMMUTABLE"
        assert exc.value.status == 409
    finally:
        session.close()


def test_replace_role_permissions_version_conflict():
    """T-PERM-15: expected_version 不一致 → 409 ROLE_PERMISSION_VERSION_CONFLICT。"""
    from app.auth.permissions import (
        PermissionServiceError,
        replace_role_permissions,
    )

    session = _new_session()
    try:
        role = _make_role(session, permission_version=3)
        with pytest.raises(PermissionServiceError) as exc:
            replace_role_permissions(
                session,
                role.id,
                ["system:user.read"],
                expected_version=0,
                audit=_audit_ctx(),
            )
        assert exc.value.code == "ROLE_PERMISSION_VERSION_CONFLICT"
        assert exc.value.status == 409
    finally:
        session.close()


def test_replace_role_permissions_success_bumps_version_and_audits():
    """T-PERM-16: 替换成功 version+1；审计 before/after codes。"""
    from app.auth.permissions import replace_role_permissions

    session = _new_session()
    try:
        role = _make_role(session)
        role_id = role.id
        first = replace_role_permissions(
            session,
            role_id,
            ["system:user.read", "system:user.manage"],
            expected_version=0,
            audit=_audit_ctx(),
        )
        assert first.version == 1
        assert first.all_permissions is False
        assert set(first.permission_codes) == {"system:user.read", "system:user.manage"}

        # 绑定行入库
        bound = session.scalars(
            select(AuthPermission.code)
            .join(AuthRolePermission, AuthRolePermission.permission_id == AuthPermission.id)
            .where(AuthRolePermission.role_id == role_id)
        ).all()
        assert set(bound) == {"system:user.read", "system:user.manage"}

        second = replace_role_permissions(
            session,
            role_id,
            ["system:user.read"],
            expected_version=1,
            audit=_audit_ctx(),
        )
        assert second.version == 2
        assert set(second.permission_codes) == {"system:user.read"}

        events = session.scalars(
            select(AuthAuditEvent).where(
                AuthAuditEvent.target_id == role_id,
                AuthAuditEvent.action == "role.permissions.replace",
            )
        ).all()
        assert len(events) == 2
        transitions = set()
        for event in events:
            detail = json.loads(event.detail)
            assert set(detail.keys()) == {"before", "after"}
            transitions.add((tuple(detail["before"]), tuple(detail["after"])))
        assert (tuple(), ("system:user.manage", "system:user.read")) in transitions
        assert (
            ("system:user.manage", "system:user.read"),
            ("system:user.read",),
        ) in transitions
    finally:
        session.close()


def test_resolve_user_permissions_aggregates_active_only():
    """T-PERM-17: 仅聚合启用用户+启用角色的精确 code。"""
    from app.auth.permissions import replace_role_permissions, resolve_user_permissions

    session = _new_session()
    try:
        active_role = _make_role(session)
        disabled_role = _make_role(session, is_active=False)
        replace_role_permissions(
            session,
            active_role.id,
            ["dashboard:read", "report:read"],
            expected_version=0,
            audit=_audit_ctx(),
        )
        # 停用角色的权限不应出现在聚合结果里；直接插入绑定
        pid = session.scalar(
            select(AuthPermission.id).where(AuthPermission.code == "dashboard:read")
        )
        session.add(AuthRolePermission(role_id=disabled_role.id, permission_id=pid))
        session.commit()

        user = _make_user(session, role_ids=[active_role.id, disabled_role.id])
        perms, is_root = resolve_user_permissions(session, user.id)
        assert is_root is False
        assert perms == {"dashboard:read", "report:read"}
    finally:
        session.close()


def test_resolve_user_permissions_root_short_circuits():
    """T-PERM-18: is_root=true 不查 role_permissions，返回空集 + True。"""
    from app.auth.permissions import resolve_user_permissions

    session = _new_session()
    try:
        root_role = _make_role(session, is_root=True)
        user = _make_user(session, role_ids=[root_role.id])
        perms, is_root = resolve_user_permissions(session, user.id)
        assert is_root is True
        assert perms == set()
    finally:
        session.close()


def test_resolve_user_permissions_disabled_user_empty():
    """T-PERM-19: 停用用户返回空集且非 root。"""
    from app.auth.permissions import resolve_user_permissions

    session = _new_session()
    try:
        root_role = _make_role(session, is_root=True)
        user = _make_user(session, is_active=False, role_ids=[root_role.id])
        perms, is_root = resolve_user_permissions(session, user.id)
        assert perms == set()
        assert is_root is False
    finally:
        session.close()


def test_permission_id_for_code_is_deterministic():
    """T-PERM-20: permission_id_for_code UUIDv5 稳定且命名空间固定。"""
    from app.auth.permissions.constants import (
        PERMISSION_NAMESPACE_UUID,
        permission_id_for_code,
    )

    assert PERMISSION_NAMESPACE_UUID == uuid_mod.UUID("6f3e2a1b-8c4d-5e6f-9a0b-1c2d3e4f5a6b")
    once = permission_id_for_code("system:user.read")
    twice = permission_id_for_code("system:user.read")
    assert once == twice
    assert once == uuid_mod.uuid5(PERMISSION_NAMESPACE_UUID, "system:user.read")


# --------------------------------------------------------------------------- #
# Task 3: 根管理员不变量（assert_root_admin_survives）
# --------------------------------------------------------------------------- #


def _reset_root_state(session):
    """将 root 状态归零：确保唯一 admin root 角色存在且无任何 root 绑定。"""
    from app.auth.bootstrap_root import ensure_root_role

    role = ensure_root_role(session)
    session.query(AuthUserRole).filter(AuthUserRole.role_id == role.id).delete()
    session.commit()
    return role


def test_assert_root_admin_survives_passes_with_enabled_root():
    """T-PERM-21: 存在启用 root 用户时不变量通过。"""
    from app.auth.bootstrap_root import assert_root_admin_survives

    session = _new_session()
    try:
        root = _reset_root_state(session)
        _make_user(session, role_ids=[root.id])
        assert_root_admin_survives(session)
    finally:
        session.close()


def test_assert_root_admin_survives_raises_when_none():
    """T-PERM-22: 无任何启用 root 绑定 → RootAdminRequiredError(409)。"""
    from app.auth.bootstrap_root import (
        RootAdminRequiredError,
        assert_root_admin_survives,
    )

    session = _new_session()
    try:
        _reset_root_state(session)
        with pytest.raises(RootAdminRequiredError) as exc:
            assert_root_admin_survives(session)
        assert exc.value.code == "AUTH_ROOT_ADMIN_REQUIRED"
        assert exc.value.status == 409
    finally:
        session.close()


def test_count_enabled_root_users_excludes_disabled_and_excluded():
    """T-PERM-23: 统计仅计启用用户；excluding_user_id 排除指定用户。"""
    from app.auth.bootstrap_root import count_enabled_root_users

    session = _new_session()
    try:
        root = _reset_root_state(session)
        u1 = _make_user(session, role_ids=[root.id])
        u2 = _make_user(session, role_ids=[root.id])
        _make_user(session, is_active=False, role_ids=[root.id])
        assert count_enabled_root_users(session) == 2
        assert count_enabled_root_users(session, excluding_user_id=u1.id) == 1
        assert count_enabled_root_users(
            session, excluding_role_id=root.id
        ) == 0
        assert u2.id is not None
    finally:
        session.close()
