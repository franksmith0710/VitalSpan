"""dashboards table for M5 DASH-001

Revision ID: 0013
Revises: 0012
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0013"
down_revision: Union[str, None] = "0012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DEFAULT_LAYOUT = {"version": 1, "widgets": [], "globalFilters": []}


def upgrade() -> None:
    op.create_table(
        "dashboards",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("slug", sa.String(length=64), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "layout_json",
            sa.JSON(),
            nullable=False,
            server_default=sa.text(
                "'{\"version\"\\:1,\"widgets\"\\:[],\"globalFilters\"\\:[]}'::json"
            ),
        ),
        sa.Column("created_by", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug", name="uq_dashboards_slug"),
    )
    op.create_index("ix_dashboards_created_by", "dashboards", ["created_by"])


def downgrade() -> None:
    op.drop_index("ix_dashboards_created_by", table_name="dashboards")
    op.drop_table("dashboards")
