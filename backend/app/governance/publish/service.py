from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.nfr.errors import (
    GOV_PUBLISH_ALREADY_PENDING,
    GOV_PUBLISH_ENTRY_NOT_FOUND,
    GOV_PUBLISH_INVALID_TRANSITION,
)
from app.governance.catalog.models import CatalogEntry
from app.governance.publish.errors import PublishError
from app.governance.publish.notifications import emit_publish_notification
from app.governance.publish.schemas import PublishActionOut, PublishStatusOut

_ALLOWED: dict[str, frozenset[str]] = {
    "draft": frozenset({"submit"}),
    "pending_publish": frozenset({"approve", "reject"}),
    "published": frozenset(),
}


def _get_row(db: Session, entry_id: uuid.UUID) -> CatalogEntry:
    row = db.scalar(select(CatalogEntry).where(CatalogEntry.id == entry_id))
    if row is None:
        raise PublishError(GOV_PUBLISH_ENTRY_NOT_FOUND, "Catalog entry not found", 404)
    return row


def get_publish_status(db: Session, entry_id: uuid.UUID) -> PublishStatusOut:
    row = _get_row(db, entry_id)
    return PublishStatusOut(
        id=row.id,
        status=row.status,
        allowedActions=sorted(_ALLOWED.get(row.status, frozenset())),
    )


def submit_entry(db: Session, entry_id: uuid.UUID) -> PublishActionOut:
    row = _get_row(db, entry_id)
    if row.status == "pending_publish":
        raise PublishError(GOV_PUBLISH_ALREADY_PENDING, "Entry already pending publish", 409)
    if row.status != "draft":
        raise PublishError(GOV_PUBLISH_INVALID_TRANSITION, f"Cannot submit from {row.status}", 400)
    row.status = "pending_publish"
    db.commit()
    db.refresh(row)
    emit_publish_notification(entry_id, "submitted")
    return PublishActionOut(id=row.id, status=row.status)


def approve_entry(db: Session, entry_id: uuid.UUID) -> PublishActionOut:
    row = _get_row(db, entry_id)
    if row.status == "published":
        return PublishActionOut(id=row.id, status=row.status)
    if row.status != "pending_publish":
        raise PublishError(GOV_PUBLISH_INVALID_TRANSITION, f"Cannot approve from {row.status}", 400)
    row.status = "published"
    db.commit()
    db.refresh(row)
    emit_publish_notification(entry_id, "approved")
    return PublishActionOut(id=row.id, status=row.status)


def reject_entry(db: Session, entry_id: uuid.UUID) -> PublishActionOut:
    row = _get_row(db, entry_id)
    if row.status != "pending_publish":
        raise PublishError(GOV_PUBLISH_INVALID_TRANSITION, f"Cannot reject from {row.status}", 400)
    row.status = "draft"
    db.commit()
    db.refresh(row)
    emit_publish_notification(entry_id, "rejected")
    return PublishActionOut(id=row.id, status=row.status)
