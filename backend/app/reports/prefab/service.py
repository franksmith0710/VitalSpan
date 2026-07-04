from __future__ import annotations

import re

from app.auth.deps import UserContext
from app.reports.prefab.errors import PrefabError
from app.reports.prefab.schemas import (
    PrefabBindingIn,
    PrefabBindingListResponse,
    PrefabBindingOut,
    PrefabBindingValidateOut,
)

_ENTITY_RE = re.compile(r"^[a-z][a-z0-9_]{1,63}$")
_KNOWN_DIMENSIONS = frozenset({"region", "status"})
_store: dict[str, dict] = {}


def _assert_write_access(user: UserContext) -> None:
    roles = set(user.roles)
    if roles <= {"viewer"} or (roles == {"viewer"}):
        raise PrefabError("RPT_PREFAB_FORBIDDEN", "viewer cannot upsert prefab bindings", 403)


def _validate_binding(payload: PrefabBindingIn) -> PrefabBindingIn:
    if not _ENTITY_RE.match(payload.entity_type_code):
        raise PrefabError(
            "RPT_PREFAB_INVALID_ENTITY",
            "Invalid entityTypeCode",
            422,
            [{"field": "entityTypeCode", "message": "invalid pattern"}],
        )
    unknown = [c for c in payload.dimension_codes if c not in _KNOWN_DIMENSIONS]
    if unknown:
        raise PrefabError(
            "RPT_PREFAB_DIMENSION_UNKNOWN",
            f"Unknown dimension codes: {unknown[0]}",
            422,
            [{"field": "dimensionCodes", "message": f"unknown: {unknown[0]}"}],
        )
    return payload


def list_prefab_bindings() -> PrefabBindingListResponse:
    items = list(_store.values())
    return PrefabBindingListResponse(
        items=[PrefabBindingOut.model_validate(i) for i in items],
        total=len(items),
    )


def validate_prefab_binding(payload: PrefabBindingIn) -> PrefabBindingValidateOut:
    item = _validate_binding(payload)
    return PrefabBindingValidateOut(valid=True, binding_key=item.binding_key)


def upsert_prefab_binding(key: str, payload: PrefabBindingIn, user: UserContext) -> PrefabBindingOut:
    _assert_write_access(user)
    if key != payload.binding_key:
        raise PrefabError("RPT_PREFAB_KEY_MISMATCH", "path binding_key mismatch", 422)
    item = _validate_binding(payload)
    _store[key] = item.model_dump(by_alias=True, mode="json")
    return PrefabBindingOut.model_validate(_store[key])
