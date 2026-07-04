from __future__ import annotations

API_URL_PREFIX = "/api/v1/"
VERSION_POLICY_TEXT = (
    "Breaking API changes require a new major URL version (e.g. /api/v2/). "
    "Additive non-breaking changes remain on /api/v1/."
)
OPENAPI_INFO_EXTENSIONS = {
    "x-api-version-policy": VERSION_POLICY_TEXT,
    "x-breaking-change-policy": "bump-url-major-on-breaking",
    "x-if-groups": ["IF-01", "IF-02", "IF-03", "IF-04", "IF-06"],
}

_SYSTEM_PATH_PREFIXES = ("/health", "/docs", "/redoc", "/openapi.json")

_IF_PREFIX_TAGS = (
    ("/api/v1/integration/bus", "IF-01", "if01."),
    ("/api/v1/services", "IF-02", "if02."),
    ("/api/v1/reports/export", "IF-03", "if03."),
    ("/api/v1/embed", "IF-04", "if04."),
)


def apply_version_policy(schema: dict) -> dict:
    info = schema.setdefault("info", {})
    desc = info.get("description") or ""
    if VERSION_POLICY_TEXT not in desc:
        info["description"] = (desc + "\n\n" + VERSION_POLICY_TEXT).strip()
    info.update(OPENAPI_INFO_EXTENSIONS)
    unversioned: list[str] = []
    for path in schema.get("paths", {}):
        if path.startswith(_SYSTEM_PATH_PREFIXES):
            continue
        if not path.startswith(API_URL_PREFIX):
            unversioned.append(path)
    info["x-unversioned-paths"] = unversioned
    for path, methods in schema.get("paths", {}).items():
        for verb, op in methods.items():
            if not isinstance(op, dict):
                continue
            for prefix, tag, op_prefix in _IF_PREFIX_TAGS:
                if path.startswith(prefix):
                    tags = list(op.get("tags") or [])
                    if tag not in tags:
                        tags.append(tag)
                    op["tags"] = tags
                    op_id = op.get("operationId") or f"{verb}"
                    if not op_id.startswith(op_prefix):
                        op["operationId"] = f"{op_prefix}{op_id}"
    return schema
