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
