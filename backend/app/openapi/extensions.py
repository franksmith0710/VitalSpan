from __future__ import annotations

from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi

from app.core.config import get_settings

IF06_DATASOURCE_PREFIX = "/api/v1/datasources"
IF06_QUERY_EXECUTE = "/api/v1/query/execute"

_EXECUTE_REQUEST_EXAMPLES = {
    "sql": {
        "summary": "SQL query",
        "value": {
            "dataSourceId": "00000000-0000-4000-8000-000000000001",
            "mode": "sql",
            "sql": "SELECT 1 AS value",
        },
    },
    "table": {
        "summary": "Table query",
        "value": {
            "dataSourceId": "00000000-0000-4000-8000-000000000001",
            "mode": "table",
            "schema": "public",
            "table": "orders",
        },
    },
}


def customize_openapi(app: FastAPI) -> dict:
    if app.openapi_schema:
        return app.openapi_schema
    settings = get_settings()
    schema = get_openapi(
        title=app.title,
        version=settings.api_openapi_version,
        description=(
            "VitalSpan REST API. All business routes are under /api/v1/. "
            "Breaking changes bump major OpenAPI version."
        ),
        routes=app.routes,
    )
    for path, methods in schema.get("paths", {}).items():
        for verb, op in methods.items():
            if path.startswith(IF06_DATASOURCE_PREFIX):
                tags = list(op.get("tags") or [])
                if "IF-06" not in tags:
                    tags.append("IF-06")
                op["tags"] = tags
                op_id = op.get("operationId") or ""
                if not op_id.startswith("if06."):
                    op["operationId"] = f"if06.datasources.{op_id or verb}"
            if path == IF06_QUERY_EXECUTE and verb == "post":
                tags = list(op.get("tags") or [])
                if "IF-06" not in tags:
                    tags.append("IF-06")
                op["tags"] = tags
                op["operationId"] = "if06.query.execute"
                request_body = op.setdefault("requestBody", {})
                content = request_body.setdefault("content", {})
                json_content = content.setdefault("application/json", {})
                json_content.setdefault("examples", _EXECUTE_REQUEST_EXAMPLES)
    schema["info"]["version"] = settings.api_openapi_version
    app.openapi_schema = schema
    return schema
