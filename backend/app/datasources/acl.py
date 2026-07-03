from __future__ import annotations

import uuid

from sqlalchemy.orm import Session


def list_visible_ids(session: Session, role_codes: list[str]) -> list[uuid.UUID] | None:
    return None


def assert_visible(session: Session, role_codes: list[str], data_source_id: uuid.UUID) -> None:
    return None
