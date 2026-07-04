from __future__ import annotations

import uuid

from pydantic import BaseModel, ConfigDict, Field


class PublishActionOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: uuid.UUID
    status: str


class PublishStatusOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: uuid.UUID
    status: str
    allowed_actions: list[str] = Field(alias="allowedActions")


class PublishNotificationOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: str
    entry_id: uuid.UUID = Field(alias="entryId")
    event_type: str = Field(alias="eventType")
    timestamp: str
    delivery_mode: str = Field(alias="deliveryMode")
    notification_status: str = Field(alias="notificationStatus")
    message: str


class PublishNotificationListOut(BaseModel):
    items: list[PublishNotificationOut]
