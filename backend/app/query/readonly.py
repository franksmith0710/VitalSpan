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
_INLINE_WRITE = re.compile(
    r";\s*(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|MERGE|REPLACE)\b",
    re.IGNORECASE,
)
_DDL_MIDDLE = re.compile(
    r"\b(CREATE|DROP|ALTER)\s+(TABLE|VIEW|INDEX|DATABASE)\b",
    re.IGNORECASE,
)
_BLOCK_COMMENT = re.compile(r"/\*.*?\*/", re.DOTALL)
_LINE_COMMENT = re.compile(r"--[^\n]*")
_MAX_SQL_LEN = 65536


def _strip_comments(sql: str) -> str:
    without_block = _BLOCK_COMMENT.sub(" ", sql)
    return _LINE_COMMENT.sub(" ", without_block)


def assert_readonly_sql(sql: str) -> None:
    if len(sql) > _MAX_SQL_LEN:
        raise QueryError(
            "QUERY_SQL_TOO_LONG",
            f"SQL exceeds {_MAX_SQL_LEN} characters",
            400,
        )
    scrubbed = _strip_comments(sql)
    normalized = scrubbed.strip().rstrip(";")
    if not normalized:
        raise QueryError("QUERY_NOT_READONLY", "SQL must not be empty", 400)
    if ";" in normalized:
        raise QueryError("QUERY_NOT_READONLY", "Multiple statements are not allowed", 400)
    if _INLINE_WRITE.search(scrubbed):
        raise QueryError("QUERY_NOT_READONLY", "Write operations are not allowed", 400)
    if _WRITE_PREFIX.match(normalized):
        raise QueryError("QUERY_NOT_READONLY", "Write operations are not allowed", 400)
    if _DDL_MIDDLE.search(normalized):
        raise QueryError("QUERY_NOT_READONLY", "Write operations are not allowed", 400)
    if _FORBIDDEN_CLAUSES.search(normalized):
        raise QueryError("QUERY_NOT_READONLY", "Forbidden SQL clause", 400)
