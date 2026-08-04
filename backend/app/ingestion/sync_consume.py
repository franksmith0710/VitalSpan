"""同步成功后消费链编排：登记分析库 → Dataset → query 绑定。"""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass
from typing import Literal

from sqlalchemy.orm import Session

from app.auth.deps import UserContext
from app.core.config import get_settings
from app.datasources.metadata.service import list_columns
from app.datasources.service import DataSourceError
from app.ingestion.analytics_datasource import (
    ensure_analytics_datasource,
    resolve_analytics_datasource_id,
)
from app.ingestion.models import SyncJob
from app.metadata.dataset.models import DatasetRecord
from app.metadata.dataset.schemas import DatasetItemIn, DatasetTableDef
from app.metadata.dataset import service as dataset_service
from app.metadata.dataset.errors import DatasetError
from app.query.config_store.schemas import ConfigUpsert
from app.query.config_store.service import upsert_config

logger = logging.getLogger(__name__)

NextAction = Literal["prepare", "ensure_dataset", "open_dashboard"]
ConsumeLabel = Literal["ready", "pending_dataset", "pending_prepare"]


class SyncConsumeError(Exception):
    def __init__(self, code: str, message: str, status: int = 422) -> None:
        self.code = code
        self.message = message
        self.status = status
        super().__init__(message)


@dataclass(frozen=True)
class PrepareResult:
    analytics_datasource_id: uuid.UUID | None
    analytics_ready: bool
    created: bool


@dataclass(frozen=True)
class ConsumePipelineStatus:
    target_table: str
    suggested_dataset_id: str
    analytics_datasource_id: uuid.UUID | None
    analytics_ready: bool
    dataset_id: str
    dataset_exists: bool
    dataset_bound: bool
    next_action: NextAction
    consume_label: ConsumeLabel


@dataclass(frozen=True)
class EnsureDatasetResult:
    dataset_id: str
    bound_config_id: uuid.UUID
    created: bool
    bound: bool


def _stable_ref_id(dataset_id: str) -> uuid.UUID:
    return uuid.uuid5(uuid.NAMESPACE_DNS, f"vitalspan.sync.dataset.{dataset_id}")


def _dataset_id_for_job(job: SyncJob) -> str:
    return job.target_table


def prepare_sync_consume(db: Session) -> PrepareResult:
    """幂等登记托管分析库数据源（仅使用服务端 ANALYTICS_DATABASE_URL）。"""
    if not get_settings().analytics_database_url:
        return PrepareResult(analytics_datasource_id=None, analytics_ready=False, created=False)
    before = resolve_analytics_datasource_id(db)
    ds_id = ensure_analytics_datasource(db)
    created = before is None and ds_id is not None
    return PrepareResult(
        analytics_datasource_id=ds_id,
        analytics_ready=ds_id is not None,
        created=created,
    )


def resolve_consume_status(db: Session, job: SyncJob) -> ConsumePipelineStatus:
    """汇总同步任务的消费管道状态（不触发副作用）。"""
    analytics_id = resolve_analytics_datasource_id(db)
    analytics_ready = analytics_id is not None and bool(get_settings().analytics_database_url)
    dataset_id = _dataset_id_for_job(job)
    row = db.get(DatasetRecord, dataset_id)
    dataset_exists = row is not None
    dataset_bound = bool(row and row.bound_config_id)

    if not analytics_ready:
        next_action: NextAction = "prepare"
        consume_label: ConsumeLabel = "pending_prepare"
    elif not dataset_exists or not dataset_bound:
        next_action = "ensure_dataset"
        consume_label = "pending_dataset"
    else:
        next_action = "open_dashboard"
        consume_label = "ready"

    return ConsumePipelineStatus(
        target_table=job.target_table,
        suggested_dataset_id=dataset_id,
        analytics_datasource_id=analytics_id,
        analytics_ready=analytics_ready,
        dataset_id=dataset_id,
        dataset_exists=dataset_exists,
        dataset_bound=dataset_bound,
        next_action=next_action,
        consume_label=consume_label,
    )


def _list_table_columns(
    db: Session,
    actor: UserContext,
    data_source_id: uuid.UUID,
    schema: str,
    table: str,
) -> list[str]:
    try:
        resp = list_columns(db, list(actor.roles), data_source_id, schema, table)
    except DataSourceError as exc:
        raise SyncConsumeError(exc.code, exc.message, exc.status) from exc
    return [col.name for col in resp.items]


