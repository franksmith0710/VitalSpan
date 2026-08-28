"""user_im_bindings source + unique account constraint

Revision ID: 0058
Revises: 0057
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0058"
down_revision: Union[str, None] = "0057"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "user_im_bindings",
        sa.Column("source", sa.String(length=16), nullable=False, server_default="oauth"),
    )
    op.create_unique_constraint(
        "uq_user_im_bindings_channel_account",
        "user_im_bindings",
        ["channel", "account_id"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_user_im_bindings_channel_account", "user_im_bindings", type_="unique")
    op.drop_column("user_im_bindings", "source")
