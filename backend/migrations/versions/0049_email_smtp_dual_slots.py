"""email SMTP dual slots (qq + 163) + schedule email_smtp_slot

Revision ID: 0049
Revises: 0048
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0049"
down_revision: Union[str, None] = "0048"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "UPDATE platform_delivery_configs SET channel = 'email_qq' WHERE channel = 'email'",
    )
    op.drop_constraint(
        "ck_platform_delivery_configs_channel",
        "platform_delivery_configs",
        type_="check",
    )
    op.create_check_constraint(
        "ck_platform_delivery_configs_channel",
        "platform_delivery_configs",
        "channel IN ('email_qq', 'email_163')",
    )
    op.add_column(
        "report_schedules",
        sa.Column("email_smtp_slot", sa.String(length=8), nullable=False, server_default="qq"),
    )
    op.create_check_constraint(
        "ck_report_schedules_email_smtp_slot",
        "report_schedules",
        "email_smtp_slot IN ('qq', '163')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_report_schedules_email_smtp_slot", "report_schedules", type_="check")
    op.drop_column("report_schedules", "email_smtp_slot")
    op.drop_constraint(
        "ck_platform_delivery_configs_channel",
        "platform_delivery_configs",
        type_="check",
    )
    op.execute(
        "UPDATE platform_delivery_configs SET channel = 'email' WHERE channel = 'email_qq'",
    )
    op.execute("DELETE FROM platform_delivery_configs WHERE channel = 'email_163'")
    op.create_check_constraint(
        "ck_platform_delivery_configs_channel",
        "platform_delivery_configs",
        "channel IN ('email')",
    )
