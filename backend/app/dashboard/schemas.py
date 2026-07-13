from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_serializer, model_validator

from app.schemas.chart_view import ChartViewConfigLayout

FilterControlType = Literal["text", "select", "date", "multiselect"]
TextVariant = Literal["markdown", "plain"]
MediaFit = Literal["contain", "cover", "fill"]
WidgetType = Literal["chart", "filter", "text", "media", "tabs"]
CANVAS_WIDTH = 1440
MIN_CANVAS_HEIGHT = 900
PIXEL_COLUMN_WIDTH = 120
MIN_PIXEL_WIDGET_WIDTH = PIXEL_COLUMN_WIDTH
MIN_PIXEL_WIDGET_HEIGHT = 32
_V1_WIDGET_FIELDS = frozenset({"colSpan", "rowSpan", "gridX", "gridY", "col_span", "row_span", "grid_x", "grid_y"})
_V2_WIDGET_FIELDS = frozenset({"x", "y", "width", "height"})


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


class TextWidgetConfig(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    content: str = Field(default="", max_length=8000)
    variant: TextVariant = "plain"


class MediaWidgetConfig(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    url: str = Field(default="", max_length=2048)
    alt: str = Field(default="", max_length=256)
    fit: MediaFit = "contain"


class TabPaneConfig(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: str = Field(min_length=1, max_length=64)
    title: str = Field(min_length=1, max_length=120)
    child_widget_ids: list[str] = Field(default_factory=list, alias="childWidgetIds", max_length=16)


class TabsWidgetConfig(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    tabs_id: str = Field(alias="tabsId", min_length=1, max_length=64)
    panes: list[TabPaneConfig] = Field(min_length=1, max_length=8)
    active_pane_id: str = Field(alias="activePaneId", min_length=1, max_length=64)


class DashboardStyleConfig(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    widget_gap: int | None = Field(default=None, ge=0, le=48, alias="widgetGap")
    canvas_background: str | None = Field(default=None, alias="canvasBackground", max_length=32)


class LayoutWidget(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")
    id: uuid.UUID
    type: WidgetType = "chart"
    title: str = Field(min_length=1, max_length=120)
    col_span: int | None = Field(default=None, ge=1, le=12, alias="colSpan")
    row_span: int | None = Field(default=None, ge=1, le=24, alias="rowSpan")
    grid_x: int | None = Field(default=None, ge=0, le=11, alias="gridX")
    grid_y: int | None = Field(default=None, ge=0, alias="gridY")
    x: int | None = Field(default=None, ge=0)
    y: int | None = Field(default=None, ge=0)
    width: int | None = Field(default=None, ge=MIN_PIXEL_WIDGET_WIDTH)
    height: int | None = Field(default=None, ge=MIN_PIXEL_WIDGET_HEIGHT)
    order: int = Field(default=0, ge=0)
    chart_ref: uuid.UUID | None = Field(default=None, alias="chartRef")
    parent_tabs_id: str | None = Field(default=None, alias="parentTabsId", max_length=64)
    tab_pane_id: str | None = Field(default=None, alias="tabPaneId", max_length=64)
    chart_config: ChartViewConfigLayout | None = Field(default=None, alias="chartConfig")
    filter_config: FilterWidgetConfig | None = Field(default=None, alias="filterConfig")
    text_config: TextWidgetConfig | None = Field(default=None, alias="textConfig")
    media_config: MediaWidgetConfig | None = Field(default=None, alias="mediaConfig")
    tabs_config: TabsWidgetConfig | None = Field(default=None, alias="tabsConfig")

    @model_validator(mode="after")
    def validate_type_config(self) -> LayoutWidget:
        if self.type == "chart":
            if self.chart_config is None:
                raise ValueError("chart widget requires chartConfig")
            for forbidden in (self.filter_config, self.text_config, self.media_config, self.tabs_config):
                if forbidden is not None:
                    raise ValueError("chart widget must not carry non-chart config")
        elif self.type == "filter":
            if self.filter_config is None:
                raise ValueError("filter widget requires filterConfig")
            if self.chart_config is not None:
                raise ValueError("filter widget must not have chartConfig")
        elif self.type == "text":
            if self.text_config is None:
                raise ValueError("text widget requires textConfig")
            if self.chart_config is not None:
                raise ValueError("text widget must not have chartConfig")
        elif self.type == "media":
            if self.media_config is None:
                raise ValueError("media widget requires mediaConfig")
            if self.chart_config is not None:
                raise ValueError("media widget must not have chartConfig")
        elif self.type == "tabs":
            if self.tabs_config is None:
                raise ValueError("tabs widget requires tabsConfig")
            if self.chart_config is not None:
                raise ValueError("tabs widget must not have chartConfig")
            pane_ids = {p.id for p in self.tabs_config.panes}
            if self.tabs_config.active_pane_id not in pane_ids:
                raise ValueError("activePaneId must reference a pane id")
        return self

    @model_validator(mode="before")
    @classmethod
    def default_type_chart(cls, data: Any) -> Any:
        """Old layouts omit type → treat as chart."""
        if isinstance(data, dict) and data.get("type") is None:
            data = {**data, "type": "chart"}
        return data

    @model_validator(mode="after")
    def validate_grid_bounds(self) -> LayoutWidget:
        if (
            self.grid_x is not None
            and self.col_span is not None
            and self.grid_x + self.col_span > 12
        ):
            raise ValueError("gridX + colSpan must not exceed 12")
        return self


class DashboardCanvas(BaseModel):
    model_config = ConfigDict(extra="forbid")
    width: Literal[1440] = CANVAS_WIDTH
    height: int = Field(default=MIN_CANVAS_HEIGHT, ge=MIN_CANVAS_HEIGHT)


class DashboardLayout(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")
    version: Literal[1, 2] = 1
    canvas: DashboardCanvas | None = None
    widgets: list[LayoutWidget] = Field(default_factory=list, max_length=32)
    global_filters: list[Any] = Field(default_factory=list, alias="globalFilters", max_length=16)
    style_config: DashboardStyleConfig | None = Field(default=None, alias="styleConfig")

    @model_validator(mode="before")
    @classmethod
    def validate_versioned_input(cls, data: Any) -> Any:
        if not isinstance(data, dict) or data.get("version", 1) not in (1, 2):
            return data
        version = data.get("version", 1)
        normalized = dict(data)
        normalized_widgets: list[Any] = []
        for raw_widget in data.get("widgets", []):
            if not isinstance(raw_widget, dict):
                normalized_widgets.append(raw_widget)
                continue
            widget = dict(raw_widget)
            keys = set(widget)
            forbidden = _V2_WIDGET_FIELDS if version == 1 else _V1_WIDGET_FIELDS
            mixed = sorted(keys & forbidden)
            if mixed:
                raise ValueError(
                    f"version {version} widgets must not use fields: {', '.join(mixed)}"
                )
            if version == 1:
                if not keys & {"colSpan", "col_span"}:
                    widget["colSpan"] = 6
                if not keys & {"rowSpan", "row_span"}:
                    widget["rowSpan"] = 1
            normalized_widgets.append(widget)
        normalized["widgets"] = normalized_widgets
        return normalized

    @model_validator(mode="after")
    def validate_versioned_bounds(self) -> DashboardLayout:
        if self.version == 1:
            if self.canvas is not None:
                raise ValueError("version 1 layout must not define canvas")
            return self
        if self.canvas is None:
            raise ValueError("version 2 layout requires canvas")
        for widget in self.widgets:
            if None in (widget.x, widget.y, widget.width, widget.height):
                raise ValueError("version 2 widgets require x, y, width and height")
            if widget.x + widget.width > self.canvas.width:
                raise ValueError("x + width must not exceed canvas width")
            if widget.y + widget.height > self.canvas.height:
                raise ValueError("y + height must not exceed canvas height")
        return self

    @model_serializer(mode="wrap")
    def serialize_versioned_layout(self, handler: Any) -> dict[str, Any]:
        data = handler(self)
        forbidden = _V2_WIDGET_FIELDS if self.version == 1 else _V1_WIDGET_FIELDS
        for widget in data["widgets"]:
            for field in forbidden:
                widget.pop(field, None)
        if self.version == 1:
            data.pop("canvas", None)
        return data

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
