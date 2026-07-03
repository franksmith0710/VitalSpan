"""auth user org_node_id

Revision ID: 0004
Revises: 0003
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "auth_users",
        sa.Column("org_node_id", sa.Uuid(), sa.ForeignKey("auth_org_nodes.id", ondelete="SET NULL"), nullable=True),
    )
    op.create_index("ix_auth_users_org_node_id", "auth_users", ["org_node_id"])


def downgrade() -> None:
    op.drop_index("ix_auth_users_org_node_id", table_name="auth_users")
    op.drop_column("auth_users", "org_node_id")
