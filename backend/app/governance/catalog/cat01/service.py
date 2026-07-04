from __future__ import annotations

import re

from app.governance.catalog.cat01.errors import (
    CAT01_DUPLICATE_STAGE,
    CAT01_EMPTY_STAGES,
    CAT01_INVALID_ENTITY_TYPE,
    CAT01_KEY_CONFLICT,
    Cat01Error,
)
from app.governance.catalog.cat01.schemas import (
    LifecycleTemplateIn,
    LifecycleTemplateListResponse,
    LifecycleTemplateOut,
    LifecycleTemplateValidateOut,
)

_ENTITY_RE = re.compile(r"^[a-z][a-z0-9_]{1,63}$")
_store: dict[str, dict] = {}


def _validate_payload(payload: LifecycleTemplateIn) -> LifecycleTemplateIn:
    if not payload.lifecycle_stages:
        raise Cat01Error(
            CAT01_EMPTY_STAGES,
            "lifecycleStages must not be empty",
            422,
            [{"field": "lifecycleStages", "message": "must not be empty"}],
        )
    if len(payload.lifecycle_stages) != len(set(payload.lifecycle_stages)):
        raise Cat01Error(CAT01_DUPLICATE_STAGE, "duplicate lifecycle stage", 422)
    if not _ENTITY_RE.match(payload.entity_type_code):
        raise Cat01Error(CAT01_INVALID_ENTITY_TYPE, "invalid entityTypeCode", 422)
    return payload


def validate_lifecycle_template(payload: LifecycleTemplateIn) -> LifecycleTemplateValidateOut:
    item = _validate_payload(payload)
    return LifecycleTemplateValidateOut(valid=True, template_key=item.template_key)


def create_lifecycle_template(payload: LifecycleTemplateIn) -> LifecycleTemplateOut:
    item = _validate_payload(payload)
    key = item.template_key
    if key in _store:
        raise Cat01Error(CAT01_KEY_CONFLICT, f"templateKey already exists: {key}", 409)
    _store[key] = item.model_dump(by_alias=True, mode="json")
    return LifecycleTemplateOut.model_validate(_store[key])


def list_lifecycle_templates(limit: int, offset: int) -> LifecycleTemplateListResponse:
    items = list(_store.values())
    page = items[offset : offset + limit]
    return LifecycleTemplateListResponse(
        items=[LifecycleTemplateOut.model_validate(i) for i in page],
        total=len(items),
    )
