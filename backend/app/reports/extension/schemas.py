from __future__ import annotations

import uuid

from pydantic import BaseModel, ConfigDict, Field

_KEY_PATTERN = r"^[a-z][a-z0-9_]{0,63}$"


class MetricAdjustment(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    key: str = Field(pattern=_KEY_PATTERN)
    label: str = Field(min_length=1, max_length=120)
    expression: str | None = None
    visible: bool = True


class FilterAdjustment(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    key: str = Field(pattern=_KEY_PATTERN)
    operator: str
    default_value: str | None = Field(default=None, alias="defaultValue")
    required: bool = False


class ExtensionConfigUpsert(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    catalog_node_id: uuid.UUID = Field(alias="catalogNodeId")
    metrics: list[MetricAdjustment] = Field(default_factory=list)
    filters: list[FilterAdjustment] = Field(default_factory=list)
    change_note: str | None = Field(default=None, max_length=500, alias="changeNote")


class ExtensionConfigOut(ExtensionConfigUpsert):
    revision: int
