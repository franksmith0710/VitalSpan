"""Dev-only report demo seed (G3): datasource + template + equipment + prefab + schedule."""

from __future__ import annotations

import logging
import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.auth.deps import UserContext
from app.dashboard.templates.demo_datasource import resolve_sample_db_datasource_id
from app.datasources.credentials import decrypt_credential
from app.datasources.dialects.mysql import MysqlConnector
from app.datasources.models import DataSource
from app.datasources.schemas import DataSourceCreate
from app.datasources.service import create_data_source
from app.metadata.entity import service as entity_service
from app.metadata.entity.errors import EntityTypeError
from app.metadata.entity.schemas import EntityTypeCreate
from app.metadata.physical import service as physical_service
from app.metadata.physical.errors import PhysicalTableError
from app.metadata.physical.schemas import PhysicalTableRegisterFromSchemaIn
from app.reports.catalog import service as catalog_service
from app.reports.catalog.schemas import CatalogNodeCreate
from app.reports.extension.schemas import ExtensionConfigUpsert, MetricAdjustment
from app.reports.extension import service as extension_service
from app.reports.prefab.seed import seed_builtin_prefab_bindings
from app.reports.scheduler import service as scheduler_service
from app.reports.scheduler.schemas import ScheduleCreate, ScheduleRecipientIn
from app.reports.templates.schemas import TemplateBlock, TemplateDefinitionIn
from app.reports.templates import service as template_service

logger = logging.getLogger(__name__)

_DEMO_TEMPLATE_KEY = "dev_demo_report"
_DEMO_FOLDER_NAME = "演示报表"
_EQUIPMENT_FQN = "ops.equipment"
_ADMIN = UserContext(id="dev-seed", username="admin", roles=["admin"])


def _resolve_or_create_datasource(session: Session) -> uuid.UUID | None:
    existing = resolve_sample_db_datasource_id(session)
    if existing is not None:
        return existing
    try:
        out = create_data_source(
            session,
            DataSourceCreate(
                name="Sample MySQL (dev seed)",
                code="sample-mysql-dev",
                type="mysql",
                host="127.0.0.1",
                port=3307,
                database="sample_db",
                username="sample",
                password="sample",
                description="Auto-created by DEV_REPORT_SEED",
            ),
        )
        return out.id
    except Exception:
        logger.warning("report_dev_seed_datasource_skip", exc_info=True)
        return None


def _ensure_equipment_table(session: Session, ds_id: uuid.UUID) -> bool:
    row = session.get(DataSource, ds_id)
    if row is None or (row.type or "").lower() != "mysql":
        return False
    try:
        password = decrypt_credential(row.password_encrypted)
    except Exception:
        return False
    ddl = """
    CREATE TABLE IF NOT EXISTS equipment (
      id INT PRIMARY KEY AUTO_INCREMENT,
      status VARCHAR(32) NOT NULL,
      region VARCHAR(64) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """
    seed_sql = """
    INSERT INTO equipment (status, region)
    SELECT * FROM (
      SELECT 'running' AS status, '华东' AS region UNION ALL
      SELECT 'idle', '华北' UNION ALL
      SELECT 'maintenance', '华南'
    ) AS seed_rows
    WHERE NOT EXISTS (SELECT 1 FROM equipment LIMIT 1)
    """
    connector = MysqlConnector()
    try:
        conn = connector.open_connection(
            host=row.host,
            port=row.port,
            database=row.database or "sample_db",
            username=row.username,
            password=password,
        )
        with conn.cursor() as cur:
            cur.execute(ddl)
            cur.execute(seed_sql)
        conn.commit()
        conn.close()
        return True
    except Exception:
        logger.warning("report_dev_seed_equipment_ddl_skip", exc_info=True)
        return False


