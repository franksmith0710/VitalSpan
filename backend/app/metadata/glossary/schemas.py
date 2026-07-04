from __future__ import annotations

import re
import uuid

from pydantic import BaseModel, ConfigDict, Field, field_validator

TERM_CODE_RE = re.compile(r"^[a-z][a-z0-9_]{1,63}$")


class GlossaryError(Exception):
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


class TermCreate(BaseModel):
    code: str
    name: str = Field(min_length=1, max_length=120)
    definition: str | None = None
    description: str | None = None

    @field_validator("code")
    @classmethod
    def validate_code(cls, v: str) -> str:
        if not TERM_CODE_RE.match(v):
            raise ValueError("code must match ^[a-z][a-z0-9_]{1,63}$")
        return v


class TermUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    definition: str | None = None
    description: str | None = None


class TermOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    code: str
    name: str
    definition: str | None
    description: str | None
    status: str


class TermListResponse(BaseModel):
    items: list[TermOut]
    total: int
