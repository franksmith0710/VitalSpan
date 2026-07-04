from __future__ import annotations

import uuid

from pydantic import BaseModel, ConfigDict, Field


class PhysicalColumn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    name: str = Field(min_length=1, max_length=64)
    data_type: str = Field(alias="dataType", min_length=1, max_length=32)
    nullable: bool = True
    description: str | None = Field(default=None, max_length=256)


class PhysicalTableRegisterIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    table_fqn: str = Field(
        alias="tableFqn",
        pattern=r"^[a-z][a-z0-9_]{0,62}\.[a-z][a-z0-9_]{1,63}$",
    )
    data_source_id: uuid.UUID = Field(alias="dataSourceId")
    display_name: str = Field(min_length=1, max_length=120, alias="displayName")
    entity_type_code: str | None = Field(default=None, alias="entityTypeCode", max_length=64)
    columns: list[PhysicalColumn]


class PhysicalTableOut(PhysicalTableRegisterIn):
    pass


class PhysicalTableValidateOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    valid: bool
    table_fqn: str = Field(alias="tableFqn")
    column_count: int = Field(alias="columnCount")


class PhysicalTableListResponse(BaseModel):
    items: list[PhysicalTableOut]
    total: int
