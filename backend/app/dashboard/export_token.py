"""Short-lived tokens for headless dashboard export (G5 visual PDF)."""

from __future__ import annotations

import secrets
import time
from dataclasses import dataclass
from uuid import UUID

from app.dashboard import service as dash_service

EXPORT_TOKEN_TTL_SECONDS = 300


@dataclass
class _ExportTokenRecord:
    dashboard_id: UUID
    issued_at: float


_store: dict[str, _ExportTokenRecord] = {}


class ExportTokenError(dash_service.DashboardError):
    pass


def issue_export_token(dashboard_id: UUID) -> str:
    _purge_expired()
    token = secrets.token_urlsafe(32)
    _store[token] = _ExportTokenRecord(dashboard_id=dashboard_id, issued_at=time.time())
    return token


def require_export_token(token: str, dashboard_id: UUID) -> None:
    record = _store.get(token)
    if record is None:
        raise ExportTokenError("DASH_EXPORT_TOKEN_INVALID", "Export token invalid", 403)
    if record.dashboard_id != dashboard_id:
        raise ExportTokenError("DASH_EXPORT_TOKEN_MISMATCH", "Export token mismatch", 403)
    if time.time() - record.issued_at > EXPORT_TOKEN_TTL_SECONDS:
        _store.pop(token, None)
        raise ExportTokenError("DASH_EXPORT_TOKEN_EXPIRED", "Export token expired", 403)


def resolve_export_actor_id() -> str:
    return "export-renderer"


def _purge_expired() -> None:
    now = time.time()
    expired = [key for key, rec in _store.items() if now - rec.issued_at > EXPORT_TOKEN_TTL_SECONDS]
    for key in expired:
        _store.pop(key, None)


def reset_export_tokens_for_tests() -> None:
    _store.clear()
