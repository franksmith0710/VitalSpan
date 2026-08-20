from __future__ import annotations

import queue
import threading
import uuid
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass, field
from typing import Any

from app.datasources.dialects.base import DialectConnector

DEFAULT_POOL_SIZE = 2
_POOL_WAIT_SECONDS = 30.0


@dataclass
class _PoolEntry:
    queue: queue.Queue[Any] = field(default_factory=queue.Queue)
    pool_size: int = DEFAULT_POOL_SIZE
    connect_count: int = 0


class DataSourcePoolManager:
    def __init__(self) -> None:
        self._entries: dict[uuid.UUID, _PoolEntry] = {}
        self._lock = threading.RLock()

    def active_pool_count(self) -> int:
        with self._lock:
            return len(self._entries)

    def evict_pool(self, data_source_id: uuid.UUID) -> None:
        with self._lock:
            entry = self._entries.pop(data_source_id, None)
        if entry is None:
            return
        while True:
            try:
                conn = entry.queue.get_nowait()
            except queue.Empty:
                break
            try:
                conn.close()
            except Exception:
                pass

    @contextmanager
    def pooled_connection(
        self,
        data_source_id: uuid.UUID,
        *,
        connector: DialectConnector,
        connect_kwargs: dict,
        pool_size: int = DEFAULT_POOL_SIZE,
    ) -> Iterator[Any]:
        pool_size = max(1, min(pool_size, 10))
        with self._lock:
            entry = self._entries.get(data_source_id)
            if entry is None:
                entry = _PoolEntry(pool_size=pool_size)
                self._entries[data_source_id] = entry
            entry.pool_size = pool_size
        conn = None
        leased_new = False
        pool_broken = False
        try:
            try:
                conn = entry.queue.get_nowait()
            except queue.Empty:
                with self._lock:
                    can_open = entry.connect_count < entry.pool_size
                    if can_open:
                        entry.connect_count += 1
                        leased_new = True
                if can_open:
                    conn = connector.open_connection(**connect_kwargs)
                else:
                    try:
                        conn = entry.queue.get(timeout=_POOL_WAIT_SECONDS)
                    except queue.Empty as exc:
                        raise TimeoutError(
                            f"datasource connection pool exhausted after {_POOL_WAIT_SECONDS:.0f}s",
                        ) from exc
            yield conn
        except Exception:
            pool_broken = True
            raise
        finally:
            if conn is not None:
                if pool_broken:
                    with self._lock:
                        entry.connect_count = max(0, entry.connect_count - 1)
                    try:
                        conn.close()
                    except Exception:
                        pass
                else:
                    try:
                        entry.queue.put_nowait(conn)
                    except queue.Full:
                        with self._lock:
                            entry.connect_count = max(0, entry.connect_count - 1)
                        try:
                            conn.close()
                        except Exception:
                            pass
            elif leased_new:
                with self._lock:
                    entry.connect_count = max(0, entry.connect_count - 1)


pool_manager = DataSourcePoolManager()
