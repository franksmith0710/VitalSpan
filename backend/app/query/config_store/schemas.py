from __future__ import annotations

import uuid
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


ALLOWED_CONFIG_TYPES = frozenset({
    "query_conditions",
    "compute_rules",
    "visual_query_design",
    "sql_mode",
    "output_fields",
    "workflow_instance",
    "entity_theme",
    "entity_overview",
    "designer_workflow_link",
    "global_filter_linkage",
})
ALLOWED_SCHEMA_VERSIONS = frozenset({"1.0"})
DEFAULT_REF_TYPE = "design_draft"
MAX_CONFIG_PAYLOAD_BYTES = 262_144


class ConfigError(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        status: int = 400,
        fields: list[dict[str, str]] | None = None,
    ) -> None:
        self.code = code
        self.message = message
        self.status = status
        self.fields = fields or []
        super().__init__(message)


class ConfigUpsert(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    config_type: str = Field(alias="configType")
    schema_version: str = Field(alias="schemaVersion", default="1.0")
    ref_type: str | None = Field(default=DEFAULT_REF_TYPE, alias="refType")
    ref_id: uuid.UUID | None = Field(default=None, alias="refId")
    payload: Any
    expected_revision: int | None = Field(default=None, alias="expectedRevision")


class ConfigOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    id: uuid.UUID
    config_type: str = Field(alias="configType")
    schema_version: str = Field(alias="schemaVersion")
    ref_type: str | None = Field(alias="refType")
    ref_id: uuid.UUID | None = Field(alias="refId")
    owner_id: uuid.UUID | None = Field(alias="ownerId")
    payload: dict
    revision: int


class ConfigListResponse(BaseModel):
    items: list[ConfigOut]
    total: int
