from __future__ import annotations

DASH_OVERVIEW_INVALID_ENTITY_TYPE = "DASH_OVERVIEW_INVALID_ENTITY_TYPE"
DASH_OVERVIEW_INVALID_DRILL_WIDGET = "DASH_OVERVIEW_INVALID_DRILL_WIDGET"


class EntityOverviewError(Exception):
    def __init__(self, code: str, message: str, status: int = 400, fields: list | None = None) -> None:
        self.code = code
        self.message = message
        self.status = status
        self.fields = fields
        super().__init__(message)
