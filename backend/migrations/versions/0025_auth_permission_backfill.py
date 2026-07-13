"""auth permission catalog backfill + root admin role invariant

Revision ID: 0025
Revises: 0024

确定性回填（可离线 --sql 渲染、可重复执行无副作用）：
- 权限目录：UUIDv5 确定性 ID upsert（ON CONFLICT DO NOTHING）。
- root 角色：admin 标记 is_system/is_root（ON CONFLICT (code) DO UPDATE）。
- 预置角色映射：analyst/viewer/editor/owner 若存在则按 Global Constraints 授权；
  自定义角色不扩权；不自动为任何用户指派角色。
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op

from app.auth.permissions.catalog import PERMISSION_CATALOG
from app.auth.permissions.constants import permission_id_for_code

revision: str = "0025"
down_revision: Union[str, None] = "0024"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# admin 为 root，解析为 '*'，无需显式权限行。其余预置角色按 Global Constraints 映射。
ROLE_PERMISSION_MAP: dict[str, tuple[str, ...]] = {
    "analyst": (
        "dashboard:read",
        "dashboard:edit",
        "report:read",
        "theme:read",
        "theme:manage",
    ),
    "viewer": ("dashboard:read", "report:read"),
    "editor": ("report:read", "report:manage"),
    "owner": ("report:read", "report:manage"),
}

ROOT_ADMIN_ROLE_ID = "00000000-0000-0000-0000-0000000000ad"


def _sql_str(value: str | None) -> str:
    if value is None:
        return "NULL"
    return "'" + value.replace("'", "''") + "'"


def _permission_upserts() -> list[str]:
    statements: list[str] = []
    for definition in PERMISSION_CATALOG:
        pid = permission_id_for_code(definition.code)
        statements.append(
            "INSERT INTO auth_permissions (id, code, name, domain, description) VALUES ("
            f"'{pid}', {_sql_str(definition.code)}, {_sql_str(definition.name)}, "
            f"{_sql_str(definition.domain)}, {_sql_str(definition.description)}"
            ") ON CONFLICT (id) DO NOTHING"
        )
    return statements


def _admin_role_upsert() -> str:
    return (
        "INSERT INTO auth_roles "
        "(id, code, name, is_active, is_system, is_root, permission_version, rls_version) "
        f"VALUES ('{ROOT_ADMIN_ROLE_ID}', 'admin', '管理员', true, true, true, 0, 0) "
        "ON CONFLICT (code) DO UPDATE SET is_system = true, is_root = true"
    )


def _role_permission_mappings() -> list[str]:
    statements: list[str] = []
    for role_code, codes in ROLE_PERMISSION_MAP.items():
        code_list = ", ".join(_sql_str(code) for code in codes)
        statements.append(
            "INSERT INTO auth_role_permissions (role_id, permission_id) "
            "SELECT r.id, p.id FROM auth_roles r "
            f"JOIN auth_permissions p ON p.code IN ({code_list}) "
            f"WHERE r.code = {_sql_str(role_code)} "
            "ON CONFLICT (role_id, permission_id) DO NOTHING"
        )
    return statements


def upgrade() -> None:
    for statement in _permission_upserts():
        op.execute(statement)
    op.execute(_admin_role_upsert())
    for statement in _role_permission_mappings():
        op.execute(statement)


def downgrade() -> None:
    op.execute("UPDATE auth_roles SET is_root = false, is_system = false WHERE code = 'admin'")
    permission_ids = ", ".join(
        f"'{permission_id_for_code(definition.code)}'" for definition in PERMISSION_CATALOG
    )
    op.execute(f"DELETE FROM auth_role_permissions WHERE permission_id IN ({permission_ids})")
    op.execute(f"DELETE FROM auth_permissions WHERE id IN ({permission_ids})")
