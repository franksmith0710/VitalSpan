from __future__ import annotations

import uuid
import uuid as uuid_mod

from sqlalchemy.orm import Session

from app.auth.audit import service as audit_service
from app.core.logging import trace_id_var


def audit_kwargs(actor_id: str, actor_username: str | None) -> dict[str, str | None]:
    trace = trace_id_var.get() or uuid_mod.uuid4().hex
    return {"actor_id": actor_id, "actor_username": actor_username, "trace_id": trace}


def record_platform_event(
    session: Session,
    *,
    actor_id: str,
    actor_username: str | None,
    target_type: str,
    target_id: uuid.UUID,
    action: str,
    detail: dict | None,
    trace_id: str,
) -> None:
    audit_service.record_event(
        session,
        actor_id=actor_id,
        actor_username=actor_username,
        target_type=target_type,
        target_id=target_id,
        action=action,
        detail=detail,
        trace_id=trace_id,
    )
