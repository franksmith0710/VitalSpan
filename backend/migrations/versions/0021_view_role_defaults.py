"""view_role_defaults table for VIEW-002 companion DB persist

Revision ID: 0021
Revises: 0020
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0021"
down_revision: Union[str, None] = "0020"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "view_role_defaults",
        sa.Column("role_key", sa.String(length=128), nullable=False),
        sa.Column("dashboard_id", sa.Uuid(), nullable=True),
        sa.Column("report_template_node_id", sa.Uuid(), nullable=True),
        sa.Column("max_widget_count", sa.Integer(), nullable=False, server_default="24"),
        sa.Column("inherit_from_role_id", sa.String(length=128), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("role_key"),
    )


def downgrade() -> None:
    op.drop_table("view_role_defaults")
