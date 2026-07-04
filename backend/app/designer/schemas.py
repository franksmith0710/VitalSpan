from __future__ import annotations

import re
import uuid

from pydantic import BaseModel, ConfigDict, Field

ALLOWED_OPERATORS = frozenset({
    "eq", "ne", "gt", "gte", "lt", "lte", "in", "not_in", "like", "is_null", "is_not_null"
})
ALLOWED_VALUE_TYPES = frozenset({"string", "number", "boolean", "date", "array"})
ALLOWED_LOGIC = frozenset({"AND", "OR"})
ALLOWED_RULE_TYPES = frozenset({"sum", "avg", "add", "sub", "mul", "div", "format"})

EXPR_RE = re.compile(
    r"^(sum|avg|count)\([a-zA-Z_][a-zA-Z0-9_]*\)$|^[a-zA-Z_][a-zA-Z0-9_]*[+\-*/][a-zA-Z_][a-zA-Z0-9_]*$"
)


class DesignerError(Exception):
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


class ConditionItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    field_id: str = Field(alias="fieldId", min_length=1)
    operator: str
    value: object | None = None
    value_type: str = Field(alias="valueType")


class QueryConditionsConfig(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    schema_version: str = Field(alias="schemaVersion", default="1.0")
    logic: str
    conditions: list[ConditionItem]
    ref_type: str = Field(default="design_draft", alias="refType")
    ref_id: uuid.UUID = Field(alias="refId")


class ComputeRuleItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    rule_type: str = Field(alias="ruleType")
    target_field: str = Field(alias="targetField")
    expression: str
    depends_on: list[str] = Field(default_factory=list, alias="dependsOn")


class ComputeRulesConfig(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    schema_version: str = Field(alias="schemaVersion", default="1.0")
    rules: list[ComputeRuleItem]
    ref_type: str = Field(default="design_draft", alias="refType")
    ref_id: uuid.UUID = Field(alias="refId")
