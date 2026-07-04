from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.designer.schemas import (
    ALLOWED_OUTPUT_AGGREGATES,
    AggregateItem,
    DESIGNER_FIELD_REGISTRY,
    DesignerError,
    OutputFieldItem,
    OutputFieldsConfig,
)
from app.metadata.glossary import service as glossary_service
from app.query.config_store import service as config_store
from app.query.config_store.schemas import ConfigUpsert


def _glossary_codes(session: Session) -> set[str]:
    items, _ = glossary_service.list_terms(session, limit=500, offset=0)
    return {item.code for item in items}


def validate_output_fields_config(session: Session, config: OutputFieldsConfig) -> OutputFieldsConfig:
    if not config.fields:
        raise DesignerError(
            "DESIGN_EMPTY_OUTPUT_FIELDS",
            "At least one output field is required",
            422,
            fields=[{"field": "fields", "message": "must not be empty"}],
        )
    glossary = _glossary_codes(session)
    for idx, field in enumerate(config.fields):
        prefix = f"fields[{idx}]"
        if field.field_id not in DESIGNER_FIELD_REGISTRY:
            raise DesignerError(
                "DESIGN_UNKNOWN_FIELD",
                "Unknown field in output",
                422,
                fields=[{"field": f"{prefix}.fieldId", "message": f"{field.field_id} not registered"}],
            )
        if field.meta_field_ref and field.meta_field_ref not in DESIGNER_FIELD_REGISTRY:
            if field.meta_field_ref not in glossary:
                raise DesignerError(
                    "DESIGN_UNKNOWN_META_REF",
                    "Unknown meta field reference",
                    422,
                    fields=[
                        {
                            "field": f"{prefix}.metaFieldRef",
                            "message": f"{field.meta_field_ref} not in glossary or registry",
                        }
                    ],
                )
    for idx, agg in enumerate(config.aggregates):
        prefix = f"aggregates[{idx}]"
        if agg.fn not in ALLOWED_OUTPUT_AGGREGATES:
            raise DesignerError(
                "DESIGN_INVALID_AGGREGATE",
                f"Aggregate function not allowed: {agg.fn}",
                422,
                fields=[{"field": f"{prefix}.fn", "message": "not in whitelist"}],
            )
        if agg.field_id not in DESIGNER_FIELD_REGISTRY:
            raise DesignerError(
                "DESIGN_UNKNOWN_FIELD",
                "Unknown field in aggregate",
                422,
                fields=[{"field": f"{prefix}.fieldId", "message": f"{agg.field_id} not registered"}],
            )
        for j, gb in enumerate(agg.group_by):
            if gb not in DESIGNER_FIELD_REGISTRY:
                raise DesignerError(
                    "DESIGN_UNKNOWN_FIELD",
                    "Unknown groupBy field",
                    422,
                    fields=[{"field": f"{prefix}.groupBy[{j}]", "message": f"{gb} not registered"}],
                )
    return config


def _payload(config: OutputFieldsConfig) -> dict:
    return {
        "schemaVersion": config.schema_version,
        "fields": [f.model_dump(by_alias=True) for f in config.fields],
        "aggregates": [a.model_dump(by_alias=True) for a in config.aggregates],
    }


def save_output_fields(session: Session, config: OutputFieldsConfig, owner_id: uuid.UUID | None = None):
    validate_output_fields_config(session, config)
    record = config_store.upsert_config(
        session,
        ConfigUpsert(
            config_type="output_fields",
            schema_version=config.schema_version,
            ref_type=config.ref_type,
            ref_id=config.ref_id,
            payload=_payload(config),
        ),
        owner_id=owner_id,
    )
    return config, record


def get_output_fields(session: Session, ref_type: str, ref_id: uuid.UUID) -> OutputFieldsConfig:
    record = config_store.get_config_by_ref(session, "output_fields", ref_type, ref_id)
    payload = record.payload
    return OutputFieldsConfig(
        schema_version=payload.get("schemaVersion", "1.0"),
        fields=[OutputFieldItem.model_validate(f) for f in payload["fields"]],
        aggregates=[AggregateItem.model_validate(a) for a in payload.get("aggregates", [])],
        ref_type=ref_type,
        ref_id=ref_id,
    )
