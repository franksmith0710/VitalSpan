from __future__ import annotations

RPT_ENGINE_FORBIDDEN = "RPT_ENGINE_FORBIDDEN"
RPT_ENGINE_INVALID_PARAMETER = "RPT_ENGINE_INVALID_PARAMETER"


class ReportEngineError(Exception):
    def __init__(self, code: str, message: str, status: int = 422, fields: list | None = None) -> None:
        self.code = code
        self.message = message
        self.status = status
        self.fields = fields or []
        super().__init__(message)
