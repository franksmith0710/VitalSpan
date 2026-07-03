"""ingestion tables

Revision ID: 0002
Revises: 0001
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ingestion_sync_jobs",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("source_type", sa.String(16), nullable=False),
        sa.Column("source_host", sa.String(255), nullable=False),
        sa.Column("source_port", sa.Integer(), nullable=False),
        sa.Column("source_database", sa.String(128), nullable=False),
        sa.Column("source_username", sa.String(128), nullable=False),
        sa.Column("source_password_encrypted", sa.Text(), nullable=False),
        sa.Column("source_table", sa.String(128), nullable=False),
        sa.Column("target_table", sa.String(128), nullable=False),
        sa.Column("schedule_cron", sa.String(64), nullable=True),
        sa.Column("enabled", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("source_data_source_id", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_table(
        "ingestion_sync_runs",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("job_id", sa.Uuid(), sa.ForeignKey("ingestion_sync_jobs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("rows_synced", sa.Integer(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("trace_id", sa.String(64), nullable=False),
        sa.Column("retry_count", sa.Integer(), server_default="0", nullable=False),
    )
    op.create_index(
        "ix_ingestion_sync_runs_job_started",
        "ingestion_sync_runs",
        ["job_id", "started_at"],
    )
    op.create_table(
        "ingestion_etl_rules",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("job_id", sa.Uuid(), sa.ForeignKey("ingestion_sync_jobs.id", ondelete="CASCADE"), unique=True, nullable=False),
        sa.Column("rules", sa.JSON(), server_default=sa.text("'[]'"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("ingestion_etl_rules")
    op.drop_index("ix_ingestion_sync_runs_job_started", table_name="ingestion_sync_runs")
    op.drop_table("ingestion_sync_runs")
    op.drop_table("ingestion_sync_jobs")
