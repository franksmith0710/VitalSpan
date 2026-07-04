from __future__ import annotations

import uuid

from pydantic import BaseModel, ConfigDict, Field


class PublishActionOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: uuid.UUID
    status: str


class PublishStatusOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: uuid.UUID
    status: str
    allowed_actions: list[str] = Field(alias="allowedActions")
