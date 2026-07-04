from __future__ import annotations

import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class OpenApiMappingCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    catalog_entry_id: uuid.UUID | None = Field(default=None, alias="catalogEntryId")
    http_method: Literal["GET", "POST"] = Field(alias="httpMethod")
    path: str
    operation_id: str = Field(min_length=1, max_length=128, alias="operationId")
    entity_type_ref: str | None = Field(default=None, alias="entityTypeRef")


class OpenApiMappingOut(OpenApiMappingCreate):
    id: uuid.UUID
    active: bool


class OpenApiMappingListOut(BaseModel):
    items: list[OpenApiMappingOut]
