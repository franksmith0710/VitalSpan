from __future__ import annotations

from dataclasses import dataclass

from app.datasources.dialects.base import DialectConnector


class ConnectorNotFoundError(KeyError):
    pass


class ConnectorAlreadyRegisteredError(ValueError):
    pass


@dataclass(frozen=True)
class ConnectorDescriptor:
    type: str
    category: str
    capabilities: tuple[str, ...]


class ConnectorRegistry:
    def __init__(self) -> None:
        self._connectors: dict[str, DialectConnector] = {}

    def register(self, connector: DialectConnector) -> None:
        if connector.type in self._connectors:
            raise ConnectorAlreadyRegisteredError(f"connector type already registered: {connector.type}")
        self._connectors[connector.type] = connector

    def get(self, type: str) -> DialectConnector:
        try:
            return self._connectors[type]
        except KeyError as exc:
            raise ConnectorNotFoundError(type) from exc

    def list_types(self) -> list[ConnectorDescriptor]:
        return [
            ConnectorDescriptor(
                type=c.type,
                category=c.category,
                capabilities=c.capabilities,
            )
            for c in self._connectors.values()
        ]


registry = ConnectorRegistry()


def register_dialect(connector: DialectConnector) -> None:
    registry.register(connector)
