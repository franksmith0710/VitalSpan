from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class NativeQuerySpec(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")
    connector_type: str = Field(alias="connectorType")
    body: dict[str, Any] = Field(default_factory=dict)
    index: str | None = None
    sql: str | None = None


class NativeValidateOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    connector_type: str = Field(alias="connectorType")
    body: dict[str, Any]
    index: str | None = None
    resolved_mode: str = Field(alias="resolvedMode")


class RoutingModeItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    connector_type: str = Field(alias="connectorType")
    mode: str


class RoutingModesOut(BaseModel):
    modes: list[RoutingModeItem]
