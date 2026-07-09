from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.datasources.models import Base


class ViewRoleDefault(Base):
    __tablename__ = "view_role_defaults"

    role_key: Mapped[str] = mapped_column(String(128), primary_key=True)
    dashboard_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, nullable=True)
    report_template_node_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, nullable=True)
    max_widget_count: Mapped[int] = mapped_column(Integer, nullable=False, default=24)
    inherit_from_role_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
