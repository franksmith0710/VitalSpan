from __future__ import annotations

import uuid

from sqlalchemy import false
from sqlalchemy.orm import Session
from sqlalchemy.sql import Select

from app.auth.resources.service import (
    VisibilityError,
    ensure_resource_visible,
    list_visible_resource_ids,
)
from app.datasources.models import DataSource

ADMIN_BYPASS_ROLES = frozenset({"admin"})
RESOURCE_TYPE = "datasource"


def list_visible_ids(session: Session, role_codes: list[str]) -> list[uuid.UUID] | None:
    if ADMIN_BYPASS_ROLES.intersection(role_codes):
        return None
    return list_visible_resource_ids(session, role_codes, RESOURCE_TYPE)


def assert_visible(session: Session, role_codes: list[str], data_source_id: uuid.UUID) -> None:
    if ADMIN_BYPASS_ROLES.intersection(role_codes):
        return
    ensure_resource_visible(session, role_codes, RESOURCE_TYPE, data_source_id)


def apply_list_filter(stmt: Select, session: Session, role_codes: list[str]) -> Select:
    visible = list_visible_ids(session, role_codes)
    if visible is None:
        return stmt
    if not visible:
        return stmt.where(false())
    return stmt.where(DataSource.id.in_(visible))


__all__ = [
    "ADMIN_BYPASS_ROLES",
    "RESOURCE_TYPE",
    "VisibilityError",
    "apply_list_filter",
    "assert_visible",
    "list_visible_ids",
]
