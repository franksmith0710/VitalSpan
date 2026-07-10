from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.chart_view import ChartViewConfig

FilterControlType = Literal["text", "select", "date", "multiselect"]


class FilterOption(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    label: str = Field(min_length=1, max_length=120)
    value: str = Field(min_length=1, max_length=256)


class FilterWidgetConfig(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    filter_id: str = Field(alias="filterId", min_length=1, max_length=64)
    dimension_ref: str = Field(alias="dimensionRef", min_length=1, max_length=128)
    control_type: FilterControlType = Field(default="text", alias="controlType")
    default_value: str | None = Field(default=None, alias="defaultValue")
    options: list[FilterOption] = Field(default_factory=list)
    parameter_key: str | None = Field(default=None, alias="parameterKey", max_length=64)


class LayoutWidget(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: uuid.UUID
    type: Literal["chart", "filter"] = "chart"
    title: str = Field(min_length=1, max_length=120)
    col_span: int = Field(default=6, ge=1, le=12, alias="colSpan")
    row_span: int = Field(default=1, ge=1, le=8, alias="rowSpan")
    order: int = Field(default=0, ge=0)
    chart_config: ChartViewConfig | None = Field(default=None, alias="chartConfig")
    filter_config: FilterWidgetConfig | None = Field(default=None, alias="filterConfig")

    @model_validator(mode="before")
    @classmethod
    def default_type_chart(cls, data: Any) -> Any:
        """Old layouts omit type → treat as chart."""
        if isinstance(data, dict) and data.get("type") is None:
            data = {**data, "type": "chart"}
        return data

    @model_validator(mode="after")
    def require_config_for_type(self) -> LayoutWidget:
        if self.type == "chart" and self.chart_config is None:
            raise ValueError("chart widgets require chartConfig")
        if self.type == "filter" and self.filter_config is None:
            raise ValueError("filter widgets require filterConfig")
        return self


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
