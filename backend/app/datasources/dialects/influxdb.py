from __future__ import annotations

import time
from typing import Any

from app.datasources.dialects.base import ColumnInfo, SchemaInfo, TableInfo, TestConnectionResult
from app.datasources.dialects.errors import INFLUX_DRIVER_MISSING, map_influx_error

INFLUX_MAX_MEASUREMENTS = 500


def _import_influx():
    try:
        from influxdb_client import InfluxDBClient

        return InfluxDBClient
    except ImportError:
        return None


def _build_client(**kwargs: Any) -> Any:
    InfluxDBClient = _import_influx()
    if InfluxDBClient is None:
        raise ImportError("influxdb-client not installed")
    host = kwargs["host"]
    port = kwargs.get("port", 8086)
    org = kwargs.get("username", "")
    token = kwargs.get("password", "")
    url = f"http://{host}:{port}"
    return InfluxDBClient(url=url, token=token, org=org)


def _query_api(connection: Any) -> Any:
    return connection.query_api()


class InfluxdbConnector:
    """InfluxDB 2.x: username=org, password=token, database=bucket."""

    type = "influxdb"
    category = "timeseries"
    capabilities = ("connectivity_test", "schema_browser")
    display_name = "InfluxDB"

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
        if _import_influx() is None:
            return TestConnectionResult(
                ok=False,
                message=f"[{INFLUX_DRIVER_MISSING}] influxdb-client not installed",
                latency_ms=0,
                code=INFLUX_DRIVER_MISSING,
            )
        try:
            client = _build_client(
                host=host, port=port, username=username, password=password, database=database,
            )
            try:
                if not client.ping():
                    raise RuntimeError("ping failed")
            finally:
                client.close()
        except Exception as exc:
            code, detail = map_influx_error(exc)
            latency_ms = int((time.perf_counter() - started) * 1000)
            return TestConnectionResult(ok=False, message=f"[{code}] {detail}", latency_ms=latency_ms, code=code)
        latency_ms = int((time.perf_counter() - started) * 1000)
        return TestConnectionResult(ok=True, message="Connection successful", latency_ms=latency_ms, code=None)

    def open_connection(self, **kwargs: Any) -> Any:
        return _build_client(**kwargs)

    def list_schemas(self, connection: Any) -> list[SchemaInfo]:
        buckets_api = connection.buckets_api()
        buckets = buckets_api.find_buckets().buckets or []
        return [SchemaInfo(name=b.name) for b in sorted(buckets, key=lambda x: x.name)]

    def list_tables(self, connection: Any, schema: str) -> list[TableInfo]:
        if not schema.strip():
            return []
        try:
            flux = f'import "influxdata/influxdb/schema" schema.measurements(bucket: "{schema}")'
            tables = _query_api(connection).query(flux)
            names: list[str] = []
            for table in tables:
                for record in table.records:
                    val = record.get_value()
                    if val:
                        names.append(str(val))
            unique = sorted(set(names))
            sliced = unique[:INFLUX_MAX_MEASUREMENTS]
            return [TableInfo(name=n, type="measurement") for n in sliced]
        # r41: 空 bucket Flux 零行 → []（与 query 异常抛错区分，异常仍 → []）
        except Exception:
            return []

    def list_columns(self, connection: Any, schema: str, table: str) -> list[ColumnInfo]:
        if not schema.strip() or not table.strip():
            return []
        columns: list[ColumnInfo] = []
        try:
            for kind, flux_tpl in (
                ("number", f'import "influxdata/influxdb/schema" schema.fieldKeys(bucket: "{schema}", measurement: "{table}")'),
                ("string", f'import "influxdata/influxdb/schema" schema.tagKeys(bucket: "{schema}", measurement: "{table}")'),
            ):
                result = _query_api(connection).query(flux_tpl)
                for tbl in result:
                    for record in tbl.records:
                        val = record.get_value()
                        if val:
                            columns.append(ColumnInfo(name=str(val), data_type=kind, nullable=True))
        except Exception:
            return []
        return columns
