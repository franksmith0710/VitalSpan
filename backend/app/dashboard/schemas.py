from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.chart_view import ChartViewConfig


class LayoutWidget(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: uuid.UUID
    type: Literal["chart"] = "chart"
    title: str = Field(min_length=1, max_length=120)
    col_span: Literal[4, 6, 8, 12] = Field(alias="colSpan")
    row_span: int = Field(default=1, ge=1, le=8, alias="rowSpan")
    order: int = Field(default=0, ge=0)
    chart_config: ChartViewConfig | None = Field(default=None, alias="chartConfig")


class DashboardLayout(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    version: Literal[1] = 1
    widgets: list[LayoutWidget] = Field(default_factory=list, max_length=32)
    global_filters: list[Any] = Field(default_factory=list, alias="globalFilters", max_length=16)


class DashboardCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    name: str = Field(min_length=1, max_length=120)
    slug: str | None = Field(default=None, max_length=64)
    description: str | None = Field(default=None, max_length=2000)


class DashboardUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=2000)


class DashboardLayoutUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    layout_json: dict[str, Any] = Field(alias="layoutJson")


class DashboardOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)
    id: uuid.UUID
    name: str
    slug: str
    description: str | None = None
    layout_json: dict[str, Any] = Field(alias="layoutJson")
    created_by: uuid.UUID | None = Field(default=None, alias="createdBy")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class DashboardListResponse(BaseModel):
    items: list[DashboardOut]
    total: int
    limit: int
    offset: int
