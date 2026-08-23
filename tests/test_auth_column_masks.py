from __future__ import annotations

import os
import uuid

import pytest
from sqlalchemy import text

from app.auth.masking import service as mask_service
from app.auth.models import Base, get_meta_engine, get_meta_session

_MASK_SQLITE = "sqlite+pysqlite:///file:auth_column_masks_test?mode=memory&cache=shared&uri=true"


@pytest.fixture(scope="module", autouse=True)
def mask_sqlite_env():
    previous = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = _MASK_SQLITE
    from app.core.config import get_settings

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


@pytest.fixture(autouse=True)
def clean_masks():
    yield
    with get_meta_engine().begin() as conn:
        conn.execute(text("DELETE FROM auth_column_masks"))


def test_apply_masks_hide_partial_hash():
    session = get_meta_session()
    try:
        ds_id = uuid.uuid4()
        mask_service.create_mask(
            session,
            datasource_id=ds_id,
            dataset_id=None,
            table_name="customers",
            column_name="phone",
            mask_strategy="partial",
            actor_id="admin",
            actor_username="admin",
            trace_id="t",
        )
        mask_service.create_mask(
            session,
            datasource_id=ds_id,
            dataset_id=None,
            table_name="customers",
            column_name="ssn",
            mask_strategy="hide",
            actor_id="admin",
            actor_username="admin",
            trace_id="t2",
        )
        cols, rows = mask_service.apply_masks_to_result(
            session,
            columns=["phone", "ssn", "name"],
            rows=[["13800138000", "123456789", "Alice"]],
            datasource_id=ds_id,
            table_name="customers",
        )
        assert cols == ["phone", "ssn", "name"]
        assert rows[0][0] == "1***0"
        assert rows[0][1] is None
        assert rows[0][2] == "Alice"
    finally:
        session.close()


def test_mask_strategy_hash_is_stable():
    session = get_meta_session()
    try:
        ds_id = uuid.uuid4()
        mask_service.create_mask(
            session,
            datasource_id=ds_id,
            dataset_id=None,
            table_name="t",
            column_name="email",
            mask_strategy="hash",
            actor_id="admin",
            actor_username="admin",
            trace_id="t",
        )
        _, rows = mask_service.apply_masks_to_result(
            session,
            columns=["email"],
            rows=[["secret@example.com"]],
            datasource_id=ds_id,
            table_name="t",
        )
        assert str(rows[0][0]).startswith("#")
        assert len(str(rows[0][0])) == 13
    finally:
        session.close()
