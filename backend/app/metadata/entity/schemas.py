from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

_ATTR_NAME_PATTERN = r"^[a-z][a-z0-9_]{1,63}$"
_DEFAULT_LIFECYCLE = ["draft", "active", "retired"]


class EntityAttributeDef(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    name: str
    data_type: Literal["string", "integer", "number", "boolean", "datetime", "json"] = Field(alias="dataType")
    required: bool = False
    description: str | None = None


class EntityTypeCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    type_code: str = Field(pattern=_ATTR_NAME_PATTERN, alias="typeCode")
    display_name: str = Field(min_length=1, max_length=120, alias="displayName")
    attributes: list[EntityAttributeDef] = Field(default_factory=list, max_length=64)
    lifecycle_states: list[str] | None = Field(default=None, alias="lifecycleStates")


class EntityTypeUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    display_name: str = Field(min_length=1, max_length=120, alias="displayName")
    attributes: list[EntityAttributeDef] = Field(default_factory=list, max_length=64)
    lifecycle_states: list[str] | None = Field(default=None, alias="lifecycleStates")


class EntityTypeOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    type_code: str = Field(alias="typeCode")
    display_name: str = Field(alias="displayName")
    attributes: list[EntityAttributeDef]
    lifecycle_states: list[str] = Field(alias="lifecycleStates")


class EntityTypeListOut(BaseModel):
    items: list[EntityTypeOut]
