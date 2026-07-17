from __future__ import annotations

import secrets
import uuid
from datetime import UTC, datetime, timedelta
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.auth.deps import UserContext
from app.integration.errors import IntegrationError
from app.viz.embed import _ORIGIN_RE

_TOKEN_STORE: dict[str, dict] = {}


class EmbedTokenIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    chart_id: uuid.UUID | None = Field(default=None, alias="chartId")
    dashboard_id: uuid.UUID | None = Field(default=None, alias="dashboardId")
    allowed_origins: list[str] = Field(default_factory=list, alias="allowedOrigins")
    expires_in_sec: int = Field(default=3600, alias="expiresInSec", ge=60, le=86400)
    theme: Literal["light", "dark"] = "light"


class EmbedTokenOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    token: str
    expires_at: str = Field(alias="expiresAt")
    embed_url: str = Field(alias="embedUrl")
    sdk_params: dict = Field(alias="sdkParams")


def _assert_embed_issue(actor: UserContext) -> None:
    if "admin" in actor.roles or "dashboard:share" in actor.roles:
        return
    raise IntegrationError(
        "EMBED_TOKEN_FORBIDDEN",
        "Embed token requires admin or dashboard:share role",
        403,
    )


def _validate_origins(origins: list[str]) -> None:
    invalid = [
        {"field": f"allowedOrigins[{i}]", "message": f"invalid origin: {o}"}
        for i, o in enumerate(origins)
        if not _ORIGIN_RE.match(o)
    ]
    if invalid:
        raise IntegrationError(
            "EMBED_INVALID_ORIGIN", "invalid origin", 422, fields=invalid
        )


def issue_embed_token(
    actor: UserContext,
    payload: EmbedTokenIn,
    origin_header: str | None,
) -> EmbedTokenOut:
    _assert_embed_issue(actor)
    if payload.chart_id is None and payload.dashboard_id is None:
        raise IntegrationError(
            "EMBED_MISSING_TARGET",
            "chartId or dashboardId is required",
            422,
            fields=[
                {"field": "chartId", "message": "required"},
                {"field": "dashboardId", "message": "required"},
            ],
        )
    if payload.chart_id is not None and payload.dashboard_id is not None:
        raise IntegrationError(
            "EMBED_TARGET_CONFLICT",
            "chartId conflicts with dashboardId",
            422,
            fields=[
                {"field": "chartId", "message": "conflict"},
                {"field": "dashboardId", "message": "conflict"},
            ],
        )
    _validate_origins(payload.allowed_origins)
    if origin_header and payload.allowed_origins:
        if origin_header not in payload.allowed_origins:
            raise IntegrationError(
                "EMBED_ORIGIN_DENIED",
                "Origin not in allowedOrigins",
                403,
            )
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(UTC) + timedelta(seconds=payload.expires_in_sec)
    container_id = f"embed-{token[:8]}"
    api_base = "/api/v1"
    _TOKEN_STORE[token] = {
        "expires_at": expires_at,
        "container_id": container_id,
        "theme": payload.theme,
        "api_base": api_base,
        "allowed_origins": list(payload.allowed_origins),
        "chart_id": payload.chart_id,
        "dashboard_id": payload.dashboard_id,
        "actor_id": actor.id,
        "actor_username": actor.username,
        "actor_roles": list(actor.roles),
        "actor_permissions": list(actor.permissions),
        "actor_is_root": actor.is_root,
    }
    if payload.chart_id is not None:
        embed_path = f"/embed/chart/{payload.chart_id}?token={token}"
    elif payload.dashboard_id is not None:
        embed_path = f"/embed/chart/{payload.dashboard_id}?token={token}"
    else:
        embed_path = f"/embed/chart?token={token}"
    return EmbedTokenOut(
        token=token,
        expires_at=expires_at.isoformat(),
        embed_url=embed_path,
        sdk_params={
            "containerId": container_id,
            "theme": payload.theme,
            "apiBase": api_base,
            "token": token,
        },
    )


def require_token_meta(token: str) -> dict:
    row = _TOKEN_STORE.get(token)
    if row is None:
        raise IntegrationError("EMBED_TOKEN_INVALID", "Invalid embed token", 404)
    if datetime.now(UTC) > row["expires_at"]:
        raise IntegrationError("EMBED_TOKEN_EXPIRED", "Embed token expired", 404)
    return row


def resolve_embed_actor(token: str) -> UserContext:
    row = require_token_meta(token)
    return UserContext(
        id=str(row["actor_id"]),
        username=str(row.get("actor_username") or ""),
        roles=list(row.get("actor_roles") or []),
        permissions=set(row.get("actor_permissions") or []),
        is_root=bool(row.get("actor_is_root")),
    )


def resolve_sdk_params(token: str, origin_header: str | None = None) -> dict:
    row = require_token_meta(token)
    allowed = row.get("allowed_origins") or []
    if allowed and origin_header and origin_header not in allowed:
        raise IntegrationError("EMBED_ORIGIN_DENIED", "Origin not allowed", 403)
    return {
        "containerId": row["container_id"],
        "theme": row["theme"],
        "apiBase": row["api_base"],
        "token": token,
    }
