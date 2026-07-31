"""内置模板演示数据源绑定（sample_db / demo-mysql）。"""

from __future__ import annotations

import copy
import logging
import uuid
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlparse

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.datasources.dialects.mysql import MysqlConnector
from app.datasources.models import DataSource
from app.datasources.schemas import DataSourceCreate
from app.datasources.service import create_data_source
from app.viz.migrate_chart_types import migrate_layout_chart_configs

logger = logging.getLogger(__name__)

TEMPLATE_DEMO_DATASOURCE_REF = "__demo:sample_db__"
OFFICIAL_DEMO_DATASOURCE_CODE = "official-demo-mysql"

_DEFAULT_HOST = "127.0.0.1"
_DEFAULT_PORT = 3307
_DEFAULT_DATABASE = "sample_db"
_DEFAULT_USERNAME = "sample"
_DEFAULT_PASSWORD = "sample"


@dataclass(frozen=True)
class SampleMysqlConnection:
    host: str
    port: int
    database: str
    username: str
    password: str


def _parse_sample_mysql_url(raw: str) -> SampleMysqlConnection | None:
    parsed = urlparse(raw.strip())
    if parsed.scheme not in {"mysql", "mysql+pymysql"}:
        return None
    host = parsed.hostname or _DEFAULT_HOST
    port = parsed.port or _DEFAULT_PORT
    database = (parsed.path or "").lstrip("/") or _DEFAULT_DATABASE
    username = parsed.username or _DEFAULT_USERNAME
    password = parsed.password or _DEFAULT_PASSWORD
    return SampleMysqlConnection(host, port, database, username, password)


def resolve_official_demo_connection() -> SampleMysqlConnection:
    settings = get_settings()
    if settings.sample_mysql_url:
        parsed = _parse_sample_mysql_url(settings.sample_mysql_url)
        if parsed is not None:
            return parsed
    return SampleMysqlConnection(
        _DEFAULT_HOST,
        _DEFAULT_PORT,
        _DEFAULT_DATABASE,
        _DEFAULT_USERNAME,
        _DEFAULT_PASSWORD,
    )


def _can_connect_sample_mysql(conn: SampleMysqlConnection) -> bool:
    connector = MysqlConnector()
    try:
        result = connector.test_connection(
            host=conn.host,
            port=conn.port,
            database=conn.database,
            username=conn.username,
            password=conn.password,
            timeout_sec=3.0,
        )
        return bool(result.ok)
    except Exception:
        return False


def resolve_sample_db_datasource_id(db: Session) -> uuid.UUID | None:
    official = db.scalar(
        select(DataSource.id).where(
            DataSource.code == OFFICIAL_DEMO_DATASOURCE_CODE,
            DataSource.deleted_at.is_(None),
        ),
    )
    if official is not None:
        return official

    rows = db.scalars(select(DataSource).where(DataSource.deleted_at.is_(None))).all()
    best_score = 0
    best_id: uuid.UUID | None = None
    for row in rows:
        db_name = (row.database or "").lower()
        code = (row.code or "").lower()
        name = (row.name or "").lower()
        score = 0
        if code == OFFICIAL_DEMO_DATASOURCE_CODE:
            score += 20
        if db_name == "sample_db":
            score += 10
        elif "sample_db" in db_name:
            score += 6
        if code == "sample-mysql":
            score += 4
        elif "sample-mysql" in code or "demo-mysql" in code:
            score += 3
        elif "sample" in f"{code} {name}":
            score += 1
        if row.port == 3307:
            score += 2
        if row.type and row.type.lower() == "mysql" and score > 0:
            score += 1
        if score > best_score:
            best_score = score
            best_id = row.id
    return best_id


def ensure_official_demo_datasource(db: Session) -> uuid.UUID | None:
    """幂等创建/确认官方演示 MySQL 连接；sample-mysql 不可达时 skip。"""
    official = db.scalar(
        select(DataSource.id).where(
            DataSource.code == OFFICIAL_DEMO_DATASOURCE_CODE,
            DataSource.deleted_at.is_(None),
        ),
    )
    if official is not None:
        return official

    conn = resolve_official_demo_connection()
    if not _can_connect_sample_mysql(conn):
        logger.info("official_demo_datasource_skip unreachable host=%s port=%s", conn.host, conn.port)
        return resolve_sample_db_datasource_id(db)

    try:
        out = create_data_source(
            db,
            DataSourceCreate(
                name="官方演示库 (sample_db)",
                code=OFFICIAL_DEMO_DATASOURCE_CODE,
                type="mysql",
                host=conn.host,
                port=conn.port,
                database=conn.database,
                username=conn.username,
                password=conn.password,
                description="VitalSpan 官方可视化模板演示数据源（对标 DataEase 内置样例库）",
            ),
        )
        logger.info("official_demo_datasource_created id=%s", out.id)
        return out.id
    except Exception:
        logger.warning("official_demo_datasource_create_failed", exc_info=True)
        return resolve_sample_db_datasource_id(db)


def repair_legacy_template_layout(layout: dict[str, Any]) -> dict[str, Any]:
    """修复存量内置模板中的非法 styleConfig / 演示数据源占位。"""
    cloned = copy.deepcopy(layout)
    style = cloned.get("styleConfig")
    if isinstance(style, dict):
        if style.get("gapPreset") == "comfortable":
            style["gapPreset"] = "md"
        chart_style = style.pop("chartStyle", None)
        if chart_style and "chartLabelStyle" not in style:
            label_color = chart_style.get("labelColor") or chart_style.get("color")
            if label_color:
                style["chartLabelStyle"] = {"color": label_color}
        style.pop("gap", None)
        style.pop("padding", None)

    widgets = cloned.get("widgets")
    if not isinstance(widgets, list):
        return cloned
    for widget in widgets:
        if not isinstance(widget, dict) or widget.get("type") != "chart":
            continue
        chart_cfg = widget.get("chartConfig")
        if not isinstance(chart_cfg, dict):
            continue
        if chart_cfg.get("dataSourceId") == TEMPLATE_DEMO_DATASOURCE_REF:
            chart_cfg.pop("dataSourceId", None)
    return migrate_layout_chart_configs(cloned)


def layout_requires_demo_datasource(layout: dict[str, Any]) -> bool:
    widgets = layout.get("widgets")
    if not isinstance(widgets, list):
        return False
    for widget in widgets:
        if not isinstance(widget, dict) or widget.get("type") != "chart":
            continue
        chart_cfg = widget.get("chartConfig")
        if not isinstance(chart_cfg, dict):
            continue
        if chart_cfg.get("bindingId"):
            continue
        if chart_cfg.get("mode") in ("sql", "table", None):
            return True
    return False


def bind_template_demo_datasources(
    layout: dict[str, Any],
    datasource_id: uuid.UUID | None,
) -> dict[str, Any]:
    if datasource_id is None:
        return layout
    cloned = copy.deepcopy(layout)
    widgets = cloned.get("widgets")
    if not isinstance(widgets, list):
        return cloned
    ds = str(datasource_id)
    for widget in widgets:
        if not isinstance(widget, dict) or widget.get("type") != "chart":
            continue
        chart_cfg = widget.get("chartConfig")
        if not isinstance(chart_cfg, dict):
            continue
        current = chart_cfg.get("dataSourceId")
        if current in (None, "", TEMPLATE_DEMO_DATASOURCE_REF):
            chart_cfg["dataSourceId"] = ds
    return cloned
