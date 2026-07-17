import { buildWidgetFilterParams, type Linkage } from "./dashboardFilterUtils";

/** 单组件图表查询刷新键：仅含本组件筛选参数，避免全局 filterValues 误伤 */
export function buildWidgetExecuteKey(
  filterParameters?: Record<string, string>,
  refreshKey = 0,
): string {
  return JSON.stringify({ f: filterParameters ?? {}, r: refreshKey });
}

export function widgetFilterExecuteRevision(
  widgetId: string,
  linkage: Linkage,
  filterValues: Record<string, string>,
  chartRefreshKeys?: Record<string, number>,
  globalChartRefreshKey = 0,
): string {
  const filters = buildWidgetFilterParams(widgetId, linkage, filterValues);
  const perWidget = chartRefreshKeys?.[widgetId] ?? 0;
  return buildWidgetExecuteKey(filters, perWidget + globalChartRefreshKey);
}
