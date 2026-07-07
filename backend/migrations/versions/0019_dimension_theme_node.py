"""dimension theme_node_id FK

Revision ID: 0019
Revises: 0018
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0019"
down_revision: Union[str, None] = "0018"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "dimension_dicts",
        sa.Column(
            "theme_node_id",
            sa.Uuid(),
            sa.ForeignKey("theme_nodes.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index("ix_dimension_dicts_theme_node_id", "dimension_dicts", ["theme_node_id"])


def downgrade() -> None:
    op.drop_index("ix_dimension_dicts_theme_node_id", table_name="dimension_dicts")
    op.drop_column("dimension_dicts", "theme_node_id")
