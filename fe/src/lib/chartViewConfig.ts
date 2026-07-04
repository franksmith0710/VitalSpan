export type ChartTypeL1 = "table" | "line" | "bar";

export type ChartFieldRef = {
  field: string;
  label?: string | null;
};

export type ChartFilterRef = {
  field: string;
  operator?: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in";
  value: string | number | boolean | string[];
};

export type ChartViewConfig = {
  chartType: ChartTypeL1;
  styleVariant?: "default";
  dataSourceId?: string;
  bindingId?: string;
  chartId?: string;
  mode?: "sql" | "table";
  sql?: string;
  schema?: string;
  table?: string;
  dimensions?: ChartFieldRef[];
  metrics?: ChartFieldRef[];
  filters?: ChartFilterRef[];
};

const CHART_TYPES: ChartTypeL1[] = ["table", "line", "bar"];

export function isChartViewConfig(value: unknown): value is ChartViewConfig {
  if (!value || typeof value !== "object") return false;
  const v = value as ChartViewConfig;
  return CHART_TYPES.includes(v.chartType);
}
