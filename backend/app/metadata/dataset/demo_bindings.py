"""官方示例 Dataset 自动绑定 dataset_query 配置（图表编辑 Dataset 模式即开即用）。"""

from __future__ import annotations

import copy
import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.dashboard.templates.demo_datasource import (
    TEMPLATE_DEMO_DATASOURCE_REF,
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
    "demo-gov-grid-stats": {
        "table": "gov_grid_stats",
        "columns": ["grid_name", "event_count", "resolved_count"],
    },
    "demo-gov-incidents": {
        "table": "gov_incidents",
        "columns": ["incident_type", "count"],
    },
    "demo-gov-region-service": {
        "table": "v_gov_region_service",
        "columns": ["province", "city", "district", "service_volume"],
    },
    "demo-gov-hotwords": {
        "table": "gov_hotwords",
        "columns": ["word", "weight"],
    },
    "demo-gov-issues": {
        "table": "gov_issues",
        "columns": ["issue_type", "location", "unit", "status", "progress"],
    },
    "demo-gov-budget": {
        "table": "gov_budget_items",
        "columns": ["category", "spent_amount", "fiscal_year"],
    },
    "demo-gov-investment": {
        "table": "gov_investment",
        "columns": ["industry", "investment_amount"],
    },
    "demo-v-sales-geo": {
        "table": "v_sales_geo",
        "columns": ["province", "city", "district", "amount"],
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


def bind_demo_dataset_config_ids(db: Session, layout: dict[str, Any]) -> dict[str, Any]:
    """将官方示例 Dataset 的 bound_config_id 写入 layout（跨环境分享/embed 可复用）。"""
    cloned = copy.deepcopy(layout)
    widgets = cloned.get("widgets")
    if not isinstance(widgets, list):
        return cloned
    demo_ds = resolve_sample_db_datasource_id(db)
    for widget in widgets:
        if not isinstance(widget, dict) or widget.get("type") != "chart":
            continue
        chart_cfg = widget.get("chartConfig")
        if not isinstance(chart_cfg, dict) or chart_cfg.get("mode") != "dataset":
            continue
        dataset_id = chart_cfg.get("datasetId")
        if not dataset_id:
            continue
        row = db.get(DatasetRecord, dataset_id)
        if row is None or row.bound_config_id is None:
            continue
        chart_cfg["configId"] = str(row.bound_config_id)
        if demo_ds is not None:
            chart_cfg["dataSourceId"] = str(demo_ds)
    return cloned


def prepare_chart_config_for_embed(db: Session, chart_config: dict[str, Any]) -> dict[str, Any]:
    """单图 embed：绑定演示数据源与 Dataset configId。"""
    ensure_demo_dataset_bindings(db)
    cfg = copy.deepcopy(chart_config)
    demo_ds = resolve_sample_db_datasource_id(db)
    current = cfg.get("dataSourceId")
    if demo_ds is not None and current in (None, "", TEMPLATE_DEMO_DATASOURCE_REF):
        cfg["dataSourceId"] = str(demo_ds)
    if cfg.get("mode") == "dataset":
        dataset_id = cfg.get("datasetId")
        if dataset_id:
            row = db.get(DatasetRecord, dataset_id)
            if row is not None and row.bound_config_id is not None:
                cfg["configId"] = str(row.bound_config_id)
                if demo_ds is not None:
                    cfg["dataSourceId"] = str(demo_ds)
    return cfg
