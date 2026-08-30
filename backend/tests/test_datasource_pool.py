from __future__ import annotations

import uuid
from unittest.mock import MagicMock

import pytest

from app.datasources.pool import DataSourcePoolManager


class _FlakyConnector:
  def __init__(self) -> None:
    self.open_attempts = 0

  def open_connection(self, **_kwargs):
    self.open_attempts += 1
    raise ConnectionError("db down")


def test_pooled_connection_releases_slot_when_open_fails() -> None:
    pool = DataSourcePoolManager()
    ds_id = uuid.uuid4()
    connector = _FlakyConnector()

    with pytest.raises(ConnectionError):
        with pool.pooled_connection(ds_id, connector=connector, connect_kwargs={}, pool_size=2):
            pass

    with pytest.raises(ConnectionError):
        with pool.pooled_connection(ds_id, connector=connector, connect_kwargs={}, pool_size=2):
            pass

    assert connector.open_attempts == 2


def test_pooled_connection_returns_connection_to_queue() -> None:
    pool = DataSourcePoolManager()
    ds_id = uuid.uuid4()
    connector = MagicMock()
    conn = object()
    connector.open_connection.return_value = conn

    with pool.pooled_connection(ds_id, connector=connector, connect_kwargs={}, pool_size=2) as first:
        assert first is conn

    with pool.pooled_connection(ds_id, connector=connector, connect_kwargs={}, pool_size=2) as second:
        assert second is conn

    assert connector.open_connection.call_count == 1


def test_evicted_pool_does_not_reuse_connections() -> None:
    pool = DataSourcePoolManager()
    ds_id = uuid.uuid4()
    connector = MagicMock()
    first_conn = object()
    second_conn = object()
    connector.open_connection.side_effect = [first_conn, second_conn]

    with pool.pooled_connection(ds_id, connector=connector, connect_kwargs={}, pool_size=2):
        pass

    pool.evict_pool(ds_id)

    with pool.pooled_connection(ds_id, connector=connector, connect_kwargs={}, pool_size=2) as borrowed:
        assert borrowed is second_conn

    assert connector.open_connection.call_count == 2
