from __future__ import annotations

import uuid

from app.designer.schemas import (
    ALLOWED_LOGIC,
    ALLOWED_OPERATORS,
    ALLOWED_RULE_TYPES,
    ALLOWED_VALUE_TYPES,
    EXPR_RE,
    ComputeRuleItem,
    ComputeRulesConfig,
    ConditionItem,
    DesignerError,
    QueryConditionsConfig,
)
from app.query.config_store import service as config_store
from app.query.config_store.schemas import ConfigUpsert
from sqlalchemy.orm import Session


def _check_value_type(item: ConditionItem) -> None:
    vt = item.value_type
    if vt not in ALLOWED_VALUE_TYPES:
        raise DesignerError("DESIGN_INVALID_VALUE_TYPE", f"Unknown value type: {vt}", 422)
    val = item.value
    if item.operator in ("is_null", "is_not_null"):
        return
    if vt == "string" and not isinstance(val, str):
        raise DesignerError("DESIGN_VALUE_TYPE_MISMATCH", "Value does not match valueType", 422)
    if vt == "number" and (not isinstance(val, (int, float)) or isinstance(val, bool)):
        raise DesignerError("DESIGN_VALUE_TYPE_MISMATCH", "Value does not match valueType", 422)
    if vt == "boolean" and not isinstance(val, bool):
        raise DesignerError("DESIGN_VALUE_TYPE_MISMATCH", "Value does not match valueType", 422)
    if vt == "date" and not isinstance(val, str):
        raise DesignerError("DESIGN_VALUE_TYPE_MISMATCH", "Value does not match valueType", 422)
    if vt == "array" and not isinstance(val, list):
        raise DesignerError("DESIGN_VALUE_TYPE_MISMATCH", "Value does not match valueType", 422)


def validate_conditions_config(config: QueryConditionsConfig) -> QueryConditionsConfig:
    if config.logic not in ALLOWED_LOGIC:
        raise DesignerError("DESIGN_INVALID_LOGIC", f"Unknown logic: {config.logic}", 422)
    if not config.conditions:
        raise DesignerError("DESIGN_EMPTY_CONDITIONS", "At least one condition is required", 422)
    for item in config.conditions:
        if item.operator not in ALLOWED_OPERATORS:
            raise DesignerError("DESIGN_INVALID_OPERATOR", f"Unknown operator: {item.operator}", 422)
        _check_value_type(item)
    return config


def detect_rule_cycle(rules: list[ComputeRuleItem]) -> None:
    graph = {r.id: set(r.depends_on) for r in rules}
    visiting: set[str] = set()
    visited: set[str] = set()

    def dfs(node: str) -> None:
        if node in visiting:
            raise DesignerError("DESIGN_RULE_CYCLE", "Circular rule dependency", 422)
        if node in visited:
            return
        visiting.add(node)
        for dep in graph.get(node, ()):
            if dep in graph:
                dfs(dep)
        visiting.remove(node)
        visited.add(node)

    for rule_id in graph:
        dfs(rule_id)


def validate_compute_rules_config(config: ComputeRulesConfig) -> ComputeRulesConfig:
    if not config.rules:
        raise DesignerError("DESIGN_EMPTY_RULES", "At least one rule is required", 422)
    for rule in config.rules:
        if rule.rule_type not in ALLOWED_RULE_TYPES:
            raise DesignerError("DESIGN_INVALID_RULE_TYPE", f"Unknown rule type: {rule.rule_type}", 422)
        if not EXPR_RE.match(rule.expression):
            raise DesignerError("DESIGN_INVALID_EXPRESSION", "Expression is not allowed", 422)
    detect_rule_cycle(config.rules)
    return config


def _conditions_payload(config: QueryConditionsConfig) -> dict:
    return {
        "schemaVersion": config.schema_version,
        "logic": config.logic,
        "conditions": [c.model_dump(by_alias=True) for c in config.conditions],
    }


def _rules_payload(config: ComputeRulesConfig) -> dict:
    return {
        "schemaVersion": config.schema_version,
        "rules": [r.model_dump(by_alias=True) for r in config.rules],
    }


def save_conditions(session: Session, config: QueryConditionsConfig, owner_id: uuid.UUID | None = None):
    validate_conditions_config(config)
    record = config_store.upsert_config(
        session,
        ConfigUpsert(
            config_type="query_conditions",
            schema_version=config.schema_version,
            ref_type=config.ref_type,
            ref_id=config.ref_id,
            payload=_conditions_payload(config),
        ),
        owner_id=owner_id,
    )
    return config, record


def get_conditions(session: Session, ref_type: str, ref_id: uuid.UUID) -> QueryConditionsConfig:
    record = config_store.get_config_by_ref(session, "query_conditions", ref_type, ref_id)
    payload = record.payload
    return QueryConditionsConfig(
        schema_version=payload.get("schemaVersion", "1.0"),
        logic=payload["logic"],
        conditions=[ConditionItem.model_validate(c) for c in payload["conditions"]],
        ref_type=ref_type,
        ref_id=ref_id,
    )


def save_compute_rules(session: Session, config: ComputeRulesConfig, owner_id: uuid.UUID | None = None):
    validate_compute_rules_config(config)
    record = config_store.upsert_config(
        session,
        ConfigUpsert(
            config_type="compute_rules",
            schema_version=config.schema_version,
            ref_type=config.ref_type,
            ref_id=config.ref_id,
            payload=_rules_payload(config),
        ),
        owner_id=owner_id,
    )
    return config, record


def get_compute_rules(session: Session, ref_type: str, ref_id: uuid.UUID) -> ComputeRulesConfig:
    record = config_store.get_config_by_ref(session, "compute_rules", ref_type, ref_id)
    payload = record.payload
    return ComputeRulesConfig(
        schema_version=payload.get("schemaVersion", "1.0"),
        rules=[ComputeRuleItem.model_validate(r) for r in payload["rules"]],
        ref_type=ref_type,
        ref_id=ref_id,
    )
