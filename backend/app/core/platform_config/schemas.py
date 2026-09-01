from __future__ import annotations

from pydantic import BaseModel, Field


class EmailDeliveryConfigOut(BaseModel):
    slot: str = Field(description="qq | 163")
    label: str
    configured: bool
    source: str = Field(description="db | env | none")
    host: str | None = None
    port: int | None = None
    from_addr: str | None = Field(default=None, alias="from")
    username: str | None = None
    has_password: bool = Field(alias="hasPassword")
    probe_status: str | None = Field(default=None, alias="probeStatus")
    probe_error: str | None = Field(default=None, alias="probeError")

    model_config = {"populate_by_name": True}


class EmailDeliverySlotsOut(BaseModel):
    items: list[EmailDeliveryConfigOut]

    model_config = {"populate_by_name": True}


class EmailDeliveryConfigPut(BaseModel):
    host: str = Field(min_length=1, max_length=255)
    port: int = Field(ge=1, le=65535)
    from_addr: str = Field(min_length=3, max_length=255, alias="from")
    username: str | None = Field(default=None, max_length=255)
    password: str | None = Field(default=None, max_length=256)

    model_config = {"populate_by_name": True}


class ImDeliveryConfigOut(BaseModel):
    channel: str
    label: str
    configured: bool
    source: str = Field(description="db | env | none")
    delivery_mode: str = Field(default="corporate_app", alias="deliveryMode")
    callback_domain: str | None = Field(default=None, alias="callbackDomain")
    corp_id: str | None = Field(default=None, alias="corpId")
    agent_id: str | None = Field(default=None, alias="agentId")
    app_key: str | None = Field(default=None, alias="appKey")
    app_id: str | None = Field(default=None, alias="appId")
    webhook_url: str | None = Field(default=None, alias="webhookUrl")
    has_secret: bool = Field(alias="hasSecret")
    probe_error: str | None = Field(default=None, alias="probeError")

    model_config = {"populate_by_name": True}


class ImDeliverySlotsOut(BaseModel):
    items: list[ImDeliveryConfigOut]

    model_config = {"populate_by_name": True}


class ImDeliveryConfigPut(BaseModel):
    delivery_mode: str | None = Field(default=None, alias="deliveryMode")
    callback_domain: str | None = Field(default=None, max_length=255, alias="callbackDomain")
    corp_id: str | None = Field(default=None, max_length=128, alias="corpId")
    secret: str | None = Field(default=None, max_length=256)
    agent_id: str | None = Field(default=None, max_length=64, alias="agentId")
    app_key: str | None = Field(default=None, max_length=128, alias="appKey")
    app_secret: str | None = Field(default=None, max_length=256, alias="appSecret")
    app_id: str | None = Field(default=None, max_length=128, alias="appId")
    webhook_url: str | None = Field(default=None, max_length=1024, alias="webhookUrl")

    model_config = {"populate_by_name": True}
