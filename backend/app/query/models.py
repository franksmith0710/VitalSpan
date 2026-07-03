from __future__ import annotations

import uuid
from datetime import datetime
from functools import lru_cache

from sqlalchemy import DateTime, Integer, String, Text, Uuid, create_engine, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

from app.core.config import get_settings


class Base(DeclarativeBase):
    pass


class ChartQueryBinding(Base):
    __tablename__ = "chart_query_bindings"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    data_source_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, index=True)
    mode: Mapped[str] = mapped_column(String(16), nullable=False)
    sql: Mapped[str | None] = mapped_column(Text, nullable=True)
    schema_name: Mapped[str | None] = mapped_column(String(64), nullable=True)
    table_name: Mapped[str | None] = mapped_column(String(64), nullable=True)
    default_limit: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    chart_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, nullable=True, unique=True, index=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(Uuid, nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(),
    )


@lru_cache
def get_meta_engine():
    url = get_settings().database_url
    connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}
    return create_engine(url, pool_pre_ping=True, connect_args=connect_args)


def get_meta_session():
    return sessionmaker(bind=get_meta_engine(), autoflush=False, autocommit=False)()
