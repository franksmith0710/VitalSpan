from __future__ import annotations

import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.reports.extension.schemas import FilterAdjustment, MetricAdjustment

_BATCH_ITEM_LIMIT = 50


class BatchExtensionInline(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    catalog_node_id: uuid.UUID | None = Field(default=None, alias="catalogNodeId")
    metrics: list[MetricAdjustment] = Field(default_factory=list)
    filters: list[FilterAdjustment] = Field(default_factory=list)
    change_note: str | None = Field(default=None, max_length=500, alias="changeNote")


class BatchReportItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    name: str = Field(min_length=1, max_length=120)
    parent_id: uuid.UUID | None = Field(default=None, alias="parentId")
    template_kind: Literal["word", "excel", "pdf"] | None = Field(default=None, alias="templateKind")
    extension: BatchExtensionInline | None = None


class BatchCreateReportsIn(BaseModel):
    items: list[BatchReportItem]


class BatchCreateReportsOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    batch_id: uuid.UUID = Field(alias="batchId")
    created_node_ids: list[uuid.UUID] = Field(alias="createdNodeIds")
    idempotent_replay: bool = Field(default=False, alias="idempotentReplay")
