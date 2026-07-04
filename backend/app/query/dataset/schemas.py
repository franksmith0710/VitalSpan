from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class DatasetQuerySpec(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="allow")
    dataset_id: str = Field(alias="datasetId", min_length=1, max_length=64)
    parameters: dict[str, object] = Field(default_factory=dict)
    operation: str = "select"


class DatasetValidateOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    dataset_id: str = Field(alias="datasetId")
    resolved_path: Literal["dataset"] = Field(default="dataset", alias="resolvedPath")
    readonly: bool = True


class DatasetRoutingOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    paths: list[str]
    boundary_notes: dict[str, str] = Field(alias="boundaryNotes")


class ExecutePlanStep(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    step: Literal["path_resolve", "acl_check", "readonly_guard", "plan_ready"]
    status: Literal["pass", "skip"]
    detail: str | None = None


class DatasetExecutePlanOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    dataset_id: str = Field(alias="datasetId")
    resolved_path: Literal["dataset"] = Field(default="dataset", alias="resolvedPath")
    readonly: bool = True
    steps: list[ExecutePlanStep]
    plan_version: str = Field(default="dataset-plan-v1", alias="planVersion")
