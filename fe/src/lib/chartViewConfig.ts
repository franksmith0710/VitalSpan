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

export type ChartTimeRangePreset =
  | "last_7d"
  | "last_30d"
  | "last_90d"
  | "mtd"
  | "ytd";

export type ChartTimeRangeRef = {
  enabled: boolean;
  mode: "relative" | "absolute";
  field?: string;
  relativePreset?: ChartTimeRangePreset;
  start?: string;
  end?: string;
};

export type ChartViewConfig = {
  chartType: ChartType;
  styleVariant?: string;
  dataSourceId?: string;
  bindingId?: string;
  chartId?: string;
  mode?: "sql" | "table" | "native" | "dataset";
  sql?: string;
  schema?: string;
  table?: string;
  datasetId?: string;
  configId?: string;
  nativeBody?: Record<string, unknown>;
  index?: string;
  dimensions?: ChartFieldRef[];
  metrics?: ChartFieldRef[];
  filters?: ChartFilterRef[];
  timeRange?: ChartTimeRangeRef;
};

const KPI_TYPES: ChartType[] = ["kpi"];

export function isKpiType(type: ChartType): boolean {
  return KPI_TYPES.includes(type);
}

/** 走 ECharts 渲染的图表类型（非 table / kpi） */
export function isEchartsChartType(type: ChartType): boolean {
  return type !== "table" && !isKpiType(type);
}

export function isLineOrBarType(type: ChartType): boolean {
  return type === "line" || type === "bar";
}

/** 漏斗/桑基/地图等扩展图 */
export function isExtendedEchartsType(type: ChartType): boolean {
  return isEchartsChartType(type) && type !== "line" && type !== "bar" && type !== "pie";
}

export function isChartViewConfig(value: unknown): value is ChartViewConfig {
  if (!value || typeof value !== "object") return false;
  const v = value as ChartViewConfig;
  return typeof v.chartType === "string" && isKnownChartType(v.chartType);
}
