from __future__ import annotations

from app.viz.embed import _ORIGIN_RE
from app.viz.sdk_portal.errors import SdkPortalError
from app.viz.sdk_portal.schemas import (
    SdkCapabilitiesOut,
    SdkLifecycleIn,
    SdkLifecycleOut,
    SdkPortalInitIn,
    SdkPortalValidateOut,
)

_SDK_VERSION = "0.1.0-l1"


def validate_sdk_init(payload: SdkPortalInitIn) -> SdkPortalValidateOut:
    if payload.target_type in {"chart", "dashboard"} and payload.target_id is None:
        raise SdkPortalError(
            "VIZ_SDK_TARGET_REQUIRED",
            "targetId is required for chart/dashboard targets",
            422,
            [{"field": "targetId", "message": "required"}],
        )
    invalid = [
        {"field": f"allowedOrigins[{i}]", "message": f"invalid origin: {o}"}
        for i, o in enumerate(payload.allowed_origins)
        if not _ORIGIN_RE.match(o)
    ]
    if invalid:
        raise SdkPortalError("VIZ_SDK_INVALID_ORIGIN", "invalid origin", 422, invalid)
    token_required = payload.auth_mode == "token" and not payload.embed_token
    return SdkPortalValidateOut(valid=True, app_id=payload.app_id, token_required=token_required)


def lifecycle_manifest(payload: SdkLifecycleIn) -> SdkLifecycleOut:
    return SdkLifecycleOut(phase=payload.phase, ready=True, sdk_version=_SDK_VERSION)


def list_capabilities() -> SdkCapabilitiesOut:
    return SdkCapabilitiesOut(target_types=["chart", "dashboard"], auth_modes=["token", "none"])
