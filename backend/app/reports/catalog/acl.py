from __future__ import annotations

import time
import uuid

from app.auth.deps import UserContext
from app.reports.catalog.errors import ReportCatalogError

_NODE_OWNERS: dict[uuid.UUID, str] = {}
_ARTIFACT_OWNERS: dict[str, str] = {}
_ACL_BUDGET_MS = 10


def register_node_owner(node_id: uuid.UUID, actor_id: str) -> None:
    _NODE_OWNERS[node_id] = actor_id


def assert_catalog_action(actor: UserContext, action: str, node_id: uuid.UUID | None = None) -> None:
    roles = set(actor.roles)
    if "admin" in roles:
        return
    if action == "read":
        return
    if action == "create":
        if "editor" not in roles:
            raise ReportCatalogError("RPT_CATALOG_FORBIDDEN", "create requires editor or admin", 403)
        return
    if node_id is None:
        raise ReportCatalogError("RPT_CATALOG_FORBIDDEN", "node required for write action", 403)
    owner = _NODE_OWNERS.get(node_id)
    if action == "delete":
        if "owner" in roles and owner == actor.id:
            return
        raise ReportCatalogError("RPT_CATALOG_FORBIDDEN", "delete requires owner or admin", 403)
    if action in {"update", "move"}:
        if "editor" in roles and (owner is None or owner == actor.id):
            return
        if "owner" in roles and owner == actor.id:
            return
        raise ReportCatalogError("RPT_CATALOG_FORBIDDEN", "write requires owner/editor or admin", 403)
    raise ReportCatalogError("RPT_CATALOG_FORBIDDEN", f"action {action} denied", 403)


def probe_acl_budget_ms(actor: UserContext, action: str, node_id: uuid.UUID) -> float:
    start = time.perf_counter()
    assert_catalog_action(actor, action, node_id)
    return (time.perf_counter() - start) * 1000.0


def register_artifact_owner(artifact_ref: str, actor_id: str) -> None:
    _ARTIFACT_OWNERS[artifact_ref] = actor_id


def assert_artifact_access(actor: UserContext, artifact_ref: str) -> None:
    if "admin" in set(actor.roles):
        return
    owner = _ARTIFACT_OWNERS.get(artifact_ref)
    if owner is not None and owner == actor.id:
        return
    raise ReportCatalogError("RPT_ARTIFACT_FORBIDDEN", "artifact access denied", 403)
