from __future__ import annotations

from app.auth.deps import UserContext
from app.reports.prefab.schemas import PrefabBindingIn
from app.reports.prefab import service as prefab_service

_BUILTIN: list[dict] = [
    {
        "bindingKey": "prefab-entity-lifecycle",
        "entityTypeCode": "equipment",
        "analysisType": "lifecycle",
        "dimensionCodes": ["status"],
        "displayName": "实体生命周期分布",
        "allowedRoles": ["analyst", "admin"],
    },
    {
        "bindingKey": "prefab-entity-region",
        "entityTypeCode": "equipment",
        "analysisType": "distribution",
        "dimensionCodes": ["region"],
        "displayName": "实体区域分布",
        "allowedRoles": ["analyst", "admin"],
    },
]


def seed_builtin_prefab_bindings(actor: UserContext | None = None) -> int:
    """幂等 upsert 内置 binding；返回写入条数。"""
    user = actor or UserContext(id="seed", username="seed", roles=["admin"])
    count = 0
    for raw in _BUILTIN:
        item = PrefabBindingIn.model_validate(raw)
        prefab_service.upsert_prefab_binding(item.binding_key, item, user)
        count += 1
    return count
