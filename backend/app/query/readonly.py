from __future__ import annotations

import re

from app.query.schemas import QueryError

_WRITE_PREFIX = re.compile(
    r"^\s*(INSERT|UPDATE|DELETE|MERGE|REPLACE|TRUNCATE|DROP|ALTER|CREATE|GRANT|REVOKE|CALL|EXEC)\b",
    re.IGNORECASE,
)
_FORBIDDEN_CLAUSES = re.compile(
    r"\b(INTO\s+OUTFILE|FOR\s+UPDATE|LOCK\s+IN\s+SHARE\s+MODE)\b",
    re.IGNORECASE,
)


def assert_readonly_sql(sql: str) -> None:
    normalized = sql.strip().rstrip(";")
    if not normalized:
        raise QueryError("QUERY_NOT_READONLY", "SQL must not be empty", 400)
    if ";" in normalized:
        raise QueryError("QUERY_NOT_READONLY", "Multiple statements are not allowed", 400)
    if _WRITE_PREFIX.match(normalized):
        raise QueryError("QUERY_NOT_READONLY", "Write operations are not allowed", 400)
    if _FORBIDDEN_CLAUSES.search(normalized):
        raise QueryError("QUERY_NOT_READONLY", "Forbidden SQL clause", 400)
