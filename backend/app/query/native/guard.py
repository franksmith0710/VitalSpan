from __future__ import annotations

from app.datasources.registry import export_type_catalog
from app.query.native.schemas import NativeQuerySpec, NativeValidateOut, RoutingModeItem, RoutingModesOut
from app.query.schemas import QueryError

NATIVE_CATEGORIES = frozenset({"search", "document", "timeseries"})


def _catalog_by_type() -> dict[str, str]:
    return {item["type"]: item["category"] for item in export_type_catalog()}


def resolve_query_mode(connector_type: str) -> str:
    category = _catalog_by_type().get(connector_type)
    if category is None:
        raise QueryError("QUERY_NATIVE_UNSUPPORTED_CONNECTOR", f"Unknown connector: {connector_type}", 422)
    return "native" if category in NATIVE_CATEGORIES else "sql"


def list_routing_modes() -> RoutingModesOut:
    modes = [
        RoutingModeItem(connectorType=item["type"], mode=("native" if item["category"] in NATIVE_CATEGORIES else "sql"))
        for item in export_type_catalog()
    ]
    return RoutingModesOut(modes=sorted(modes, key=lambda m: m.connector_type))


def validate_native_spec(spec: NativeQuerySpec) -> NativeValidateOut:
    if spec.sql is not None:
        raise QueryError("QUERY_NATIVE_SQL_DISGUISE", "sql field is not allowed in native mode", 422)
    mode = resolve_query_mode(spec.connector_type)
    if mode != "native":
        raise QueryError("QUERY_NATIVE_WRONG_MODE", f"{spec.connector_type} requires sql mode", 422)
    if not spec.body:
        raise QueryError("QUERY_NATIVE_EMPTY_BODY", "Native query body must not be empty", 422)
    if not isinstance(spec.body, dict):
        raise QueryError("QUERY_NATIVE_INVALID_BODY", "body must be a JSON object", 422)
    return NativeValidateOut(
        connectorType=spec.connector_type,
        body=spec.body,
        index=spec.index,
        resolvedMode=mode,
    )
