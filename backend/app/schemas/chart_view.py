from __future__ import annotations

import uuid
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator


class ChartViewError(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        status: int = 422,
        fields: list[dict[str, str]] | None = None,
    ) -> None:
        self.code = code
        self.message = message
        self.status = status
        self.fields = fields or []
        super().__init__(message)


ChartTypeL1 = Literal["table", "line", "bar"]
StyleVariantL1 = Literal["default"]


class ChartFieldRef(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    field: str = Field(min_length=1, max_length=128)
    label: str | None = Field(default=None, max_length=128)


class ChartFilterRef(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    field: str = Field(min_length=1, max_length=128)
    operator: Literal["eq", "neq", "gt", "gte", "lt", "lte", "in"] = "eq"
    value: str | int | float | bool | list[str]


class ChartViewConfig(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    chart_type: ChartTypeL1 = Field(alias="chartType")
    style_variant: StyleVariantL1 = Field(default="default", alias="styleVariant")
    data_source_id: uuid.UUID | None = Field(default=None, alias="dataSourceId")
    binding_id: uuid.UUID | None = Field(default=None, alias="bindingId")
    chart_id: uuid.UUID | None = Field(default=None, alias="chartId")
    mode: Literal["sql", "table"] | None = None
    sql: str | None = None
    schema_name: str | None = Field(default=None, alias="schema")
    table_name: str | None = Field(default=None, alias="table")
    dimensions: list[ChartFieldRef] = Field(default_factory=list, max_length=8)
    metrics: list[ChartFieldRef] = Field(default_factory=list, max_length=8)
    filters: list[ChartFilterRef] = Field(default_factory=list, max_length=16)

    @model_validator(mode="after")
    def validate_l1_rules(self) -> ChartViewConfig:
        if self.chart_type not in ("table", "line", "bar"):
            raise ValueError("CHART_INVALID_TYPE:Unsupported chartType")
        inline = [self.mode, self.sql, self.schema_name, self.table_name, self.data_source_id]
        if self.binding_id is not None and any(v is not None for v in inline):
            raise ValueError("CHART_BINDING_CONFLICT:bindingId conflicts with inline fields")
        if self.binding_id is None:
            if self.data_source_id is None:
                raise ValueError("CHART_MISSING_DATASOURCE:dataSourceId is required")
            if self.mode == "sql" and not self.sql:
                raise ValueError("CHART_MISSING_SQL:sql is required for sql mode")
            if self.mode == "table" and (not self.schema_name or not self.table_name):
                raise ValueError("CHART_MISSING_TABLE:schema and table are required for table mode")
            if self.mode is None:
                raise ValueError("CHART_MISSING_MODE:mode is required when bindingId is absent")
        if self.chart_type in ("line", "bar"):
            if not self.dimensions or not self.metrics:
                raise ValueError(
                    "CHART_MISSING_SERIES:dimensions and metrics are required for line/bar",
                )
        return self


def _loc_to_field(loc: tuple[object, ...]) -> str:
    parts: list[str] = []
    for item in loc:
        if item == "chart_type":
            parts.append("chartType")
        elif item == "data_source_id":
            parts.append("dataSourceId")
        elif isinstance(item, str):
            parts.append(item)
        elif isinstance(item, int):
            parts[-1] = f"{parts[-1]}[{item}]" if parts else str(item)
    if not parts:
        return "config"
    # Collapse indexed list paths (e.g. dimensions[0].field → dimensions)
    root = parts[0].split("[", 1)[0]
    return root


def _series_missing_fields(text: str) -> list[dict[str, str]]:
    return [
        {"field": "dimensions", "message": text},
        {"field": "metrics", "message": text},
    ]


def _map_validation_error(exc: ValidationError) -> ChartViewError:
    fields: list[dict[str, str]] = []
    code = "CHART_INVALID"
    message = "Invalid chart config"
    for err in exc.errors():
        msg = str(err.get("msg", "Invalid chart config"))
        if msg.startswith("Value error, "):
            msg = msg.removeprefix("Value error, ")
        loc = err.get("loc", ())
        if err.get("type") == "literal_error" and loc == ("chartType",):
            return ChartViewError("CHART_INVALID_TYPE", "Unsupported chartType", 422)
        if msg.startswith("CHART_") and ":" in msg:
            err_code, text = msg.split(":", 1)
            code = err_code
            message = text
            if err_code == "CHART_MISSING_SERIES":
                fields.extend(_series_missing_fields(text))
            else:
                field_name = _loc_to_field(tuple(loc))
                fields.append({"field": field_name, "message": text})
            continue
        field_name = _loc_to_field(tuple(loc))
        fields.append({"field": field_name, "message": msg})
    if fields:
        return ChartViewError(code, message, 422, fields)
    return ChartViewError(code, message, 422, fields)


def validate_chart_view_config(data: dict[str, Any]) -> ChartViewConfig:
    try:
        return ChartViewConfig.model_validate(data)
    except ValidationError as exc:
        raise _map_validation_error(exc) from exc
