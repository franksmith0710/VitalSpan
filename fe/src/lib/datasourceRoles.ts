export const ANALYTICS_DATASOURCE_CODE = "analytics";

/** 与后端 is_query_capable / is_sync_fetch_implemented 对齐：全部可查询连接器 */
const SYNC_CAPABLE_TYPES = new Set([
  "mysql",
  "mariadb",
  "tidb",
  "starrocks",
  "doris",
  "oceanbase",
  "gbase",
  "postgresql",
  "kingbase",
  "gaussdb",
  "redshift",
  "timescaledb",
  "clickhouse",
  "sqlite",
  "sqlserver",
  "oracle",
  "dm",
  "db2",
  "hive",
  "impala",
  "trino",
  "presto",
  "mongodb",
  "elasticsearch",
  "opensearch",
  "csv",
  "excel",
  "rest_api",
  "influxdb",
  "tdengine",
]);

export function isAnalyticsDatasource(code: string): boolean {
  return code === ANALYTICS_DATASOURCE_CODE;
}

/** @deprecated 使用 isSyncSourceCapable */
export function isMysqlSyncSource(type: string): boolean {
  return type === "mysql";
}

export function isSyncSourceCapable(type: string): boolean {
  return SYNC_CAPABLE_TYPES.has(type);
}

/** 可查询类型均支持同步拉数（与后端最终形态一致） */
export function isSyncFetchImplemented(type: string): boolean {
  return isSyncSourceCapable(type);
}
