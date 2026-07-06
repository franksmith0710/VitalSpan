from __future__ import annotations

RPT_PREFAB_EMPTY_ROLES = "RPT_PREFAB_EMPTY_ROLES"
RPT_PREFAB_ANALYSIS_MISMATCH = "RPT_PREFAB_ANALYSIS_MISMATCH"
RPT_PREFAB_NOT_FOUND = "RPT_PREFAB_NOT_FOUND"
RPT_PREFAB_DUPLICATE_DIMENSION = "RPT_PREFAB_DUPLICATE_DIMENSION"
RPT_PREFAB_ENTITY_NOT_READY = "RPT_PREFAB_ENTITY_NOT_READY"
RPT_PREFAB_RUN_FORBIDDEN = "RPT_PREFAB_RUN_FORBIDDEN"


class PrefabError(Exception):
    def __init__(self, code: str, message: str, status: int = 422, fields: list | None = None) -> None:
        self.code = code
        self.message = message
        self.status = status
        self.fields = fields or []
        super().__init__(message)
