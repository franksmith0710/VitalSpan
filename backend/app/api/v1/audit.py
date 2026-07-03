from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth.audit import service as audit_service
from app.auth.deps import UserContext, get_current_user
from app.auth.models import get_meta_session
from app.auth.schemas import AuditEventOut, AuditListResponse

router = APIRouter(prefix="/audit", tags=["auth"])


def _db() -> Session:
    session = get_meta_session()
    try:
        yield session
    finally:
        session.close()


@router.get("/events", response_model=AuditListResponse)
def list_audit_events(
    _: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
    target_id: uuid.UUID | None = None,
    action: str | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> AuditListResponse:
    items, total = audit_service.list_events(
        db, target_id=target_id, action=action, limit=limit, offset=offset
    )
    return AuditListResponse(
        items=[AuditEventOut.model_validate(e) for e in items],
        total=total,
    )
