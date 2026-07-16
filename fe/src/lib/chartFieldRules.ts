import type { ChartViewConfig } from "@/lib/chartViewConfig";
import { getCachedCatalog, type ChartTypeCatalogItem } from "@/lib/chartRegistry";

export type ChartFieldRule = {
  minDimensions: number;
  maxDimensions: number;
  minMetrics: number;
  maxMetrics: number;
  note?: string;
};

/** 与 backend/app/viz/builtin.py FieldRule 对齐（catalog 未加载时的兜底） */
const FALLBACK_FIELD_RULES: Record<string, ChartFieldRule> = {
  table: { minDimensions: 0, maxDimensions: 8, minMetrics: 0, maxMetrics: 8 },
  line: { minDimensions: 1, maxDimensions: 8, minMetrics: 1, maxMetrics: 8 },
  bar: { minDimensions: 1, maxDimensions: 8, minMetrics: 1, maxMetrics: 8 },
  pie: { minDimensions: 1, maxDimensions: 1, minMetrics: 1, maxMetrics: 1 },
  gauge: { minDimensions: 0, maxDimensions: 0, minMetrics: 1, maxMetrics: 1 },
  map: { minDimensions: 1, maxDimensions: 3, minMetrics: 1, maxMetrics: 1 },
  heatmap: { minDimensions: 2, maxDimensions: 2, minMetrics: 1, maxMetrics: 1 },
  kpi: { minDimensions: 0, maxDimensions: 1, minMetrics: 1, maxMetrics: 4 },
  timeline: {
    minDimensions: 1,
    maxDimensions: 1,
    minMetrics: 0,
    maxMetrics: 4,
    note: "时间轴需 1 个时间维度，可选 0–4 个指标",
  },
  sankey: {
    minDimensions: 2,
    maxDimensions: 2,
    minMetrics: 1,
    maxMetrics: 1,
    note: "桑基图需 2 个维度（起始、终点）与 1 个指标",
  },
  funnel: {
    minDimensions: 1,
    maxDimensions: 1,
    minMetrics: 1,
    maxMetrics: 1,
    note: "漏斗图需 1 个维度与 1 个指标",
  },
  graph: {
    minDimensions: 2,
    maxDimensions: 2,
    minMetrics: 0,
    maxMetrics: 1,
    note: "关系图需 2 个维度（起点、终点）",
  },
};

export function resolveChartFieldRule(chartType: string): ChartFieldRule {
  const fromCatalog = getCachedCatalog()?.find((c) => c.type === chartType)?.fieldRule;
  const fallback = FALLBACK_FIELD_RULES[chartType];
  return {
    minDimensions: fromCatalog?.minDimensions ?? fallback?.minDimensions ?? 0,
    maxDimensions: fromCatalog?.maxDimensions ?? fallback?.maxDimensions ?? 8,
    minMetrics: fromCatalog?.minMetrics ?? fallback?.minMetrics ?? 0,
    maxMetrics: fromCatalog?.maxMetrics ?? fallback?.maxMetrics ?? 8,
    note: fromCatalog?.note ?? fallback?.note,
  };
}

/** 提交校验前剔除空槽并按类型上限裁剪 */
export function sanitizeChartFieldsForValidate(cfg: ChartViewConfig): ChartViewConfig {
  const rule = resolveChartFieldRule(cfg.chartType);
  return {
    ...cfg,
    dimensions: (cfg.dimensions ?? [])
      .filter((d) => d.field?.trim())
      .slice(0, rule.maxDimensions),
    metrics: (cfg.metrics ?? [])
      .filter((m) => m.field?.trim())
      .slice(0, rule.maxMetrics),
  };
}

export function catalogFieldRule(item: ChartTypeCatalogItem): ChartFieldRule {
  return resolveChartFieldRule(item.type);
}
