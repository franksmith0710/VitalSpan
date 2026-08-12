"""官方演示包 Dataset 预置（对标 DataEase「数据准备 → 【官方示例】」）。"""

from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.metadata.dataset.models import DatasetRecord

DEMO_DATASET_PREFIX = "demo-"
DEMO_DATASET_DISPLAY_PREFIX = "【官方示例】"

DEMO_DATASET_SPECS: tuple[dict[str, Any], ...] = (
    {
        "dataset_id": "demo-sales-wide",
        "display_name": "【官方示例】区域销售宽表",
        "tables": [{"name": "de_sales_wide"}],
    },
    {
        "dataset_id": "demo-sales-detail",
        "display_name": "【官方示例】销售明细",
        "tables": [{"name": "sales"}],
    },
    {
        "dataset_id": "demo-orders",
        "display_name": "【官方示例】订单明细",
        "tables": [{"name": "orders"}, {"name": "order_items"}],
    },
    {
        "dataset_id": "demo-daily-kpi",
        "display_name": "【官方示例】日度 KPI",
        "tables": [{"name": "daily_kpi"}],
    },
    {
        "dataset_id": "demo-gov-service",
        "display_name": "【官方示例】政务服务指标",
        "tables": [{"name": "gov_service_metrics"}],
    },
    {
        "dataset_id": "demo-gov-grid-stats",
        "display_name": "【官方示例】网格事件统计",
        "tables": [{"name": "gov_grid_stats"}],
    },
    {
        "dataset_id": "demo-gov-incidents",
        "display_name": "【官方示例】事件类型统计",
        "tables": [{"name": "gov_incidents"}],
    },
    {
        "dataset_id": "demo-gov-region-service",
        "display_name": "【官方示例】区域服务量",
        "tables": [{"name": "v_gov_region_service"}],
    },
    {
        "dataset_id": "demo-gov-hotwords",
        "display_name": "【官方示例】政务热词",
        "tables": [{"name": "gov_hotwords"}],
    },
    {
        "dataset_id": "demo-gov-issues",
        "display_name": "【官方示例】问题台账",
        "tables": [{"name": "gov_issues"}],
    },
    {
        "dataset_id": "demo-gov-budget",
        "display_name": "【官方示例】财政支出",
        "tables": [{"name": "gov_budget_items"}],
    },
    {
        "dataset_id": "demo-gov-investment",
        "display_name": "【官方示例】产业投资",
        "tables": [{"name": "gov_investment"}],
    },
    {
        "dataset_id": "demo-v-sales-geo",
        "display_name": "【官方示例】销售地理分布",
        "tables": [{"name": "v_sales_geo"}],
    },
)

DEMO_DATASET_IDS: frozenset[str] = frozenset(spec["dataset_id"] for spec in DEMO_DATASET_SPECS)


def is_demo_package_dataset(dataset_id: str | None, display_name: str | None = None) -> bool:
    did = (dataset_id or "").lower()
    if did.startswith(DEMO_DATASET_PREFIX):
        return True
    return (display_name or "").startswith(DEMO_DATASET_DISPLAY_PREFIX)


def seed_demo_datasets(db: Session) -> int:
    """幂等 upsert 官方示例 Dataset（绑定 sample_db 表/视图名）。"""
    upserted = 0
    for spec in DEMO_DATASET_SPECS:
        row = db.get(DatasetRecord, spec["dataset_id"])
        if row is None:
            db.add(
                DatasetRecord(
                    dataset_id=spec["dataset_id"],
                    display_name=spec["display_name"],
                    tables=list(spec["tables"]),
                    computed_fields=[],
                    allowed_roles=["analyst", "viewer"],
                    bound_config_id=None,
                ),
            )
            upserted += 1
        else:
            row.display_name = spec["display_name"]
            row.tables = list(spec["tables"])
            row.allowed_roles = ["analyst", "viewer"]
    db.commit()
    return upserted


def resolve_demo_dataset_ids(db: Session) -> list[str]:
    rows = db.scalars(
        select(DatasetRecord.dataset_id).where(
            DatasetRecord.dataset_id.in_(DEMO_DATASET_IDS),
        ),
    ).all()
    return list(rows)