def _seed_equipment_entity(session: Session, ds_id: uuid.UUID, actor: UserContext) -> int:
    if _EQUIPMENT_FQN in physical_service._store:
        return 0
    try:
        entity_service.get_entity_type("equipment")
    except EntityTypeError:
        entity_service.create_entity_type(
            EntityTypeCreate(typeCode="equipment", displayName="设备", attributes=[], lifecycleStates=[]),
        )
    if not _ensure_equipment_table(session, ds_id):
        return 0
    try:
        physical_service.register_from_schema(
            session,
            actor.roles,
            PhysicalTableRegisterFromSchemaIn(
                dataSourceId=ds_id,
                schema="sample_db",
                table="equipment",
                displayName="设备表",
                entityTypeCode="equipment",
                tableFqn=_EQUIPMENT_FQN,
            ),
            actor,
        )
        return 1
    except PhysicalTableError as exc:
        if exc.code == "META_PHYSICAL_DS_TABLE_CONFLICT":
            return 0
        logger.warning("report_dev_seed_equipment_register_skip", exc_info=True)
        return 0


def _find_demo_node_id() -> uuid.UUID | None:
    for raw in catalog_service._nodes.values():
        if raw.get("template_key") == _DEMO_TEMPLATE_KEY:
            return uuid.UUID(str(raw["id"]))
    return None


def _seed_demo_template(actor: UserContext) -> tuple[int, uuid.UUID | None]:
    existing = _find_demo_node_id()
    if existing is not None:
        return 0, existing
    template_service.upsert_template_definition(
        TemplateDefinitionIn(
            templateKey=_DEMO_TEMPLATE_KEY,
            format="pdf",
            displayName="演示销售报表",
            blocks=[TemplateBlock(blockType="table", tableRef="sales")],
        ),
        actor,
    )
    folder_id = None
    for raw in catalog_service._nodes.values():
        if raw.get("name") == _DEMO_FOLDER_NAME and raw.get("node_type") == "folder":
            folder_id = raw["id"]
            break
    if folder_id is None:
        folder = catalog_service.create_node(
            CatalogNodeCreate(name=_DEMO_FOLDER_NAME, nodeType="folder"),
            actor,
        )
        folder_id = folder.id
    node = catalog_service.create_node(
        CatalogNodeCreate(
            name="演示销售报表",
            parentId=folder_id,
            nodeType="template",
            templateKind="pdf",
            templateKey=_DEMO_TEMPLATE_KEY,
        ),
        actor,
    )
    extension_service.upsert(
        node.id,
        ExtensionConfigUpsert(
            catalogNodeId=node.id,
            metrics=[
                MetricAdjustment(
                    key="sales_total",
                    label="销售总额",
                    expression="SELECT SUM(amount) AS sales_total FROM sales",
                    visible=True,
                ),
            ],
            filters=[],
            changeNote="dev seed",
        ),
        actor,
    )
    return 1, node.id


def _seed_demo_schedule(node_id: uuid.UUID, actor: UserContext) -> int:
    for row in scheduler_service._schedules.values():
        if row.get("source_id") == node_id or row.get("catalog_node_id") == node_id:
            return 0
    sched = scheduler_service.create_schedule(
        ScheduleCreate(
            catalogNodeId=node_id,
            cron="0 8 * * *",
            recipients=[ScheduleRecipientIn(type="role", value="admin")],
        ),
        actor,
    )
    scheduler_service.transition_schedule(sched.id, "schedule", actor)
    return 1


def seed_dev_reports(session: Session, *, actor: UserContext | None = None) -> dict[str, Any]:
    """幂等 dev seed；返回各步计数。"""
    user = actor or _ADMIN
    counts: dict[str, Any] = {
        "datasource": 0,
        "equipment": 0,
        "template": 0,
        "prefab": 0,
        "schedule": 0,
        "dataSourceId": None,
        "catalogNodeId": None,
    }
    ds_id = _resolve_or_create_datasource(session)
    if ds_id is None:
        logger.warning("report_dev_seed_aborted_no_datasource")
        counts["prefab"] = seed_builtin_prefab_bindings(user)
        return counts
    counts["dataSourceId"] = str(ds_id)
    counts["equipment"] = _seed_equipment_entity(session, ds_id, user)
    tpl_n, node_id = _seed_demo_template(user)
    counts["template"] = tpl_n
    counts["prefab"] = seed_builtin_prefab_bindings(user)
    if node_id is not None:
        counts["catalogNodeId"] = str(node_id)
        counts["schedule"] = _seed_demo_schedule(node_id, user)
    return counts
