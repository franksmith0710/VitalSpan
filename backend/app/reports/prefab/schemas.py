from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

AnalysisType = Literal["lifecycle", "activity", "trend", "distribution"]


class PrefabBindingIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    binding_key: str = Field(alias="bindingKey", pattern=r"^[a-z][a-z0-9_-]{1,63}$")
    entity_type_code: str = Field(alias="entityTypeCode", pattern=r"^[a-z][a-z0-9_]{1,63}$")
    analysis_type: AnalysisType = Field(alias="analysisType")
    dimension_codes: list[str] = Field(min_length=1, alias="dimensionCodes")
    display_name: str = Field(min_length=1, max_length=120, alias="displayName")
    allowed_roles: list[str] = Field(default_factory=lambda: ["analyst"], alias="allowedRoles")


class PrefabBindingOut(PrefabBindingIn):
    pass


class PrefabBindingValidateOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    valid: bool
    binding_key: str = Field(alias="bindingKey")


class PrefabBindingListResponse(BaseModel):
    items: list[PrefabBindingOut]
    total: int
