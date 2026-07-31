from __future__ import annotations

import re
import uuid

from pydantic import BaseModel, ConfigDict, Field, field_validator

_DATASET_ID_RE = re.compile(r"^[a-z][a-z0-9_-]{1,63}$")


class DatasetTableDef(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    name: str = Field(min_length=1, max_length=128)
    alias: str | None = None


class DatasetComputedField(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    name: str
    expression: str = Field(min_length=1, max_length=4096)


class DatasetItemIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    dataset_id: str = Field(alias="datasetId")
    display_name: str = Field(min_length=1, max_length=120, alias="displayName")
    tables: list[DatasetTableDef] = Field(default_factory=list, max_length=32)
    computed_fields: list[DatasetComputedField] = Field(default_factory=list, alias="computedFields", max_length=64)
    allowed_roles: list[str] = Field(default_factory=lambda: ["analyst"], alias="allowedRoles")

    @field_validator("dataset_id")
    @classmethod
    def _dataset_id_pattern(cls, v: str) -> str:
        if not _DATASET_ID_RE.match(v):
            raise ValueError("invalid datasetId")
        return v


class DatasetItemOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    dataset_id: str = Field(alias="datasetId")
    display_name: str = Field(alias="displayName")
    tables: list[DatasetTableDef]
    computed_fields: list[DatasetComputedField] = Field(alias="computedFields")
    allowed_roles: list[str] = Field(alias="allowedRoles")
    bound_config_id: uuid.UUID | None = Field(default=None, alias="boundConfigId")
    is_demo_package: bool = Field(default=False, alias="isDemoPackage")


class DatasetBindConfigIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    config_id: uuid.UUID = Field(alias="configId")


class DatasetListResponse(BaseModel):
    items: list[DatasetItemOut]
    total: int


class DatasetValidateOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)
    valid: bool
    dataset_id: str = Field(alias="datasetId")
    table_count: int = Field(alias="tableCount")
    computed_field_count: int = Field(alias="computedFieldCount")
