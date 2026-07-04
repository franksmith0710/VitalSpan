from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.auth.deps import UserContext
from app.governance.bus.adapter import InMemoryBusAdapter
from app.governance.bus.auto_schemas import AutoRegisterOut, FsmState
from app.governance.catalog import service as catalog_service
from app.governance.catalog.schemas import BusRegisterOut

_auto_states: dict[uuid.UUID, FsmState] = {}
_USER_AUTO_BUS_SCOPE: dict[str, str] = {}


def set_user_auto_bus_scope(user_id: str, path_prefix: str) -> None:
    _USER_AUTO_BUS_SCOPE[user_id] = path_prefix


def get_fsm_state(entry_id: uuid.UUID) -> FsmState:
    return _auto_states.get(entry_id, "idle")


def _set_fsm(entry_id: uuid.UUID, state: FsmState) -> None:
    _auto_states[entry_id] = state


def _assert_auto_role(actor: UserContext) -> None:
    if "admin" in actor.roles or "integration" in actor.roles:
        return
    raise catalog_service.CatalogError(
        "GOV_AUTO_BUS_FORBIDDEN",
        "Auto bus registration requires integration or admin role",
        403,
    )


def _assert_entry_path_scope(actor: UserContext, entry_path: str) -> None:
    if "enterprise" not in set(actor.roles):
        return
    prefix = _USER_AUTO_BUS_SCOPE.get(actor.id, "/api/v1/")
    if not entry_path.startswith(prefix):
        raise catalog_service.CatalogError(
            "GOV_AUTO_BUS_FORBIDDEN",
            "enterprise user out of auto bus entry path scope",
            403,
        )


def auto_register(db: Session, actor: UserContext, entry_id: uuid.UUID) -> tuple[AutoRegisterOut, int]:
    _assert_auto_role(actor)
    state = get_fsm_state(entry_id)
    if state in ("failed", "auto_registering"):
        raise catalog_service.CatalogError(
            "GOV_AUTO_BUS_INVALID_TRANSITION",
            f"Cannot auto-register from fsm state {state}",
            409,
        )
    try:
        entry = catalog_service.get_entry(db, entry_id)
    except catalog_service.CatalogError:
        raise catalog_service.CatalogError("CATALOG_ENTRY_NOT_FOUND", "Catalog entry not found", 404) from None

    _assert_entry_path_scope(actor, entry.path)

    if entry.status == "draft":
        raise catalog_service.CatalogError(
            "GOV_AUTO_BUS_NOT_PUBLISHABLE",
            "Draft entry cannot be auto-registered",
            400,
        )

    _set_fsm(entry_id, "auto_registering")
    try:
        out, created = catalog_service.register_entry_to_bus(
            db, entry_id, adapter=InMemoryBusAdapter()
        )
        _set_fsm(entry_id, "succeeded")
        bus_id = _extract_bus_id(out)
        status_code = 201 if created else 200
        return (
            AutoRegisterOut(autoRegistered=True, busId=bus_id, fsmState="succeeded"),
            status_code,
        )
    except catalog_service.CatalogError as exc:
        _set_fsm(entry_id, "failed")
        raise exc


def _extract_bus_id(out: BusRegisterOut) -> str | None:
    payload = out.bus_response or {}
    return payload.get("busId") or payload.get("bus_id") or str(out.id)
