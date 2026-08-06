"""Persistence round-trip via Alembic-backed sqlite."""

from __future__ import annotations

import uuid

import pytest
from sqlalchemy.orm import Session

from app.auth.models import AuthRole, get_meta_engine
from app.views import role_defaults_repo


def test_role_defaults_repo_survives_engine_cache_clear(alembic_meta_engine):
    role_id = uuid.uuid4()
    dash_id = uuid.uuid4()
    with Session(alembic_meta_engine) as db:
        db.add(
            AuthRole(
                id=role_id,
                code="analyst_rt",
                name="Analyst RT",
                is_active=True,
                is_system=False,
                is_root=False,
            )
        )
        db.commit()
        role_defaults_repo.set_role_defaults(
            db,
            str(role_id),
            {"dashboardId": str(dash_id), "reportTemplateNodeId": None, "maxWidgetCount": 24},
        )

    get_meta_engine.cache_clear()
    with Session(get_meta_engine()) as db:
        stored = role_defaults_repo.get_role_defaults(db, str(role_id))

    assert stored is not None
    assert str(stored["dashboardId"]) == str(dash_id)
