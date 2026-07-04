from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Protocol

from app.governance.catalog.schemas import CatalogEntryOut


@dataclass(frozen=True)
class BusRegisterResult:
    status: str  # succeeded | failed
    bus_id: str | None = None
    registered_at: str | None = None
    error_code: str | None = None
    error_message: str | None = None
    bus_payload: dict | None = None


class BusPoCAdapter(Protocol):
    def register(self, *, entry: CatalogEntryOut, trace_id: str) -> BusRegisterResult: ...


class InMemoryBusPoCAdapter:
    def register(self, *, entry: CatalogEntryOut, trace_id: str) -> BusRegisterResult:
        if entry.status == "draft":
            return BusRegisterResult(
                status="failed",
                error_code="BUS_ENTRY_NOT_PUBLISHABLE",
                error_message="Draft entry",
            )
        if "force-fail" in entry.path:
            return BusRegisterResult(
                status="failed",
                error_code="BUS_REGISTRATION_REJECTED",
                error_message="Bus rejected",
            )
        bus_id = str(uuid.uuid4())
        now = datetime.now(UTC).isoformat()
        return BusRegisterResult(
            status="succeeded",
            bus_id=bus_id,
            registered_at=now,
            bus_payload={"busId": bus_id, "registeredAt": now, "traceId": trace_id},
        )
