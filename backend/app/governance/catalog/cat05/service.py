from __future__ import annotations

from datetime import UTC, datetime

from app.auth.deps import UserContext
from app.governance.catalog.cat05.errors import CAT05_FORBIDDEN, Cat05Error
from app.governance.catalog.cat05.schemas import (
    TicketStatsItemIn,
    TicketStatsItemOut,
    TicketStatsListResponse,
    TicketStatsProbeOut,
    TicketStatsValidateOut,
)

_VALID_STATUS = frozenset({"open", "closed", "pending"})
_store: dict[str, dict] = {}
_USER_TICKET_SCOPE: dict[str, str] = {}
def set_user_ticket_scope(user_id: str, category_key: str) -> None:
    _USER_TICKET_SCOPE[user_id] = category_key


def _validate_payload(payload: TicketStatsItemIn) -> TicketStatsItemIn:
    if not payload.status_filters:
        raise Cat05Error(
            "CAT05_EMPTY_STATUS_FILTERS",
            "statusFilters must not be empty",
            422,
            [{"field": "statusFilters", "message": "must not be empty"}],
        )
    invalid = [s for s in payload.status_filters if s not in _VALID_STATUS]
    if invalid:
        raise Cat05Error(
            "CAT05_INVALID_STATUS",
            "Invalid status filter value",
            422,
            [{"field": "statusFilters", "message": f"invalid: {invalid[0]}"}],
        )
    return payload


def _assert_ticket_access(user: UserContext, category_key: str, *, write: bool) -> None:
    roles = set(user.roles)
    if roles.intersection({"admin", "analyst"}):
        return
    if "enterprise" in roles:
        expected = _USER_TICKET_SCOPE.get(user.id, "TICKET_DEFAULT")
        if category_key != expected:
            raise Cat05Error(CAT05_FORBIDDEN, "enterprise user cannot access ticket category", 403)
        return
    if write:
        raise Cat05Error(CAT05_FORBIDDEN, "viewer cannot create ticket stats", 403)


def validate_ticket_item(payload: TicketStatsItemIn) -> TicketStatsValidateOut:
    item = _validate_payload(payload)
    return TicketStatsValidateOut(
        valid=True,
        category_key=item.ticket_category_key,
        status_count=len(item.status_filters),
    )


def create_ticket_item(payload: TicketStatsItemIn, user: UserContext) -> TicketStatsItemOut:
    item = _validate_payload(payload)
    key = item.ticket_category_key
    _assert_ticket_access(user, key, write=True)
    if key in _store:
        raise Cat05Error("CAT05_KEY_CONFLICT", f"ticketCategoryKey already exists: {key}", 409)
    _store[key] = item.model_dump(by_alias=True, mode="json")
    return TicketStatsItemOut.model_validate(_store[key])


def list_ticket_items(limit: int, offset: int) -> TicketStatsListResponse:
    items = list(_store.values())
    page = items[offset : offset + limit]
    return TicketStatsListResponse(
        items=[TicketStatsItemOut.model_validate(i) for i in page],
        total=len(items),
    )


def get_ticket_stats(key: str, user: UserContext) -> TicketStatsProbeOut:
    if key not in _store:
        raise Cat05Error("CAT05_NOT_FOUND", f"ticketCategoryKey not found: {key}", 404)
    _assert_ticket_access(user, key, write=False)
    return TicketStatsProbeOut(open=12, closed=3, pending=5, sampled_at=datetime.now(UTC))


from app.governance.catalog.cat05.probe import Cat05ProbeResult, probe_ticket_stats_budget_ms  # noqa: F401, E402
