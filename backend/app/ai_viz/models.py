from __future__ import annotations

import re
import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.datasources.models import Base

MAX_BUNDLE_BYTES = 512 * 1024
FORBIDDEN_HTML_PATTERNS = (
    re.compile(r"<script[^>]+src\s*=", re.IGNORECASE),
    re.compile(r"\bon\w+\s*=", re.IGNORECASE),
    re.compile(r"javascript:", re.IGNORECASE),
)


class AiVizArtifact(Base):
    __tablename__ = "ai_viz_artifacts"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    manifest_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    files_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    owner_user_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(),
    )


def validate_bundle_files(files: dict[str, str], entry: str) -> None:
    from app.ai_viz.errors import AiVizError

    if entry not in files:
        raise AiVizError("AIVIZ_MISSING_ENTRY", f"files must include entry {entry!r}", 422)
    total = sum(len(v.encode("utf-8")) for v in files.values())
    if total > MAX_BUNDLE_BYTES:
        raise AiVizError("AIVIZ_BUNDLE_TOO_LARGE", "bundle exceeds 512KB limit", 413)
    for name, content in files.items():
        if not name.endswith((".html", ".css", ".svg")):
            raise AiVizError("AIVIZ_INVALID_FILE", f"unsupported file name: {name}", 422)
        for pattern in FORBIDDEN_HTML_PATTERNS:
            if pattern.search(content):
                raise AiVizError(
                    "AIVIZ_UNSAFE_CONTENT",
                    f"forbidden pattern in {name}",
                    422,
                )
