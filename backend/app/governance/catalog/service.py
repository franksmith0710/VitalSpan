from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.governance.catalog.models import (
    SEED_CATEGORIES,
    VALID_CATEGORY_CODES,
    CatalogCategory,
    CatalogEntry,
)
from app.governance.catalog.schemas import (
    CatalogEntryCreate,
    CatalogEntryOut,
    CatalogListResponse,
    CategoryListResponse,
    CatalogCategoryOut,
)


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
