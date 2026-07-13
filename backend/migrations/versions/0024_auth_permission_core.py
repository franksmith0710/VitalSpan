"""auth permission core: permissions, role_permissions, role/user security fields

Revision ID: 0024
Revises: 0023
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0024"
down_revision: Union[str, None] = "0023"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "auth_permissions",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("code", sa.String(128), nullable=False, unique=True),
        sa.Column("name", sa.String(128), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("domain", sa.String(64), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_auth_permissions_domain", "auth_permissions", ["domain"])

    op.create_table(
        "auth_role_permissions",
        sa.Column(
            "role_id",
            sa.Uuid(),
            sa.ForeignKey("auth_roles.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "permission_id",
            sa.Uuid(),
            sa.ForeignKey("auth_permissions.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    op.add_column(
        "auth_roles",
        sa.Column("is_system", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column(
        "auth_roles",
        sa.Column("is_root", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column(
        "auth_roles",
        sa.Column("permission_version", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "auth_roles",
        sa.Column("rls_version", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_check_constraint(
        "ck_auth_roles_root_code",
        "auth_roles",
        "NOT is_root OR code = 'admin'",
    )

    op.add_column(
        "auth_users",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    op.add_column(
        "auth_users",
        sa.Column("failed_login_count", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "auth_users",
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "auth_users",
        sa.Column("password_changed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "auth_users",
        sa.Column("token_version", sa.Integer(), nullable=False, server_default="1"),
    )
    op.add_column(
        "auth_users",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("auth_users", "updated_at")
    op.drop_column("auth_users", "token_version")
    op.drop_column("auth_users", "password_changed_at")
    op.drop_column("auth_users", "locked_until")
    op.drop_column("auth_users", "failed_login_count")
    op.drop_column("auth_users", "is_active")

    op.drop_constraint("ck_auth_roles_root_code", "auth_roles", type_="check")
    op.drop_column("auth_roles", "rls_version")
    op.drop_column("auth_roles", "permission_version")
    op.drop_column("auth_roles", "is_root")
    op.drop_column("auth_roles", "is_system")

    op.drop_table("auth_role_permissions")
    op.drop_index("ix_auth_permissions_domain", table_name="auth_permissions")
    op.drop_table("auth_permissions")
