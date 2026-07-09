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
    from app.datasources.models import get_meta_session
    from app.metadata.dimensions import service as dimension_service
    from app.metadata.dimensions.schemas import DimensionCreate, DimensionError

    user = actor or UserContext(id="seed", username="seed", roles=["admin"])
    session = get_meta_session()
    try:
        for code, name in (("region", "区域"), ("status", "状态")):
            try:
                dimension_service.create_dimension(
                    session, DimensionCreate(code=code, name=name), user,
                )
            except DimensionError as exc:
                if exc.code != "META_DIM_CODE_CONFLICT":
                    raise
    finally:
        session.close()
    count = 0
    for raw in _BUILTIN:
        item = PrefabBindingIn.model_validate(raw)
        prefab_service.upsert_prefab_binding(item.binding_key, item, user)
        count += 1
    return count
