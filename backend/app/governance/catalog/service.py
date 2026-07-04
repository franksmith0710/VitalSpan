from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.governance.catalog.models import (
    SEED_CATEGORIES,
    VALID_CATEGORY_CODES,
    BusRegistration,
    CatalogCategory,
    CatalogEntry,
)
from app.governance.catalog.schemas import (
    BusRegisterOut,
    CatalogEntryCreate,
    CatalogEntryOut,
    CatalogListResponse,
    CategoryListResponse,
    CatalogCategoryOut,
)
from app.governance.bus.poc import BusPoCAdapter, InMemoryBusPoCAdapter
from app.core.logging import trace_id_var


class CatalogError(Exception):
    def __init__(self, code: str, message: str, status: int = 400) -> None:
        self.code = code
        self.message = message
        self.status = status
        super().__init__(message)


def _ensure_seed_categories(db: Session) -> None:
    count = db.scalar(select(func.count()).select_from(CatalogCategory)) or 0
    if count > 0:
        return
    for code, name, kind, description in SEED_CATEGORIES:
        db.add(CatalogCategory(code=code, name=name, kind=kind, description=description))
    db.commit()


def _entry_to_out(row: CatalogEntry) -> CatalogEntryOut:
    return CatalogEntryOut(
        id=row.id,
        name=row.name,
        http_method=row.http_method,
        path=row.path,
        category_codes=row.category_codes,
        openapi_operation_id=row.openapi_operation_id,
        status=row.status,
        created_at=row.created_at,
    )


def list_categories(db: Session) -> CategoryListResponse:
    _ensure_seed_categories(db)
    rows = db.scalars(select(CatalogCategory).order_by(CatalogCategory.code)).all()
    return CategoryListResponse(items=[CatalogCategoryOut.model_validate(r) for r in rows])


def create_entry(db: Session, payload: CatalogEntryCreate) -> CatalogEntryOut:
    _ensure_seed_categories(db)
    invalid = set(payload.category_codes) - VALID_CATEGORY_CODES
    if invalid:
        raise CatalogError(
            "CATALOG_INVALID_CATEGORY",
            f"Unknown categories: {sorted(invalid)}",
            400,
        )
    row = CatalogEntry(
        name=payload.name,
        http_method=payload.http_method,
        path=payload.path,
        category_codes=payload.category_codes,
        openapi_operation_id=payload.openapi_operation_id,
        status=payload.status,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _entry_to_out(row)


def list_entries(
    db: Session,
    *,
    category: str | None,
    limit: int,
    offset: int,
) -> CatalogListResponse:
    _ensure_seed_categories(db)
    rows = list(db.scalars(select(CatalogEntry).order_by(CatalogEntry.created_at.desc())).all())
    if category is not None:
        rows = [r for r in rows if category in r.category_codes]
    total = len(rows)
    page = rows[offset : offset + limit]
    return CatalogListResponse(
        items=[_entry_to_out(r) for r in page],
        total=total,
        limit=limit,
        offset=offset,
    )


def get_entry(db: Session, entry_id: uuid.UUID) -> CatalogEntryOut:
    row = db.scalar(select(CatalogEntry).where(CatalogEntry.id == entry_id))
    if row is None:
        raise CatalogError("CATALOG_ENTRY_NOT_FOUND", "Catalog entry not found", 404)
    return _entry_to_out(row)


_default_bus_adapter: BusPoCAdapter = InMemoryBusPoCAdapter()


def register_entry_to_bus(
    db: Session,
    entry_id: uuid.UUID,
    *,
    adapter: BusPoCAdapter | None = None,
) -> BusRegisterOut:
    try:
        entry = get_entry(db, entry_id)
    except CatalogError:
        raise CatalogError("CATALOG_ENTRY_NOT_FOUND", "Catalog entry not found", 404) from None

    if entry.status == "draft":
        raise CatalogError("BUS_ENTRY_NOT_PUBLISHABLE", "Draft entry cannot be published", 400)

    trace_id = trace_id_var.get() or uuid.uuid4().hex
    bus = adapter or _default_bus_adapter
    result = bus.register(entry=entry, trace_id=trace_id)

    if result.status == "failed":
        code = result.error_code or "BUS_REGISTRATION_FAILED"
        status = 502 if code == "BUS_REGISTRATION_REJECTED" else 400
        if code == "BUS_ENTRY_NOT_PUBLISHABLE":
            status = 400
        raise CatalogError(code, result.error_message or "Bus registration failed", status)

    row = BusRegistration(
        catalog_entry_id=entry_id,
        status="succeeded",
        trace_id=trace_id,
        bus_payload=result.bus_payload,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return BusRegisterOut(
        id=row.id,
        status=row.status,
        trace_id=row.trace_id,
        bus_response=result.bus_payload,
    )
