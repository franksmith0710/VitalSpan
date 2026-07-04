from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.metadata.dimensions.models import DimensionDict, DimensionValue
from app.metadata.dimensions.schemas import (
    DIM_STATUS_VALUES,
    DimensionCreate,
    DimensionError,
    DimensionUpdate,
    DimensionValueItem,
)


def _validate_status(status: str | None) -> str:
    if status is not None and status not in DIM_STATUS_VALUES:
        raise DimensionError(
            "META_DIM_INVALID_STATUS",
            "Invalid dimension status",
            422,
            fields=[{"field": "status", "message": f"Must be one of {sorted(DIM_STATUS_VALUES)}"}],
        )
    return status or "active"


def list_dimensions(
    session: Session,
    code_prefix: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> tuple[list[DimensionDict], int]:
    capped = min(max(limit, 1), 500)
    base = select(DimensionDict).order_by(DimensionDict.code)
    count_stmt = select(func.count()).select_from(DimensionDict)
    if code_prefix:
        base = base.where(DimensionDict.code.startswith(code_prefix))
        count_stmt = count_stmt.where(DimensionDict.code.startswith(code_prefix))
    total = session.scalar(count_stmt) or 0
    items = list(session.scalars(base.limit(capped).offset(max(offset, 0))))
    return items, total


def create_dimension(session: Session, payload: DimensionCreate) -> DimensionDict:
    if not payload.code.strip():
        raise DimensionError(
            "META_DIM_INVALID_CODE",
            "Dimension code must not be blank",
            422,
            fields=[{"field": "code", "message": "must not be blank"}],
        )
    if not payload.name.strip():
        raise DimensionError(
            "META_DIM_INVALID_NAME",
            "Dimension name must not be blank",
            422,
            fields=[{"field": "name", "message": "must not be blank"}],
        )
    status = _validate_status(payload.status)
    dimension = DimensionDict(
        code=payload.code,
        name=payload.name,
        description=payload.description,
        status=status,
    )
    session.add(dimension)
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise DimensionError("META_DIM_CODE_CONFLICT", "Dimension code already exists", 409) from exc
    session.refresh(dimension)
    return dimension


def get_dimension(session: Session, dimension_id: uuid.UUID) -> DimensionDict:
    dimension = session.get(DimensionDict, dimension_id)
    if dimension is None:
        raise DimensionError("META_DIM_NOT_FOUND", "Dimension not found", 404)
    return dimension


def update_dimension(
    session: Session, dimension_id: uuid.UUID, payload: DimensionUpdate,
) -> DimensionDict:
    if not payload.name.strip():
        raise DimensionError(
            "META_DIM_INVALID_NAME",
            "Dimension name must not be blank",
            422,
            fields=[{"field": "name", "message": "must not be blank"}],
        )
    dimension = get_dimension(session, dimension_id)
    dimension.name = payload.name
    dimension.description = payload.description
    if payload.status is not None:
        dimension.status = _validate_status(payload.status)
    session.commit()
    session.refresh(dimension)
    return dimension


def delete_dimension(session: Session, dimension_id: uuid.UUID) -> None:
    dimension = get_dimension(session, dimension_id)
    session.delete(dimension)
    session.commit()


def list_values(
    session: Session,
    dimension_id: uuid.UUID,
    limit: int = 100,
    offset: int = 0,
) -> tuple[list[DimensionValue], int]:
    get_dimension(session, dimension_id)
    capped = min(max(limit, 1), 500)
    base = (
        select(DimensionValue)
        .where(DimensionValue.dimension_id == dimension_id)
        .order_by(DimensionValue.sort_order, DimensionValue.code)
    )
    count_stmt = (
        select(func.count())
        .select_from(DimensionValue)
        .where(DimensionValue.dimension_id == dimension_id)
    )
    total = session.scalar(count_stmt) or 0
    items = list(session.scalars(base.limit(capped).offset(max(offset, 0))))
    return items, total


def _validate_value_item(item: DimensionValueItem) -> None:
    from app.metadata.dimensions.schemas import DIM_CODE_RE
    if not item.code or not DIM_CODE_RE.match(item.code):
        raise DimensionError(
            "META_DIM_VALUE_INVALID_CODE",
            "Invalid dimension value code",
            422,
            fields=[{"field": "code", "message": "must match ^[a-z][a-z0-9_]{1,63}$"}],
        )
    if not item.label:
        raise DimensionError(
            "META_DIM_VALUE_INVALID_LABEL",
            "Dimension value label must not be blank",
            422,
            fields=[{"field": "label", "message": "must not be blank"}],
        )


def register_values(
    session: Session,
    dimension_id: uuid.UUID,
    items: list[DimensionValueItem],
) -> list[DimensionValue]:
    get_dimension(session, dimension_id)
    seen: set[str] = set()
    for item in items:
        _validate_value_item(item)
        if item.code in seen:
            raise DimensionError(
                "META_DIM_VALUE_DUPLICATE_BATCH",
                "Duplicate value code in batch",
                422,
                fields=[{"field": "code", "message": f"duplicate: {item.code}"}],
            )
        seen.add(item.code)
    created: list[DimensionValue] = []
    for item in items:
        value = DimensionValue(
            dimension_id=dimension_id,
            code=item.code,
            label=item.label,
            sort_order=item.sort_order,
        )
        session.add(value)
        created.append(value)
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise DimensionError(
            "META_DIM_VALUE_CODE_CONFLICT",
            "Dimension value code already exists",
            409,
        ) from exc
    for value in created:
        session.refresh(value)
    return created


def delete_value(session: Session, dimension_id: uuid.UUID, value_id: uuid.UUID) -> None:
    get_dimension(session, dimension_id)
    value = session.get(DimensionValue, value_id)
    if value is None or value.dimension_id != dimension_id:
        raise DimensionError("META_DIM_VALUE_NOT_FOUND", "Dimension value not found", 404)
    session.delete(value)
    session.commit()
