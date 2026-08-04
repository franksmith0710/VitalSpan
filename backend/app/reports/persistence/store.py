"""Report metadata store factory and test reset."""

from __future__ import annotations

from app.core.config import get_settings
from app.datasources.models import get_meta_engine
from app.reports.persistence import memory_stores
from app.reports.persistence.models import (
    ReportCatalogNode,
    ReportCatalogOwner,
    ReportExtensionConfig,
    ReportExtensionRevision,
    ReportIntegrationExport,
    ReportPrefabBinding,
    ReportTemplateDefinition,
)
from sqlalchemy.orm import Session


def reset_metadata_for_tests() -> None:
    memory_stores.clear_all()
    try:
        with Session(bind=get_meta_engine()) as db:
            db.query(ReportExtensionRevision).delete()
            db.query(ReportExtensionConfig).delete()
            db.query(ReportCatalogOwner).delete()
            db.query(ReportCatalogNode).delete()
            db.query(ReportPrefabBinding).delete()
            db.query(ReportTemplateDefinition).delete()
            db.query(ReportIntegrationExport).delete()
            db.commit()
    except Exception:
        pass


def persistence_store_label() -> str:
    return "db" if get_settings().rpt_metadata_store == "db" else "memory"
