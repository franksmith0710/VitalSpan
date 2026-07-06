from __future__ import annotations

_ORACLE_TYPE_MAP = {
    "NUMBER": "decimal",
    "VARCHAR2": "string",
    "DATE": "datetime",
}

_SQLSERVER_TYPE_MAP = {
    "nvarchar": "string",
    "datetime2": "datetime",
    "bit": "boolean",
}


def quote_identifier(dialect: str, name: str) -> str:
    if dialect == "oracle":
        return f'"{name.upper()}"'
    if dialect == "sqlserver":
        return f"[{name}]"
    raise ValueError(f"unsupported dialect for quote_identifier: {dialect}")


def build_limit_clause(dialect: str, limit: int, offset: int) -> str:
    if dialect not in {"oracle", "sqlserver"}:
        raise ValueError(f"unsupported dialect for build_limit_clause: {dialect}")
    return f"OFFSET {offset} ROWS FETCH NEXT {limit} ROWS ONLY"


def normalize_column_type(dialect: str, raw: str) -> str:
    key = raw.strip()
    if dialect == "oracle":
        return _ORACLE_TYPE_MAP.get(key.upper(), key.lower())
    if dialect == "sqlserver":
        return _SQLSERVER_TYPE_MAP.get(key.lower(), key.lower())
    raise ValueError(f"unsupported dialect for normalize_column_type: {dialect}")
