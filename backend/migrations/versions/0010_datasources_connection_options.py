"""data_sources connection_options and active code uniqueness

Revision ID: 0010
Revises: 0009
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0010"
down_revision: Union[str, None] = "0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "data_sources",
        sa.Column("connection_options", sa.JSON(), nullable=True),
    )
    with op.batch_alter_table("data_sources") as batch_op:
        batch_op.drop_constraint("data_sources_code_key", type_="unique")
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.create_index(
            "uq_data_sources_code_active",
            "data_sources",
            ["code"],
            unique=True,
            postgresql_where=sa.text("deleted_at IS NULL"),
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.drop_index("uq_data_sources_code_active", table_name="data_sources")
    with op.batch_alter_table("data_sources") as batch_op:
        batch_op.create_unique_constraint("data_sources_code_key", ["code"])
    op.drop_column("data_sources", "connection_options")
