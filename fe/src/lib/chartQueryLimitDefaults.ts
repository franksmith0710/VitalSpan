/**
 * 图表/自定义组件「结果展示」默认条数。
 * 与 backend `query_default_limit`（1000）及 `CHART_RESULT_LIMIT_MAX` 对齐。
 */
export const DEFAULT_CHART_RESULT_LIMIT = 1000;

export function defaultChartResultLimitString(): string {
  return String(DEFAULT_CHART_RESULT_LIMIT);
}
