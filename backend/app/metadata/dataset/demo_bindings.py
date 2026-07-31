"""官方示例 Dataset 自动绑定 dataset_query 配置（图表编辑 Dataset 模式即开即用）。"""

from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.dashboard.templates.demo_datasource import (
    resolve_official_demo_connection,
    resolve_sample_db_datasource_id,
)
from app.metadata.dataset.demo_seed import DEMO_DATASET_SPECS
from app.metadata.dataset.models import DatasetRecord
from app.query.config_store.schemas import ConfigUpsert
from app.query.config_store.service import upsert_config

_DEMO_DATASET_BINDING_SPECS: dict[str, dict[str, object]] = {
    "demo-sales-wide": {
        "table": "de_sales_wide",
        "columns": ["sale_date", "province", "amount", "quantity", "product_name", "category_name"],
    },
    "demo-sales-detail": {
        "table": "sales",
        "columns": ["sale_date", "amount", "quantity", "channel"],
    },
    "demo-orders": {
        "table": "orders",
        "columns": ["order_date", "order_no", "status", "total_amount"],
    },
    "demo-daily-kpi": {
        "table": "daily_kpi",
        "columns": ["stat_date", "metric_code", "metric_name", "value"],
    },
    "demo-gov-service": {
        "table": "gov_service_metrics",
        "columns": ["stat_date", "department", "metric_code", "metric_name", "value"],
    },
}


def _stable_ref_id(dataset_id: str) -> uuid.UUID:
    return uuid.uuid5(uuid.NAMESPACE_DNS, f"vitalspan.demo.dataset.{dataset_id}")


def ensure_demo_dataset_bindings(db: Session) -> int:
    """为尚未绑定 query config 的官方示例 Dataset 幂等创建并绑定 dataset_query。"""
    data_source_id = resolve_sample_db_datasource_id(db)
    if data_source_id is None:
        return 0

    schema = resolve_official_demo_connection().database
    bound = 0

    for spec in DEMO_DATASET_SPECS:
        dataset_id = spec["dataset_id"]
        binding = _DEMO_DATASET_BINDING_SPECS.get(dataset_id)
        if binding is None:
            continue

        row = db.get(DatasetRecord, dataset_id)
        if row is None or row.bound_config_id is not None:
            continue

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
                        "connectorType": "mysql",
                        "schema": schema,
                        "table": binding["table"],
                        "columns": binding["columns"],
                        "conditions": {"logic": "AND", "conditions": []},
                        "limit": 1000,
                        "offset": 0,
                    },
                },
            ),
        )
        row.bound_config_id = record.id
        db.commit()
        bound += 1

    return bound
