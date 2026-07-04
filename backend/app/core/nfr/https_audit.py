from __future__ import annotations

import os
from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.core.config import get_settings
from app.core.nfr.errors import (
    HTTPS_AUDIT_EMPTY_PAYLOAD,
    HTTPS_AUDIT_INSECURE_URL,
    HTTPS_AUDIT_UNKNOWN_FIELD,
)

_SENSITIVE_DEFAULTS = frozenset({"password", "apiKey", "credential", "secret"})
_MASK_KEYS = frozenset({"password", "apiKey", "credential", "secret"})


class HttpsAuditError(Exception):
    def __init__(self, code: str, message: str, status: int = 422, fields: list | None = None) -> None:
        self.code = code
        self.message = message
        self.status = status
        self.fields = fields or []
        super().__init__(message)


class HttpsAuditStatusOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    https_enforced: bool = Field(alias="httpsEnforced")
    webhook_https_only: bool = Field(alias="webhookHttpsOnly")
    tls_min_version: str = Field(default="1.2", alias="tlsMinVersion")
    checked_at: datetime = Field(alias="checkedAt")


class HttpsAuditMaskProbeIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    sample_payload: dict[str, Any] = Field(alias="samplePayload")
    sensitive_fields: list[str] = Field(
        default_factory=lambda: ["password", "apiKey", "credential"],
        alias="sensitiveFields",
    )
    webhook_url: str | None = Field(default=None, alias="webhookUrl")


class HttpsAuditMaskProbeOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    masked_payload: dict[str, Any] = Field(alias="maskedPayload")
    masked_fields: list[str] = Field(alias="maskedFields")
    audit_logged: bool = Field(default=True, alias="auditLogged")
    insecure_webhook: bool = Field(default=False, alias="insecureWebhook")


def get_https_audit_status() -> HttpsAuditStatusOut:
    settings = get_settings()
    mode = os.environ.get("HTTPS_AUDIT_MODE", "auto")
    https_enforced = mode == "strict" or bool(getattr(settings, "cors_origins", None))
    webhook_https_only = True
    return HttpsAuditStatusOut(
        httpsEnforced=https_enforced,
        webhookHttpsOnly=webhook_https_only,
        tlsMinVersion="1.2",
        checkedAt=datetime.now(UTC),
    )


def probe_https_mask(payload: HttpsAuditMaskProbeIn) -> HttpsAuditMaskProbeOut:
    if not payload.sample_payload:
        raise HttpsAuditError(HTTPS_AUDIT_EMPTY_PAYLOAD, "samplePayload must not be empty", 422)
    unknown = [f for f in payload.sensitive_fields if f not in _SENSITIVE_DEFAULTS and f not in _MASK_KEYS]
    if unknown:
        raise HttpsAuditError(
            HTTPS_AUDIT_UNKNOWN_FIELD,
            f"unknown sensitive field policy: {unknown[0]}",
            422,
            [{"field": "sensitiveFields", "message": unknown[0]}],
        )
    if payload.webhook_url and payload.webhook_url.startswith("http://"):
        raise HttpsAuditError(HTTPS_AUDIT_INSECURE_URL, "webhookUrl must use https", 422)
    masked: dict[str, Any] = dict(payload.sample_payload)
    masked_fields: list[str] = []
    for key in payload.sensitive_fields:
        if key in masked:
            masked[key] = "***"
            masked_fields.append(key)
    for key in list(masked):
        if key in _MASK_KEYS and key not in masked_fields:
            masked[key] = "***"
            masked_fields.append(key)
    insecure = bool(payload.webhook_url and payload.webhook_url.startswith("http://"))
    return HttpsAuditMaskProbeOut(
        maskedPayload=masked,
        maskedFields=masked_fields,
        auditLogged=True,
        insecureWebhook=insecure,
    )
