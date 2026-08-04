"""ORM models for report metadata persistence (ADR-20)."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, Integer, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.datasources.models import Base


class ReportCatalogNode(Base):
    __tablename__ = "report_catalog_nodes"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, nullable=True, index=True)
    node_type: Mapped[str] = mapped_column(String(16), nullable=False)
    template_kind: Mapped[str | None] = mapped_column(String(16), nullable=True)
    template_key: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class ReportCatalogOwner(Base):
    __tablename__ = "report_catalog_owners"

    node_id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    owner_id: Mapped[str] = mapped_column(String(64), nullable=False)


class ReportExtensionConfig(Base):
    __tablename__ = "report_extension_configs"

    catalog_node_id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    metrics: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    filters: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    change_note: Mapped[str | None] = mapped_column(String(500), nullable=True)
    default_data_source_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, nullable=True)
    revision: Mapped[int] = mapped_column(Integer, nullable=False, default=1)


class ReportExtensionRevision(Base):
    __tablename__ = "report_extension_revisions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    catalog_node_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, index=True)
    revision: Mapped[int] = mapped_column(Integer, nullable=False)
    change_note: Mapped[str | None] = mapped_column(String(500), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ReportPrefabBinding(Base):
    __tablename__ = "report_prefab_bindings"

    binding_key: Mapped[str] = mapped_column(String(64), primary_key=True)
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)


class ReportTemplateDefinition(Base):
    __tablename__ = "report_template_definitions"

    template_key: Mapped[str] = mapped_column(String(64), primary_key=True)
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)


class ReportIntegrationExport(Base):
    __tablename__ = "report_integration_exports"

    export_id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    template_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, index=True)
    fmt: Mapped[str] = mapped_column(String(16), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    storage_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    content_type: Mapped[str | None] = mapped_column(String(128), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    requested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    trace_id: Mapped[str] = mapped_column(String(64), nullable=False, default="")
