"""同步任务创建/更新时的 ETL 规则初始种子。"""

from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.auth.deps import UserContext
from app.datasources.metadata.service import list_columns
from app.ingestion.etl_suggest import EtlColumnMeta, suggest_etl_rules_from_columns
from app.ingestion.etl_templates import default_etl_rules_for_source
from app.ingestion.models import SyncJob


def resolve_source_schema_table(job: SyncJob) -> tuple[str, str]:
    raw_table = (job.source_table or "").strip()
    if "." in raw_table:
        schema, table = raw_table.split(".", 1)
        return schema.strip(), table.strip()
    return (job.source_database or "").strip(), raw_table


def resolve_initial_etl_rules(
    db: Session,
    job: SyncJob,
    actor: UserContext,
) -> list[dict[str, str]]:
    """解析同步任务的初始 ETL 规则：演示模板优先，否则按源表列元数据建议。"""
    demo_rules = default_etl_rules_for_source(job.source_type, job.source_table)
    if demo_rules:
        return demo_rules

    data_source_id = job.source_data_source_id
    if data_source_id is None:
        return []

    schema, table = resolve_source_schema_table(job)
    if not table:
        return []

    resp = list_columns(db, list(actor.roles), uuid.UUID(str(data_source_id)), schema, table)

    columns: list[EtlColumnMeta] = [
        {"name": col.name, "dataType": col.data_type} for col in resp.items
    ]
    suggested = suggest_etl_rules_from_columns(columns)
    return [dict(rule) for rule in suggested]
