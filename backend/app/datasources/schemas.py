from __future__ import annotations

import re
import uuid

from pydantic import BaseModel, Field, field_validator

from app.datasources.dialects.base import TestConnectionResult

DATASOURCE_CODE_RE = re.compile(r"^[a-z][a-z0-9_-]{1,63}$")


class DataSourceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    code: str
    type: str = Field(min_length=1, max_length=32)
    host: str = Field(min_length=1, max_length=255)
    port: int = Field(ge=1, le=65535)
    database: str = Field(min_length=1, max_length=128)
    username: str = Field(min_length=1, max_length=128)
    password: str = Field(min_length=1)
    description: str | None = None

    @field_validator("code")
    @classmethod
    def validate_code(cls, value: str) -> str:
        if not DATASOURCE_CODE_RE.match(value):
            raise ValueError("code must match ^[a-z][a-z0-9_-]{1,63}$")
        return value


class DataSourceUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    host: str = Field(min_length=1, max_length=255)
    port: int = Field(ge=1, le=65535)
    database: str = Field(min_length=1, max_length=128)
    username: str = Field(min_length=1, max_length=128)
    password: str = ""
    description: str | None = None


class DataSourcePatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    host: str | None = None
    port: int | None = Field(default=None, ge=1, le=65535)
    database: str | None = None
    username: str | None = None
    password: str | None = None
    description: str | None = None


class DataSourceOut(BaseModel):
    id: uuid.UUID
    name: str
    code: str
    type: str
    host: str
    port: int
    database: str
    username: str
    password: str = "***"
    description: str | None


class DataSourceListResponse(BaseModel):
    items: list[DataSourceOut]
    total: int
    limit: int
    offset: int


class TestConnectionIn(DataSourceCreate):
    pass


class TestConnectionOut(BaseModel):
    ok: bool
    message: str
    latency_ms: int | None = Field(serialization_alias="latencyMs")

    model_config = {"populate_by_name": True}

    @classmethod
    def from_result(cls, result: TestConnectionResult) -> TestConnectionOut:
        return cls(ok=result.ok, message=result.message, latency_ms=result.latency_ms)
