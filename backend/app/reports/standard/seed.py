"""Builtin standard analysis pack seed."""

from __future__ import annotations

from app.auth.deps import UserContext
from app.metadata.physical import service as physical_service
from app.metadata.physical.errors import PhysicalTableError
from app.reports.standard.schemas import AnalysisPackIn, FieldMapping
from app.reports.standard import service as standard_service

_EQUIPMENT_FQN = "ops.equipment"
_PACK_KEY = "equipment-overview"


def seed_builtin_analysis_pack(actor: UserContext | None = None) -> int:
    user = actor or UserContext(id="seed", username="seed", roles=["admin"])
    try:
        pt = physical_service.get_physical_table(_EQUIPMENT_FQN)
    except PhysicalTableError:
        return 0
    payload = AnalysisPackIn(
        packKey=_PACK_KEY,
        displayName="设备标准分析",
        businessObjectCode="equipment",
        physicalTableFqn=_EQUIPMENT_FQN,
        dataSourceId=pt.data_source_id,
        fieldMapping=FieldMapping(status="status", region="region", createdAt="created_at"),
        enabledThemes=["lifecycle", "distribution", "activity", "trend"],
        allowedRoles=["analyst", "admin"],
        snapshotCronPreset="daily",
    )
    from app.reports.standard.capabilities import evaluate_capabilities

    columns = [{"name": c.name, "dataType": c.data_type} for c in pt.columns]
    caps = evaluate_capabilities(payload.field_mapping, columns)
    available = {c.theme for c in caps if c.available}
    payload.enabled_themes = [t for t in payload.enabled_themes if t in available]
    if not payload.enabled_themes:
        payload.enabled_themes = ["lifecycle"]
    standard_service.upsert_pack(_PACK_KEY, payload, user)
    return 1
