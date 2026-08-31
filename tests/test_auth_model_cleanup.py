from __future__ import annotations

import os
import uuid

import pytest
from sqlalchemy import select

from app.auth import cleanup as auth_cleanup
from app.auth.audit.retention import purge_audit_events_before
from app.auth.resources import service as grant_service
from app.auth.schemas import ResourceGrantCreate
from app.auth.models import (
    AuthAuditEvent,
    AuthColumnMask,
    AuthDimensionType,
    AuthResourceGrant,
    AuthRlsColumnBinding,
    AuthRole,
    AuthUserResourceGrant,
    Base,
    get_meta_engine,
    get_meta_session,
)
from app.core.config import get_settings

_CLEANUP_SQLITE = "sqlite+pysqlite:///file:auth_cleanup_test?mode=memory&cache=shared&uri=true"


@pytest.fixture(scope="module", autouse=True)
def cleanup_sqlite_env():
    previous = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = _CLEANUP_SQLITE
    get_settings.cache_clear()
    get_meta_engine.cache_clear()
    Base.metadata.create_all(get_meta_engine())
    yield
    if previous is None:
        os.environ.pop("DATABASE_URL", None)
    else:
        os.environ["DATABASE_URL"] = previous
    get_settings.cache_clear()
    get_meta_engine.cache_clear()


def test_purge_grants_for_resource_removes_role_and_user_rows():
    session = get_meta_session()
    try:
        role = AuthRole(code="cleanup_role", name="Cleanup")
        session.add(role)
        session.flush()
        resource_id = uuid.uuid4()
        session.add(
            AuthResourceGrant(
                role_id=role.id,
                resource_type="dashboard",
                resource_id=resource_id,
            )
        )
        user_id = uuid.uuid4()
        session.add(
            AuthUserResourceGrant(
                user_id=user_id,
                resource_type="dashboard",
                resource_id=resource_id,
                effect="add",
            )
        )
        session.commit()

        deleted = auth_cleanup.purge_grants_for_resource(
            session,
            resource_type="dashboard",
            resource_id=resource_id,
        )
        session.commit()
        assert deleted == 2
        assert session.scalar(select(AuthResourceGrant).limit(1)) is None
        assert session.scalar(select(AuthUserResourceGrant).limit(1)) is None
    finally:
        session.close()


def test_purge_datasource_scope_metadata():
    session = get_meta_session()
    try:
        ds_id = uuid.uuid4()
        dim = AuthDimensionType(
            code="org_cleanup",
            name="Org",
            value_type="org_ref",
            org_dimension=True,
        )
        session.add(dim)
        session.flush()
        session.add(
            AuthColumnMask(
                datasource_id=ds_id,
                dataset_id=None,
                table_name="t",
                column_name="c",
                mask_strategy="hide",
            )
        )
        session.add(
            AuthRlsColumnBinding(
                datasource_id=ds_id,
                dataset_id=None,
                table_name="t",
                dimension_type_id=dim.id,
                column_name="org_id",
            )
        )
        session.commit()

        deleted = auth_cleanup.purge_datasource_scope_metadata(session, ds_id)
        session.commit()
        assert deleted == 2
        assert session.scalar(select(AuthColumnMask).limit(1)) is None
        assert session.scalar(select(AuthRlsColumnBinding).limit(1)) is None
    finally:
        session.close()


def test_purge_audit_events_before():
    session = get_meta_session()
    try:
        from datetime import UTC, datetime, timedelta

        old = AuthAuditEvent(
            actor_id="a",
            target_type="user",
            target_id=uuid.uuid4(),
            action="test.old",
            trace_id="t1",
            created_at=datetime.now(UTC) - timedelta(days=400),
        )
        recent = AuthAuditEvent(
            actor_id="a",
            target_type="user",
            target_id=uuid.uuid4(),
            action="test.recent",
            trace_id="t2",
            created_at=datetime.now(UTC) - timedelta(days=1),
        )
        session.add_all([old, recent])
        session.commit()

        deleted = purge_audit_events_before(session, retention_days=365)
        session.commit()
        assert deleted == 1
        remaining = session.scalars(select(AuthAuditEvent)).all()
        assert len(remaining) == 1
        assert remaining[0].action == "test.recent"
    finally:
        session.close()


def test_create_grant_rejects_invalid_resource_type():
    session = get_meta_session()
    try:
        role = AuthRole(code="grant_type_guard", name="Guard")
        session.add(role)
        session.commit()
        payload = ResourceGrantCreate.model_construct(
            role_id=role.id,
            resource_type="bogus",
            resource_id=uuid.uuid4(),
        )
        with pytest.raises(grant_service.GrantError) as exc:
            grant_service.create_grant(
                session,
                payload,
                actor_id="admin",
                actor_username="admin",
                trace_id="t",
            )
        assert exc.value.code == "INVALID_RESOURCE_TYPE"
    finally:
        session.close()
