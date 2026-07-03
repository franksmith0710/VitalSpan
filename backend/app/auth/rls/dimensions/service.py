from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.models import AuthDimensionType, AuthOrgNode
from app.auth.schemas import DimensionTypeCreate, DimensionTypeUpdate


class DimensionError(Exception):
    def __init__(self, code: str, message: str, status: int = 400) -> None:
        self.code = code
        self.message = message
        self.status = status
        super().__init__(message)


def _validate_org_ref(session: Session, value_type: str) -> bool:
    if value_type != "org_ref":
        return False
    count = session.scalar(select(func.count()).select_from(AuthOrgNode))
    if not count or count < 1:
        raise DimensionError("ORG_TREE_REQUIRED", "Org tree required for org_ref dimension", 422)
    return True


def list_dimension_types(session: Session) -> list[AuthDimensionType]:
    return list(session.scalars(select(AuthDimensionType).order_by(AuthDimensionType.code)))


def create_dimension_type(session: Session, payload: DimensionTypeCreate) -> AuthDimensionType:
    org_dimension = _validate_org_ref(session, payload.value_type)
    dim = AuthDimensionType(
        code=payload.code,
        name=payload.name,
        value_type=payload.value_type,
        org_dimension=org_dimension,
        description=payload.description,
    )
    session.add(dim)
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise DimensionError("DIMENSION_CODE_CONFLICT", "Dimension code already exists", 409) from exc
    session.refresh(dim)
    return dim


def get_dimension_type(session: Session, dim_id: uuid.UUID) -> AuthDimensionType:
    dim = session.get(AuthDimensionType, dim_id)
    if dim is None:
        raise DimensionError("DIMENSION_NOT_FOUND", "Dimension type not found", 404)
    return dim


def update_dimension_type(
    session: Session, dim_id: uuid.UUID, payload: DimensionTypeUpdate
) -> AuthDimensionType:
    dim = get_dimension_type(session, dim_id)
    dim.name = payload.name
    dim.description = payload.description
    session.commit()
    session.refresh(dim)
    return dim


def delete_dimension_type(session: Session, dim_id: uuid.UUID) -> None:
    dim = get_dimension_type(session, dim_id)
    session.delete(dim)
    session.commit()
