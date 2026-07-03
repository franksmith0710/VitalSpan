from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class TestConnectionResult:
    ok: bool
    message: str
    latency_ms: int | None


class DialectConnector(Protocol):
    @property
    def type(self) -> str: ...

    @property
    def category(self) -> str: ...

    @property
    def capabilities(self) -> tuple[str, ...]: ...

    def test_connection(
        self,
        *,
        host: str,
        port: int,
        database: str,
        username: str,
        password: str,
        timeout_sec: float = 5.0,
    ) -> TestConnectionResult: ...
