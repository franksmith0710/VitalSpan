import { isKnownChartType } from "./chartRegistry";

export type ChartType =
  | "table"
  | "line"
  | "bar"
  | "pie"
  | "gauge"
  | "map"
  | "heatmap"
  | "kpi"
  | "timeline"
  | "sankey"
  | "funnel"
  | "graph";

export type ChartTypeL1 = ChartType;

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
  chartType: ChartType;
  styleVariant?: string;
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

const BASIC_TYPES: ChartType[] = ["table", "line", "bar"];
const KPI_TYPES: ChartType[] = ["kpi"];

export function isBasicChartType(type: ChartType): boolean {
  return BASIC_TYPES.includes(type);
}

export function isKpiType(type: ChartType): boolean {
  return KPI_TYPES.includes(type);
}

export function isAdvancedEchartsType(type: ChartType): boolean {
  return !isBasicChartType(type) && !isKpiType(type) && type !== "pie";
}

export function isChartViewConfig(value: unknown): value is ChartViewConfig {
  if (!value || typeof value !== "object") return false;
  const v = value as ChartViewConfig;
  return typeof v.chartType === "string" && isKnownChartType(v.chartType);
}
