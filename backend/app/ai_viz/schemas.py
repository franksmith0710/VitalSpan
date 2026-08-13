from __future__ import annotations

import uuid
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class AiVizManifestIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(min_length=2, max_length=64)
    display_name: str = Field(alias="displayName", min_length=1, max_length=120)
    version: str = Field(default="1.0.0", max_length=32)
    entry: str = Field(default="index.html", max_length=128)
    field_slots: dict[str, Any] | None = Field(default=None, alias="fieldSlots")
    style_schema: dict[str, Any] | None = Field(default=None, alias="styleSchema")
    default_style: dict[str, Any] | None = Field(default=None, alias="defaultStyle")


class AiVizArtifactCreateIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    manifest: AiVizManifestIn
    files: dict[str, str] = Field(min_length=1)


class AiVizArtifactOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    artifact_id: uuid.UUID = Field(alias="artifactId")
    manifest: dict[str, Any]
    status: str
    content_hash: str = Field(alias="contentHash")


class AiVizArtifactListOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    items: list[AiVizArtifactOut]
