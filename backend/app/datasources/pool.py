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
        pool_broken = False
        try:
            try:
                conn = entry.queue.get_nowait()
            except queue.Empty:
                conn = connector.open_connection(**connect_kwargs)
                entry.connect_count += 1
            yield conn
        except Exception:
            pool_broken = True
            raise
        finally:
            if conn is not None:
                if pool_broken:
                    try:
                        conn.close()
                    except Exception:
                        pass
                else:
                    try:
                        entry.queue.put_nowait(conn)
                    except queue.Full:
                        try:
                            conn.close()
                        except Exception:
                            pass


pool_manager = DataSourcePoolManager()
