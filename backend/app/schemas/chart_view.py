from __future__ import annotations

import re
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


ChartTypeL1 = Literal["table", "line", "bar"]  # 文档常量：r28 最小集，registry 为真理源
StyleVariantL1 = Literal["default"]  # 文档常量


class ChartFieldRef(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    field: str = Field(min_length=1, max_length=128)
    label: str | None = Field(default=None, max_length=128)


class ChartFilterRef(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    field: str = Field(min_length=1, max_length=128)
    operator: Literal["eq", "neq", "gt", "gte", "lt", "lte", "in"] = "eq"
    value: str | int | float | bool | list[str]


ChartTimeRangePreset = Literal["last_7d", "last_30d", "last_90d", "mtd", "ytd"]

_EMPTY_UUID_KEYS = ("dataSourceId", "bindingId", "chartId", "configId")


def coerce_chart_config_ids(data: Any) -> Any:
    """FE 草稿常传 \"\"；layout 持久化时视为未配置。"""
    if not isinstance(data, dict):
        return data
    out = dict(data)
    for key in _EMPTY_UUID_KEYS:
        if out.get(key) == "":
            out[key] = None
    return out


class ChartTimeRangeRef(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    enabled: bool = False
    mode: Literal["relative", "absolute"] = "relative"
    field: str | None = Field(default=None, max_length=128)
    relative_preset: ChartTimeRangePreset | None = Field(default=None, alias="relativePreset")
    start: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    end: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")

    @model_validator(mode="after")
    def validate_time_range(self) -> ChartTimeRangeRef:
        if not self.enabled:
            return self
        if self.field is not None and not re.match(r"^[a-zA-Z_][\w]*$", self.field):
            raise ValueError("CHART_INVALID_TIME_FIELD:field must be a valid identifier")
        if self.mode == "relative":
            if self.relative_preset is None:
                raise ValueError("CHART_MISSING_TIME_PRESET:relativePreset is required")
            return self
        if not self.start or not self.end:
            raise ValueError("CHART_MISSING_TIME_BOUNDS:start and end are required for absolute mode")
        if self.start > self.end:
            raise ValueError("CHART_INVALID_TIME_BOUNDS:start must be <= end")
        return self


class ChartViewConfig(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    chart_type: str = Field(alias="chartType")
    style_variant: str = Field(default="default", alias="styleVariant")
    data_source_id: uuid.UUID | None = Field(default=None, alias="dataSourceId")
    binding_id: uuid.UUID | None = Field(default=None, alias="bindingId")
    chart_id: uuid.UUID | None = Field(default=None, alias="chartId")
    mode: Literal["sql", "table", "native", "dataset"] | None = None
    sql: str | None = None
    schema_name: str | None = Field(default=None, alias="schema")
    table_name: str | None = Field(default=None, alias="table")
    config_id: uuid.UUID | None = Field(default=None, alias="configId")
    dataset_id: str | None = Field(default=None, alias="datasetId", max_length=64)
    native_body: dict[str, Any] | None = Field(default=None, alias="nativeBody")
    index: str | None = None
    dimensions: list[ChartFieldRef] = Field(default_factory=list, max_length=8)
    metrics: list[ChartFieldRef] = Field(default_factory=list, max_length=8)
    filters: list[ChartFilterRef] = Field(default_factory=list, max_length=16)
    time_range: ChartTimeRangeRef | None = Field(default=None, alias="timeRange")

    @model_validator(mode="before")
    @classmethod
    def coerce_optional_ids(cls, data: Any) -> Any:
        return coerce_chart_config_ids(data)

    @model_validator(mode="after")
    def validate_l1_rules(self) -> ChartViewConfig:
        from app.viz.registry import ChartTypeNotRegistered, get_spec

        try:
            spec = get_spec(self.chart_type)
        except ChartTypeNotRegistered as exc:
            raise ValueError("CHART_INVALID_TYPE:Unsupported chartType") from exc

        if self.style_variant not in spec.style_variants:
            raise ValueError(
                "CHART_INVALID_STYLE_VARIANT:"
                f"styleVariant '{self.style_variant}' is not valid for {self.chart_type}"
            )

        inline = [self.mode, self.sql, self.schema_name, self.table_name, self.data_source_id]
        if self.binding_id is not None and any(v is not None for v in inline):
            raise ValueError("CHART_BINDING_CONFLICT:bindingId conflicts with inline fields")
        if self.binding_id is None:
            if self.data_source_id is None:
                raise ValueError("CHART_MISSING_DATASOURCE:dataSourceId is required")
            if self.mode == "native":
                if not self.native_body:
                    raise ValueError("CHART_MISSING_NATIVE_BODY:nativeBody is required for native mode")
                if self.sql:
                    raise ValueError("CHART_NATIVE_SQL_DISGUISE:sql is not allowed in native mode")
            if self.mode == "sql" and not self.sql:
                raise ValueError("CHART_MISSING_SQL:sql is required for sql mode")
            if self.mode == "sql" and self.sql:
                from app.query.readonly import assert_readonly_sql
                from app.query.schemas import QueryError

                try:
                    assert_readonly_sql(self.sql)
                except QueryError as exc:
                    raise ValueError(f"CHART_SQL_NOT_READONLY:{exc.message}") from exc
            if self.mode == "table" and (not self.schema_name or not self.table_name):
                raise ValueError("CHART_MISSING_TABLE:schema and table are required for table mode")
            if self.mode == "dataset":
                if self.config_id is None:
                    raise ValueError("CHART_MISSING_CONFIG_ID:configId is required for dataset mode")
            elif self.mode is None:
                raise ValueError("CHART_MISSING_MODE:mode is required when bindingId is absent")

        if self.binding_id is not None:
            return self
        if self.chart_type in ("line", "bar"):
            if not self.dimensions or not self.metrics:
                raise ValueError(
                    "CHART_MISSING_SERIES:dimensions and metrics are required for line/bar",
                )
            return self
        rule = spec.field_rule
        dim_n = len(self.dimensions)
        met_n = len(self.metrics)
        note = f" {rule.note}" if rule.note else ""
        if not (rule.min_dimensions <= dim_n <= rule.max_dimensions):
            raise ValueError(
                "CHART_FIELD_REQUIREMENT:"
                f"{self.chart_type} requires {rule.min_dimensions}-{rule.max_dimensions} "
                f"dimensions, got {dim_n}.{note}"
            )
        if not (rule.min_metrics <= met_n <= rule.max_metrics):
            raise ValueError(
                "CHART_FIELD_REQUIREMENT:"
                f"{self.chart_type} requires {rule.min_metrics}-{rule.max_metrics} "
                f"metrics, got {met_n}.{note}"
            )
        return self


class ChartViewConfigLayout(BaseModel):
    """看板 layout 持久化用：允许未绑定数据源的草稿 widget（对标 DE 草稿保存）。"""

    model_config = ConfigDict(populate_by_name=True)
    chart_type: str = Field(alias="chartType")
    style_variant: str = Field(default="default", alias="styleVariant")
    data_source_id: uuid.UUID | None = Field(default=None, alias="dataSourceId")
    binding_id: uuid.UUID | None = Field(default=None, alias="bindingId")
    chart_id: uuid.UUID | None = Field(default=None, alias="chartId")
    mode: Literal["sql", "table", "native", "dataset"] | None = None
    sql: str | None = None
    schema_name: str | None = Field(default=None, alias="schema")
    table_name: str | None = Field(default=None, alias="table")
    config_id: uuid.UUID | None = Field(default=None, alias="configId")
    dataset_id: str | None = Field(default=None, alias="datasetId", max_length=64)
    native_body: dict[str, Any] | None = Field(default=None, alias="nativeBody")
    index: str | None = None
    dimensions: list[ChartFieldRef] = Field(default_factory=list, max_length=8)
    metrics: list[ChartFieldRef] = Field(default_factory=list, max_length=8)
    filters: list[ChartFilterRef] = Field(default_factory=list, max_length=16)
    time_range: ChartTimeRangeRef | None = Field(default=None, alias="timeRange")

    @model_validator(mode="before")
    @classmethod
    def coerce_optional_ids(cls, data: Any) -> Any:
        return coerce_chart_config_ids(data)

    @model_validator(mode="after")
    def validate_layout_shell(self) -> ChartViewConfigLayout:
        from app.viz.registry import ChartTypeNotRegistered, get_spec

        try:
            spec = get_spec(self.chart_type)
        except ChartTypeNotRegistered as exc:
            raise ValueError("CHART_INVALID_TYPE:Unsupported chartType") from exc

        if self.style_variant not in spec.style_variants:
            raise ValueError(
                "CHART_INVALID_STYLE_VARIANT:"
                f"styleVariant '{self.style_variant}' is not valid for {self.chart_type}"
            )
        return self


def validate_chart_view_config_layout(data: dict[str, Any]) -> ChartViewConfigLayout:
    try:
        return ChartViewConfigLayout.model_validate(data)
    except ValidationError as exc:
        raise _map_validation_error(exc) from exc


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


_CODE_FIELD_HINTS: dict[str, list[str]] = {
    "CHART_MISSING_DATASOURCE": ["dataSourceId"],
    "CHART_MISSING_SQL": ["sql"],
    "CHART_MISSING_TABLE": ["schema", "table"],
    "CHART_MISSING_MODE": ["mode"],
    "CHART_MISSING_CONFIG_ID": ["configId"],
    "CHART_MISSING_NATIVE_BODY": ["nativeBody"],
    "CHART_INVALID_STYLE_VARIANT": ["styleVariant"],
    "CHART_FIELD_REQUIREMENT": ["dimensions", "metrics"],
    "CHART_SQL_NOT_READONLY": ["sql"],
}


def _fields_for_code(code: str, text: str, loc: tuple[object, ...]) -> list[dict[str, str]]:
    if code == "CHART_MISSING_SERIES":
        return _series_missing_fields(text)
    hints = _CODE_FIELD_HINTS.get(code)
    if hints:
        return [{"field": name, "message": text} for name in hints]
    field_name = _loc_to_field(loc)
    return [{"field": field_name, "message": text}]


def _map_validation_error(exc: ValidationError) -> ChartViewError:
    fields: list[dict[str, str]] = []
    code = "CHART_INVALID"
    message = "Invalid chart config"
    for err in exc.errors():
        msg = str(err.get("msg", "Invalid chart config"))
        if msg.startswith("Value error, "):
            msg = msg.removeprefix("Value error, ")
        loc = err.get("loc", ())
        if msg.startswith("CHART_") and ":" in msg:
            err_code, text = msg.split(":", 1)
            code = err_code
            message = text
            fields.extend(_fields_for_code(err_code, text, tuple(loc)))
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
