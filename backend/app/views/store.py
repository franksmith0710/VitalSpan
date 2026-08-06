from __future__ import annotations

from typing import Any

_role_defaults: dict[str, dict[str, Any]] = {}


def get_role_defaults(role_key: str) -> dict[str, Any] | None:
    return _role_defaults.get(role_key)


def set_role_defaults(role_key: str, payload: dict[str, Any]) -> dict[str, Any]:
    _role_defaults[role_key] = payload
    return payload


def clear_role_defaults() -> None:
    _role_defaults.clear()
