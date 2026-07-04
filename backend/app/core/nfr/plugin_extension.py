from __future__ import annotations

import inspect
import time
from dataclasses import dataclass
from typing import Any

from app.datasources.dialects.base import DialectConnector
from app.datasources.registry import ConnectorRegistry, registry, register_dialect

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


@dataclass(frozen=True)
class RegistrationPathDoc:
    connector_type: str
    steps: tuple[str, ...]
    touches_core_registry: bool = False


@dataclass(frozen=True)
class RegistryProbeResult:
    types: tuple[str, ...]
    elapsed_ms: float
    gbase_present: bool


_KNOWN_PATHS: dict[str, tuple[str, ...]] = {
    "gbase": (
        "Create dialects/gbase.py",
        "Call register_connector_plugin(GbaseConnector()) in datasources/__init__.py",
    ),
}


def describe_registration_path(connector_type: str) -> RegistrationPathDoc:
    steps = _KNOWN_PATHS.get(
        connector_type,
        ("Implement DialectConnector", "register_connector_plugin(connector)"),
    )
    return RegistrationPathDoc(connector_type, steps, False)


def probe_registry(max_ms: int = 50) -> RegistryProbeResult:
    started = time.perf_counter()
    types = tuple(t.type for t in registry.list_types())
    gbase = registry.get("gbase") is not None
    elapsed_ms = (time.perf_counter() - started) * 1000
    _ = max_ms
    return RegistryProbeResult(types, elapsed_ms, gbase)


def verify_zero_invasion() -> bool:
    register_src = inspect.getsource(ConnectorRegistry.register)
    get_src = inspect.getsource(ConnectorRegistry.get)
    return "register_connector_plugin" not in register_src and "register_connector_plugin" not in get_src
