from __future__ import annotations

import re
import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

ROLE_CODE_RE = re.compile(r"^[a-z][a-z0-9_]{1,63}$")
ResourceType = Literal["datasource", "dashboard", "report", "gov_catalog_entry"]
ValueType = Literal["string", "number", "boolean", "org_ref"]


class RoleCreate(BaseModel):
    code: str
    name: str = Field(min_length=1, max_length=128)
    description: str | None = None

    @field_validator("code")
    @classmethod
    def validate_code(cls, value: str) -> str:
        if not ROLE_CODE_RE.match(value):
            raise ValueError("code must match ^[a-z][a-z0-9_]{1,63}$")
        return value


class RoleUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    description: str | None = None
    is_active: bool | None = None


class RoleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code: str
    name: str
    description: str | None
    is_active: bool


class RoleListResponse(BaseModel):
    items: list[RoleOut]
    total: int


class RolePermissionsOut(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True, serialize_by_alias=True, from_attributes=True
    )

    role_id: uuid.UUID = Field(alias="roleId")
    permission_codes: list[str] = Field(alias="permissionCodes")
    version: int
    all_permissions: bool = Field(alias="allPermissions")


class OrgCreate(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    parent_id: uuid.UUID | None = None


class OrgUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=128)
    parent_id: uuid.UUID | None = None


class OrgOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    parent_id: uuid.UUID | None
    name: str
    path: str
    level: int


class OrgListResponse(BaseModel):
    items: list[OrgOut]


class UserCreate(BaseModel):
    username: str = Field(min_length=1, max_length=128)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str


class UserListResponse(BaseModel):
    items: list[UserOut]
    total: int


class UserRolesReplace(BaseModel):
    role_ids: list[uuid.UUID]


class UserRoleOut(BaseModel):
    id: uuid.UUID
    code: str
    name: str


class UserRolesResponse(BaseModel):
    items: list[UserRoleOut]


class UserOrgAssign(BaseModel):
    org_node_id: uuid.UUID


class UserOrgResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    parent_id: uuid.UUID | None
    name: str
    path: str
    level: int


class ResourceGrantCreate(BaseModel):
    role_id: uuid.UUID
    resource_type: ResourceType
    resource_id: uuid.UUID


class ResourceGrantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    role_id: uuid.UUID
    resource_type: str
    resource_id: uuid.UUID


class ResourceGrantListResponse(BaseModel):
    items: list[ResourceGrantOut]


class DimensionTypeCreate(BaseModel):
    code: str
    name: str = Field(min_length=1, max_length=128)
    value_type: ValueType
    description: str | None = None

    @field_validator("code")
    @classmethod
    def validate_code(cls, value: str) -> str:
        if not ROLE_CODE_RE.match(value):
            raise ValueError("code must match ^[a-z][a-z0-9_]{1,63}$")
        return value


class DimensionTypeUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    description: str | None = None


class DimensionTypeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code: str
    name: str
    value_type: str
    org_dimension: bool
    description: str | None


class DimensionTypeListResponse(BaseModel):
    items: list[DimensionTypeOut]
    total: int


class AuditEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    actor_id: str
    actor_username: str | None
    target_type: str
    target_id: uuid.UUID
    action: str
    detail: str | None
    trace_id: str
    created_at: datetime


class AuditListResponse(BaseModel):
    items: list[AuditEventOut]
    total: int


class DimensionGroupCreate(BaseModel):
    dimension_type_id: uuid.UUID
    code: str
    name: str = Field(min_length=1, max_length=128)
    parent_id: uuid.UUID | None = None

    @field_validator("code")
    @classmethod
    def validate_code(cls, value: str) -> str:
        if not ROLE_CODE_RE.match(value):
            raise ValueError("code must match ^[a-z][a-z0-9_]{1,63}$")
        return value


class DimensionGroupUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=128)
    parent_id: uuid.UUID | None = None


class DimensionGroupOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    dimension_type_id: uuid.UUID
    code: str
    name: str
    parent_id: uuid.UUID | None


class DimensionGroupListResponse(BaseModel):
    items: list[DimensionGroupOut]
    total: int


class DimensionGroupValuesReplace(BaseModel):
    values: list[str] = Field(min_length=1)


class DimensionGroupValuesResponse(BaseModel):
    items: list[str]


class RoleDimensionValuesReplace(BaseModel):
    dimension_type_id: uuid.UUID
    values: list[str]


class RoleDimensionGroupsReplace(BaseModel):
    group_ids: list[uuid.UUID]


class EffectiveDimensionsResponse(BaseModel):
    dimension_type_id: uuid.UUID
    values: list[str]
