"""term physical field mappings

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
        "term_physical_mappings",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "term_id",
            sa.Uuid(),
            sa.ForeignKey("glossary_terms.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("table_fqn", sa.String(128), nullable=False),
        sa.Column("column_name", sa.String(64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_term_physical_mappings_term_id", "term_physical_mappings", ["term_id"])
    op.create_unique_constraint(
        "uq_term_physical_mapping",
        "term_physical_mappings",
        ["term_id", "table_fqn", "column_name"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_term_physical_mapping", "term_physical_mappings", type_="unique")
    op.drop_index("ix_term_physical_mappings_term_id", table_name="term_physical_mappings")
    op.drop_table("term_physical_mappings")
