export const ANALYTICS_DATASOURCE_CODE = "analytics";

export function isAnalyticsDatasource(code: string): boolean {
  return code === ANALYTICS_DATASOURCE_CODE;
}

export function isMysqlSyncSource(type: string): boolean {
  return type === "mysql";
}