def _bind_dataset_query(
    db: Session,
    *,
    dataset_id: str,
    data_source_id: uuid.UUID,
    schema: str,
    table: str,
    columns: list[str],
    actor: UserContext,
) -> uuid.UUID:
    record = upsert_config(
        db,
        ConfigUpsert.model_validate(
            {
                "configType": "dataset_query",
                "schemaVersion": "1.0",
                "refType": "dataset",
                "refId": str(_stable_ref_id(dataset_id)),
                "payload": {
                    "dataSourceId": str(data_source_id),
                    "connectorType": "postgresql",
                    "schema": schema,
                    "table": table,
                    "columns": columns,
                    "conditions": {"logic": "AND", "conditions": []},
                    "limit": 1000,
                    "offset": 0,
                },
            },
        ),
        owner_id=uuid.UUID(actor.id),
    )
    row = db.get(DatasetRecord, dataset_id)
    if row is None:
        raise SyncConsumeError("META_DATASET_NOT_FOUND", "Dataset 不存在", 404)
    row.bound_config_id = record.id
    db.commit()
    return record.id


def ensure_dataset_for_sync_job(
    db: Session,
    job: SyncJob,
    actor: UserContext,
) -> EnsureDatasetResult:
    """一键创建 Dataset 并绑定 dataset_query（幂等）。"""
    prep = prepare_sync_consume(db)
    if not prep.analytics_ready or prep.analytics_datasource_id is None:
        raise SyncConsumeError(
            "ANALYTICS_DB_NOT_CONFIGURED",
            "托管分析库未配置或不可达，请先配置 ANALYTICS_DATABASE_URL 并确保分析库可连接",
            503,
        )

    dataset_id = _dataset_id_for_job(job)
    schema = "public"
    table = job.target_table
    qualified = f"{schema}.{table}"
    ds_id = prep.analytics_datasource_id

    row = db.get(DatasetRecord, dataset_id)
    created = False
    if row is None:
        try:
            dataset_service.create_dataset(
                DatasetItemIn(
                    dataset_id=dataset_id,
                    display_name=dataset_id,
                    tables=[DatasetTableDef(name=qualified)],
                ),
                actor,
            )
            created = True
        except DatasetError as exc:
            if exc.code != "META_DATASET_CONFLICT":
                raise SyncConsumeError(exc.code, exc.message, exc.status) from exc
        row = db.get(DatasetRecord, dataset_id)

    if row is None:
        raise SyncConsumeError("META_DATASET_CREATE_FAILED", "Dataset 创建失败", 500)

    if row.bound_config_id is not None:
        return EnsureDatasetResult(
            dataset_id=dataset_id,
            bound_config_id=row.bound_config_id,
            created=created,
            bound=False,
        )

    columns = _list_table_columns(db, actor, ds_id, schema, table)
    if not columns:
        raise SyncConsumeError(
            "SYNC_CONSUME_NO_COLUMNS",
            f"目标表 {qualified} 无可用列，请确认同步已成功写入分析库",
            422,
        )

    bound_id = _bind_dataset_query(
        db,
        dataset_id=dataset_id,
        data_source_id=ds_id,
        schema=schema,
        table=table,
        columns=columns,
        actor=actor,
    )
    logger.info(
        "sync_consume_dataset_ready job=%s dataset=%s bound=%s created=%s",
        job.id,
        dataset_id,
        bound_id,
        created,
    )
    return EnsureDatasetResult(
        dataset_id=dataset_id,
        bound_config_id=bound_id,
        created=created,
        bound=True,
    )


def best_effort_prepare_after_sync(db: Session) -> None:
    """同步成功后 best-effort 登记分析库，失败仅记日志。"""
    try:
        result = prepare_sync_consume(db)
        if result.analytics_ready:
            logger.info(
                "sync_consume_auto_prepare ok ds=%s created=%s",
                result.analytics_datasource_id,
                result.created,
            )
        else:
            logger.warning("sync_consume_auto_prepare skipped analytics not ready")
    except Exception:
        logger.warning("sync_consume_auto_prepare_failed", exc_info=True)
