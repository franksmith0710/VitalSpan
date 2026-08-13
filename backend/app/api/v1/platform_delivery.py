from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.auth.audit.write_hooks import audit_kwargs
from app.auth.deps import UserContext, require_permission
from app.auth.models import get_meta_session
from app.core.platform_config import email_service
from app.core.platform_config.schemas import EmailDeliveryConfigOut, EmailDeliveryConfigPut

router = APIRouter(prefix="/platform/delivery", tags=["platform"])


def _db() -> Session:
    session = get_meta_session()
    try:
        yield session
    finally:
        session.close()


def _error(exc: email_service.PlatformConfigError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status,
        content={"code": exc.code, "message": exc.message, "detail": None},
    )


@router.get("/email", response_model=EmailDeliveryConfigOut)
def get_email_delivery_config(
    _: Annotated[UserContext, Depends(require_permission("system:platform_connect.read"))],
    db: Annotated[Session, Depends(_db)],
) -> EmailDeliveryConfigOut:
    return email_service.get_email_config(db)


@router.put("/email", response_model=EmailDeliveryConfigOut)
def put_email_delivery_config(
    payload: EmailDeliveryConfigPut,
    actor: Annotated[UserContext, Depends(require_permission("system:platform_connect.manage"))],
    db: Annotated[Session, Depends(_db)],
) -> EmailDeliveryConfigOut | JSONResponse:
    try:
        return email_service.save_email_config(
            db,
            payload,
            **audit_kwargs(actor.id, actor.username),
        )
    except email_service.PlatformConfigError as exc:
        return _error(exc)


@router.delete("/email", response_model=EmailDeliveryConfigOut)
def delete_email_delivery_config(
    actor: Annotated[UserContext, Depends(require_permission("system:platform_connect.manage"))],
    db: Annotated[Session, Depends(_db)],
) -> EmailDeliveryConfigOut:
    return email_service.clear_email_config(
        db,
        **audit_kwargs(actor.id, actor.username),
    )
