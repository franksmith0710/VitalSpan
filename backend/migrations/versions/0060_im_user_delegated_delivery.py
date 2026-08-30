"""IM user-delegated delivery mode + per-user OAuth tokens

Revision ID: 0060
Revises: 0059
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0060"
down_revision: Union[str, None] = "0059"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

IM_DELIVERY_MODES = ("corporate_app", "user_delegated")


def upgrade() -> None:
    op.add_column(
        "platform_im_connect_configs",
        sa.Column(
            "delivery_mode",
            sa.String(length=32),
            nullable=False,
            server_default="corporate_app",
        ),
    )
    op.create_check_constraint(
        "ck_platform_im_connect_configs_delivery_mode",
        "platform_im_connect_configs",
        "delivery_mode IN ('corporate_app', 'user_delegated')",
    )
    op.add_column(
        "user_im_bindings",
        sa.Column("token_encrypted", sa.Text(), nullable=True),
    )
    op.add_column(
        "user_im_bindings",
        sa.Column("token_expires_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("user_im_bindings", "token_expires_at")
    op.drop_column("user_im_bindings", "token_encrypted")
    op.drop_constraint(
        "ck_platform_im_connect_configs_delivery_mode",
        "platform_im_connect_configs",
        type_="check",
    )
    op.drop_column("platform_im_connect_configs", "delivery_mode")
