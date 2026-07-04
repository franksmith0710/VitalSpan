from __future__ import annotations

import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ScheduleCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    catalog_node_id: uuid.UUID = Field(alias="catalogNodeId")
    cron: str = Field(min_length=1, max_length=64)
    timezone: str = Field(default="Asia/Shanghai", max_length=64)


class ScheduleTransitionIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    action: Literal["schedule", "pause", "resume", "cancel"]


class ScheduleStatusOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: uuid.UUID
    catalog_node_id: uuid.UUID = Field(alias="catalogNodeId")
    cron: str
    timezone: str
    status: str
    allowed_actions: list[str] = Field(alias="allowedActions")
