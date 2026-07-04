from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.datasources.dialects.base import DialectConnector
from app.datasources.registry import register_dialect

_PLUGIN_META: dict[str, dict[str, Any]] = {}


@dataclass(frozen=True)
class ExtensionPoint:
    id: str
    description: str


PLUGIN_EXTENSION_POINTS: tuple[ExtensionPoint, ...] = (
    ExtensionPoint(id="connector.register", description="Register a DialectConnector"),
    ExtensionPoint(id="connector.unregister", description="Unregister when unused"),
    ExtensionPoint(id="connector.export_catalog", description="Include in type catalog"),
)


def list_extension_points() -> list[ExtensionPoint]:
    return list(PLUGIN_EXTENSION_POINTS)


def register_connector_plugin(connector: DialectConnector) -> None:
    register_dialect(connector)
    _PLUGIN_META[connector.type] = {"registered_via": "plugin", "type": connector.type}


def get_plugin_registration_meta(connector_type: str) -> dict[str, Any] | None:
    return _PLUGIN_META.get(connector_type)
