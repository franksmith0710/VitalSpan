from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.datasources.models import Base

VALID_CATEGORY_CODES = frozenset({"CAT-01", "CAT-02", "CAT-03"})

SEED_CATEGORIES = [
    ("CAT-01", "实体生命周期查询类", "entity", "附录 E 实体类"),
    ("CAT-02", "统计分析聚合类", "aggregate", "附录 E 聚合类"),
    ("CAT-03", "地域维度查询类", "geo", "附录 E 地域类"),
]


class CatalogCategory(Base):
    __tablename__ = "catalog_categories"
    code: Mapped[str] = mapped_column(String(16), primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    kind: Mapped[str] = mapped_column(String(32), nullable=False)


class CatalogEntry(Base):
    __tablename__ = "catalog_entries"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    http_method: Mapped[str] = mapped_column(String(8), nullable=False)
    path: Mapped[str] = mapped_column(String(255), nullable=False)
    category_codes: Mapped[list] = mapped_column(JSON, nullable=False)
    openapi_operation_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="draft")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class BusRegistration(Base):
    __tablename__ = "bus_registrations"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    catalog_entry_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("catalog_entries.id", ondelete="CASCADE")
    )
    status: Mapped[str] = mapped_column(String(16), nullable=False)
    trace_id: Mapped[str] = mapped_column(String(64), nullable=False)
    bus_payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
