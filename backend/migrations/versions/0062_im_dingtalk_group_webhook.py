"""DingTalk group-robot webhook delivery (0062).

Revision ID: 0062
Revises: 0061
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op

revision: str = "0062"
down_revision: Union[str, None] = "0061"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_NEW = "delivery_mode IN ('corporate_app', 'user_delegated', 'group_webhook')"
_OLD = "delivery_mode IN ('corporate_app', 'user_delegated')"


def upgrade() -> None:
    op.drop_constraint(
        "ck_platform_im_connect_configs_delivery_mode",
        "platform_im_connect_configs",
        type_="check",
    )
    op.create_check_constraint(
        "ck_platform_im_connect_configs_delivery_mode",
        "platform_im_connect_configs",
        _NEW,
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_platform_im_connect_configs_delivery_mode",
        "platform_im_connect_configs",
        type_="check",
    )
    op.create_check_constraint(
        "ck_platform_im_connect_configs_delivery_mode",
        "platform_im_connect_configs",
        _OLD,
    )
