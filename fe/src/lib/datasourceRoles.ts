export const ANALYTICS_DATASOURCE_CODE = "analytics";

/** 与后端 sync_source_capabilities 对齐：可 SQL / Native 查询的连接器可作同步源候选 */
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
  "mongodb",
  "elasticsearch",
  "opensearch",
  "csv",
  "excel",
  "rest_api",
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
