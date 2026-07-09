from __future__ import annotations

import re

from app.auth.deps import UserContext
from app.reports.prefab.errors import (
    PrefabError,
    RPT_PREFAB_ANALYSIS_MISMATCH,
    RPT_PREFAB_DUPLICATE_DIMENSION,
    RPT_PREFAB_EMPTY_ROLES,
    RPT_PREFAB_NOT_FOUND,
)
from app.reports.prefab.schemas import (
    PrefabBindingIn,
    PrefabBindingListResponse,
    PrefabBindingOut,
    PrefabBindingValidateOut,
)

_ENTITY_RE = re.compile(r"^[a-z][a-z0-9_]{1,63}$")
_store: dict[str, dict] = {}
_USER_PREFAB_SCOPE: dict[str, str] = {}


def set_user_prefab_scope(user_id: str, key_prefix: str) -> None:
    _USER_PREFAB_SCOPE[user_id] = key_prefix


def _assert_prefab_scope(user: UserContext, binding_key: str) -> None:
    roles = set(user.roles)
    if roles.intersection({"admin", "analyst"}):
        return
    if "enterprise" in roles:
        prefix = _USER_PREFAB_SCOPE.get(user.id, "bind-cn")
        if not binding_key.startswith(prefix):
            raise PrefabError("RPT_PREFAB_FORBIDDEN", "enterprise user out of prefab binding scope", 403)


def _assert_write_access(user: UserContext) -> None:
    roles = set(user.roles)
    if roles <= {"viewer"} or (roles == {"viewer"}):
        raise PrefabError("RPT_PREFAB_FORBIDDEN", "viewer cannot upsert prefab bindings", 403)


def _validate_dimension_codes(codes: list[str]) -> None:
    from app.datasources.models import get_meta_session
    from app.metadata.dimensions import service as dimension_service
    from app.metadata.dimensions.schemas import DimensionError

    session = get_meta_session()
    try:
        dimension_service.ensure_legacy_probe_dimensions(session)
        for code in codes:
            try:
                dimension_service.resolve_dimension_by_code(session, code)
            except DimensionError as exc:
                status = 422 if exc.code == "META_DIM_NOT_FOUND" else exc.status
                raise PrefabError(
                    "RPT_PREFAB_DIMENSION_UNKNOWN",
                    exc.message,
                    status,
                    [{"field": "dimensionCodes", "message": f"unknown: {code}"}],
                ) from exc
    finally:
        session.close()


def _validate_binding(payload: PrefabBindingIn) -> PrefabBindingIn:
    if len(payload.dimension_codes) != len(set(payload.dimension_codes)):
        raise PrefabError(
            RPT_PREFAB_DUPLICATE_DIMENSION,
            "duplicate dimensionCodes",
            422,
            [{"field": "dimensionCodes", "message": "duplicate entries"}],
        )
    if not _ENTITY_RE.match(payload.entity_type_code):
        raise PrefabError(
            "RPT_PREFAB_INVALID_ENTITY",
            "Invalid entityTypeCode",
            422,
            [{"field": "entityTypeCode", "message": "invalid pattern"}],
        )
    if not payload.allowed_roles:
        raise PrefabError(
            RPT_PREFAB_EMPTY_ROLES,
            "allowedRoles must not be empty",
            422,
            [{"field": "allowedRoles", "message": "must not be empty"}],
        )
    if payload.analysis_type == "distribution" and "region" not in payload.dimension_codes:
        raise PrefabError(
            RPT_PREFAB_ANALYSIS_MISMATCH,
            "distribution analysis requires region dimension",
            422,
            [{"field": "dimensionCodes", "message": "distribution requires region"}],
        )
    _validate_dimension_codes(payload.dimension_codes)
    return payload


def list_prefab_bindings(user: UserContext | None = None) -> PrefabBindingListResponse:
    items = list(_store.values())
    if user and "enterprise" in set(user.roles):
        prefix = _USER_PREFAB_SCOPE.get(user.id, "bind-cn")
        items = [i for i in items if str(i.get("bindingKey", "")).startswith(prefix)]
    return PrefabBindingListResponse(
        items=[PrefabBindingOut.model_validate(i) for i in items],
        total=len(items),
    )


def get_prefab_binding(key: str, user: UserContext) -> PrefabBindingOut:
    _assert_prefab_scope(user, key)
    stored = _store.get(key)
    if stored is None:
        raise PrefabError(RPT_PREFAB_NOT_FOUND, "Prefab binding not found", 404)
    return PrefabBindingOut.model_validate(stored)


def validate_prefab_binding(payload: PrefabBindingIn) -> PrefabBindingValidateOut:
    item = _validate_binding(payload)
    return PrefabBindingValidateOut(valid=True, binding_key=item.binding_key)


def upsert_prefab_binding(key: str, payload: PrefabBindingIn, user: UserContext) -> PrefabBindingOut:
    _assert_write_access(user)
    _assert_prefab_scope(user, key)
    if key != payload.binding_key:
        raise PrefabError("RPT_PREFAB_KEY_MISMATCH", "path binding_key mismatch", 422)
    item = _validate_binding(payload)
    _store[key] = item.model_dump(by_alias=True, mode="json")
    return PrefabBindingOut.model_validate(_store[key])
