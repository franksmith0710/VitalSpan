from __future__ import annotations

import json
import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.models import AuthAuditEvent


def record_event(
    session: Session,
    *,
    actor_id: str,
    actor_username: str | None,
    target_type: str,
    target_id: uuid.UUID,
    action: str,
    detail: dict | None,
    trace_id: str,
) -> AuthAuditEvent:
    event = AuthAuditEvent(
        actor_id=actor_id,
        actor_username=actor_username,
        target_type=target_type,
        target_id=target_id,
        action=action,
        detail=json.dumps(detail) if detail is not None else None,
        trace_id=trace_id,
    )
    session.add(event)
    session.flush()
    return event


def list_events(
    session: Session,
    *,
    target_id: uuid.UUID | None = None,
    action: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[AuthAuditEvent], int]:
    base = select(AuthAuditEvent)
    count_stmt = select(func.count()).select_from(AuthAuditEvent)
    if target_id is not None:
        base = base.where(AuthAuditEvent.target_id == target_id)
        count_stmt = count_stmt.where(AuthAuditEvent.target_id == target_id)
    if action is not None:
        base = base.where(AuthAuditEvent.action == action)
        count_stmt = count_stmt.where(AuthAuditEvent.action == action)
    total = session.scalar(count_stmt) or 0
    items = list(
        session.scalars(
            base.order_by(AuthAuditEvent.created_at.desc()).limit(limit).offset(offset)
        )
    )
    return items, total
