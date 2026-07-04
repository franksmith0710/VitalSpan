from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.auth.deps import UserContext
from app.designer import service as designer_service
from app.designer.schemas import DesignerError
from app.datasources.models import DataSource
from app.governance import acl as gov_acl
from app.governance.query_design.schemas import (
    GOV_CONFIG_TYPE,
    GOV_REF_TYPE,
    GovQueryDesignError,
    VisualQueryDesignIn,
    VisualQueryDesignOut,
)
from app.query.config_store import service as config_store
from app.query.config_store.schemas import ConfigError, ConfigUpsert


def _actor_uuid(actor: UserContext) -> uuid.UUID | None:
    try:
        return uuid.UUID(actor.id)
    except ValueError:
        return None


def _wrap_designer_error(exc: DesignerError) -> GovQueryDesignError:
    return GovQueryDesignError(
        exc.code,
        exc.message,
        exc.status,
        fields=exc.fields,
    )


def validate_visual_query_design(session: Session, payload: VisualQueryDesignIn) -> VisualQueryDesignOut:
    if not payload.title.strip():
        raise GovQueryDesignError(
            "GOV_QUERY_DESIGN_INVALID",
            "Title must not be blank",
            422,
            fields=[{"field": "title", "message": "must not be blank"}],
        )
    if payload.data_source_id is not None:
        row = session.get(DataSource, payload.data_source_id)
        if row is None or row.deleted_at is not None:
            raise GovQueryDesignError(
                "GOV_QUERY_DESIGN_UNKNOWN_DATASOURCE",
                "Data source not found",
                422,
                fields=[{"field": "dataSourceId", "message": "unknown data source"}],
            )
    try:
        designer_service.validate_conditions_config(payload.conditions)
        if payload.compute_rules is not None:
            designer_service.validate_compute_rules_config(payload.compute_rules)
    except DesignerError as exc:
        raise _wrap_designer_error(exc) from exc
    return _to_out(payload, revision=0)


def save_visual_query_design(
    session: Session,
    payload: VisualQueryDesignIn,
    actor: UserContext,
) -> VisualQueryDesignOut:
    validated = validate_visual_query_design(session, payload)
    try:
        gov_acl.assert_query_design_action(
            session,
            actor,
            "save",
            owner_id=_actor_uuid(actor),
            status=payload.status,
        )
    except gov_acl.GovAclError as exc:
        raise GovQueryDesignError(exc.code, exc.message, exc.status) from exc
    stored_payload = {
        "title": validated.title,
        "status": validated.status,
        "dataSourceId": str(validated.data_source_id) if validated.data_source_id else None,
        "conditions": payload.conditions.model_dump(by_alias=True, mode="json"),
        "computeRules": (
            payload.compute_rules.model_dump(by_alias=True, mode="json")
            if payload.compute_rules is not None
            else None
        ),
    }
    upsert = ConfigUpsert(
        config_type=GOV_CONFIG_TYPE,
        schema_version=payload.schema_version,
        ref_type=GOV_REF_TYPE,
        ref_id=payload.ref_id,
        payload=stored_payload,
        expected_revision=payload.expected_revision,
    )
    try:
        record = config_store.upsert_config(
            session, upsert, owner_id=_actor_uuid(actor)
        )
    except ConfigError as exc:
        raise GovQueryDesignError(exc.code, exc.message, exc.status, fields=exc.fields) from exc
    return _to_out(payload, revision=record.revision)


def get_visual_query_design(session: Session, ref_id: uuid.UUID) -> VisualQueryDesignOut:
    try:
        record = config_store.get_config_by_ref(
            session, GOV_CONFIG_TYPE, GOV_REF_TYPE, ref_id, schema_version="1.0"
        )
    except ConfigError as exc:
        raise GovQueryDesignError("GOV_QUERY_DESIGN_NOT_FOUND", exc.message, 404) from exc
    body = record.payload
    return VisualQueryDesignOut(
        schema_version=record.schema_version,
        ref_type=record.ref_type or GOV_REF_TYPE,
        ref_id=record.ref_id,
        title=body["title"],
        status=body["status"],
        data_source_id=uuid.UUID(body["dataSourceId"]) if body.get("dataSourceId") else None,
        conditions=body["conditions"],
        compute_rules=body.get("computeRules"),
        revision=record.revision,
    )


def _to_out(payload: VisualQueryDesignIn, *, revision: int) -> VisualQueryDesignOut:
    return VisualQueryDesignOut(
        schema_version=payload.schema_version,
        ref_type=payload.ref_type,
        ref_id=payload.ref_id,
        title=payload.title.strip(),
        status=payload.status,
        data_source_id=payload.data_source_id,
        conditions=payload.conditions.model_dump(by_alias=True, mode="json"),
        compute_rules=(
            payload.compute_rules.model_dump(by_alias=True, mode="json")
            if payload.compute_rules is not None
            else None
        ),
        revision=revision,
    )
