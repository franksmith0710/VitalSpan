from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
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


def _audit_error_response(exc: audit_service.AuditError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status,
        content={"code": exc.code, "message": exc.message, "detail": None},
    )


@router.get("/events", response_model=AuditListResponse)
def list_audit_events(
    actor: Annotated[UserContext, Depends(get_current_user)],
    db: Annotated[Session, Depends(_db)],
    target_id: uuid.UUID | None = None,
    action: str | None = None,
    target_type: str | None = None,
    actor_id: str | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> AuditListResponse | JSONResponse:
    try:
        audit_service.assert_audit_admin(actor.roles)
    except audit_service.AuditError as exc:
        return _audit_error_response(exc)
    items, total = audit_service.list_events(
        db,
        target_id=target_id,
        action=action,
        target_type=target_type,
        actor_id=actor_id,
        limit=limit,
        offset=offset,
    )
    return AuditListResponse(
        items=[AuditEventOut.model_validate(e) for e in items],
        total=total,
    )
