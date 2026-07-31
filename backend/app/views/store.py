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


def clear_user_overrides() -> None:
    _user_overrides.clear()


def list_user_overrides(user_id: str) -> list[dict[str, Any]]:
    return list(_user_overrides.get(user_id, []))


def add_user_override(user_id: str, item: dict[str, Any]) -> dict[str, Any]:
    bucket = _user_overrides.setdefault(user_id, [])
    bucket.append(item)
    return item


def update_user_override(user_id: str, view_id: str, patch: dict[str, Any]) -> dict[str, Any]:
    bucket = _user_overrides.get(user_id, [])
    for idx, item in enumerate(bucket):
        if item.get("id") == view_id:
            updated = {**item, **patch}
            bucket[idx] = updated
            return updated
    raise KeyError(view_id)


def remove_user_override(user_id: str, view_id: str) -> None:
    bucket = _user_overrides.get(user_id, [])
    next_bucket = [i for i in bucket if i.get("id") != view_id]
    if len(next_bucket) == len(bucket):
        raise KeyError(view_id)
    _user_overrides[user_id] = next_bucket


def apply_default_flag(user_id: str, view_id: str | None) -> None:
    bucket = _user_overrides.get(user_id, [])
    for item in bucket:
        item["isDefault"] = bool(view_id) and item.get("id") == view_id
