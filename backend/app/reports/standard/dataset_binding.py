"""标准分析包 → Dataset + dataset_query 绑定（报表出数经 Dataset execute）。"""

from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.metadata.dataset.models import DatasetRecord
from app.metadata.physical import service as physical_service
from app.query.config_store.schemas import ConfigUpsert
from app.query.config_store.service import upsert_config
from app.reports.standard.schemas import AnalysisPackOut


def _stable_ref_id(pack_key: str) -> uuid.UUID:
    return uuid.uuid5(uuid.NAMESPACE_DNS, f"vitalspan.std-pack.{pack_key}")


def ensure_analysis_pack_dataset_binding(db: Session, pack: AnalysisPackOut) -> uuid.UUID:
    """幂等创建分析包 Dataset 与 dataset_query 配置，返回 bound_config_id。"""
    dataset_id = f"std-pack-{pack.pack_key}"
    pt = physical_service.get_physical_table(pack.physical_table_fqn)
    schema = pt.source_schema or "public"
    table = pt.source_table or pack.physical_table_fqn.split(".")[-1]
    columns = [col.name for col in pt.columns if col.name]

    row = db.get(DatasetRecord, dataset_id)
    if row is None:
        row = DatasetRecord(
            dataset_id=dataset_id,
            display_name=pack.display_name,
            tables=[{"name": f"{schema}.{table}"}],
            computed_fields=[],
            allowed_roles=list(pack.allowed_roles),
            bound_config_id=None,
            table_source_datasource_id=pack.data_source_id,
        )
        db.add(row)
    else:
        row.display_name = pack.display_name
        row.tables = [{"name": f"{schema}.{table}"}]
        row.allowed_roles = list(pack.allowed_roles)
        row.table_source_datasource_id = pack.data_source_id

    if row.bound_config_id is not None:
        db.commit()
        return row.bound_config_id

    record = upsert_config(
        db,
        ConfigUpsert.model_validate(
            {
                "configType": "dataset_query",
                "schemaVersion": "1.0",
                "refType": "dataset",
                "refId": str(_stable_ref_id(pack.pack_key)),
                "payload": {
                    "dataSourceId": str(pack.data_source_id),
                    "connectorType": "mysql",
                    "schema": schema,
                    "table": table,
                    "columns": columns or ["*"],
                    "conditions": {"logic": "AND", "conditions": []},
                    "limit": 1000,
                    "offset": 0,
                },
            },
        ),
    )
    row.bound_config_id = record.id
    db.commit()
    return record.id
