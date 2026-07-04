const MAP: Record<string, string> = {
  CHART_FIELD_REQUIREMENT: "字段配置不符合图表要求",
  CHART_INVALID_STYLE_VARIANT: "所选样式子类型无效",
  CHART_MISSING_SERIES: "请至少配置一个度量字段",
  CHART_INVALID_TYPE: "图表类型无效",
};

export function mapChartConfigError(code: string, message?: string): string {
  return MAP[code] ?? message ?? "配置校验失败，请检查字段与样式";
}
