from __future__ import annotations

from typing import Any

_role_defaults: dict[str, dict[str, Any]] = {}
_user_overrides: dict[str, list[dict[str, Any]]] = {}


def get_role_defaults(role_key: str) -> dict[str, Any] | None:
    return _role_defaults.get(role_key)


def set_role_defaults(role_key: str, payload: dict[str, Any]) -> dict[str, Any]:
    _role_defaults[role_key] = payload
    return payload


def clear_role_defaults() -> None:
    _role_defaults.clear()


def list_user_overrides(user_id: str) -> list[dict[str, Any]]:
    return list(_user_overrides.get(user_id, []))


def add_user_override(user_id: str, item: dict[str, Any]) -> dict[str, Any]:
    bucket = _user_overrides.setdefault(user_id, [])
    bucket.append(item)
    return item
