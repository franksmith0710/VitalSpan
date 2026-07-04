from __future__ import annotations

import time
from typing import Any

from app.datasources.dialects.base import ColumnInfo, SchemaInfo, TableInfo, TestConnectionResult
from app.datasources.dialects.errors import MONGODB_DRIVER_MISSING, map_mongodb_error

MONGODB_MAX_FIELDS = 500
_SYSTEM_DBS = frozenset({"admin", "local", "config"})
_BSON_TYPE_MAP = {
    "str": "string",
    "int": "number",
    "float": "number",
    "bool": "boolean",
    "datetime": "datetime",
    "dict": "json",
    "list": "json",
}


def _import_pymongo():
    try:
        from pymongo import MongoClient
        from pymongo.errors import OperationFailure, ServerSelectionTimeoutError

        return MongoClient, OperationFailure, ServerSelectionTimeoutError
    except ImportError:
        return None, None, None


def _mongo_uri(*, host: str, port: int, username: str, password: str, database: str) -> str:
    auth = f"{username}:{password}@" if username or password else ""
    db = database or "admin"
    return f"mongodb://{auth}{host}:{port}/{db}"


def _get_client(**kwargs: Any) -> Any:
    MongoClient, _, _ = _import_pymongo()
    if MongoClient is None:
        raise ImportError("pymongo not installed")
    timeout_ms = int(max(1.0, float(kwargs.get("timeout_sec", 5.0))) * 1000)
    return MongoClient(
        _mongo_uri(
            host=kwargs["host"],
            port=kwargs.get("port", 27017),
            username=kwargs.get("username", ""),
            password=kwargs.get("password", ""),
            database=kwargs.get("database", ""),
        ),
        serverSelectionTimeoutMS=timeout_ms,
    )


def _normalize_bson_type(value: Any) -> str:
    return _BSON_TYPE_MAP.get(type(value).__name__, "unknown")


class MongodbConnector:
    type = "mongodb"
    category = "document"
    capabilities = ("connectivity_test", "schema_browser")
    display_name = "MongoDB"

    def test_connection(
        self,
        *,
        host: str,
        port: int,
        database: str,
        username: str,
        password: str,
        timeout_sec: float = 5.0,
        **_: object,
    ) -> TestConnectionResult:
        started = time.perf_counter()
        MongoClient, OperationFailure, ServerSelectionTimeoutError = _import_pymongo()
        if MongoClient is None:
            return TestConnectionResult(
                ok=False,
                message=f"[{MONGODB_DRIVER_MISSING}] pymongo not installed",
                latency_ms=0,
                code=MONGODB_DRIVER_MISSING,
            )
        try:
            client = _get_client(
                host=host, port=port, database=database, username=username,
                password=password, timeout_sec=timeout_sec,
            )
            try:
                client.admin.command("ping")
            finally:
                client.close()
        except (OperationFailure, ServerSelectionTimeoutError, Exception) as exc:
            code, detail = map_mongodb_error(exc)
            latency_ms = int((time.perf_counter() - started) * 1000)
            return TestConnectionResult(ok=False, message=f"[{code}] {detail}", latency_ms=latency_ms, code=code)
        latency_ms = int((time.perf_counter() - started) * 1000)
        return TestConnectionResult(ok=True, message="Connection successful", latency_ms=latency_ms, code=None)

    def open_connection(self, **kwargs: Any) -> Any:
        return _get_client(**kwargs)

    def list_schemas(self, connection: Any) -> list[SchemaInfo]:
        names = [n for n in connection.list_database_names() if n not in _SYSTEM_DBS]
        return [SchemaInfo(name=n) for n in sorted(names)]

    def list_tables(self, connection: Any, schema: str) -> list[TableInfo]:
        if not schema.strip():
            return []
        # r41: 空库 list_collection_names → []（mock 或真实零 collection）
        try:
            db = connection[schema]
            return [TableInfo(name=n, type="collection") for n in sorted(db.list_collection_names())]
        except Exception:
            return []

    def list_columns(self, connection: Any, schema: str, table: str) -> list[ColumnInfo]:
        if not schema.strip() or not table.strip():
            return []
        try:
            doc = connection[schema][table].find_one()
        except Exception:
            return []
        # r41: 空 collection（find_one None）→ []，与未知 database 区分
        if not doc:
            return []
        columns = [
            ColumnInfo(name=k, data_type=_normalize_bson_type(v), nullable=True)
            for k, v in sorted(doc.items())
        ]
        return columns[:MONGODB_MAX_FIELDS] if len(columns) > MONGODB_MAX_FIELDS else columns
