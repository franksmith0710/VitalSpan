from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class RenderRunIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    parameters: dict[str, Any] = Field(default_factory=dict)
    format: Literal["web", "html", "pdf"] = "web"
    data_source_id: uuid.UUID | None = Field(default=None, alias="dataSourceId")


class EngineRenderSpec(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    template_node_id: uuid.UUID = Field(alias="templateNodeId")
    engine_version: str = Field(default="1.0", alias="engineVersion")
    format: str
    sections: list[dict[str, Any]]
    parameters: dict[str, Any]
    rendered_at: datetime = Field(alias="renderedAt")


class RenderRunOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    status: Literal["ready"] = "ready"
    render_spec: EngineRenderSpec = Field(alias="renderSpec")
