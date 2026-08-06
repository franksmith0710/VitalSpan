import type { ChartViewConfig } from "@/lib/chartViewConfig";
import type { ChartAxesConfig, DeAxisId } from "@/lib/chartDeAxis";
import { getCachedCatalog, type ChartTypeCatalogItem } from "@/lib/chartRegistry";
import { migrateChartConfigToDeAxes, syncLegacyFieldsFromAxes } from "@/lib/resolveChartEncoding";

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
  liquid: { minDimensions: 0, maxDimensions: 0, minMetrics: 1, maxMetrics: 1 },
  "table-normal": { minDimensions: 1, maxDimensions: 8, minMetrics: 1, maxMetrics: 8 },
  "table-pivot": { minDimensions: 1, maxDimensions: 8, minMetrics: 1, maxMetrics: 8 },
  "bar-range": { minDimensions: 1, maxDimensions: 1, minMetrics: 2, maxMetrics: 2 },
  "progress-bar": { minDimensions: 1, maxDimensions: 1, minMetrics: 2, maxMetrics: 2 },
  "bullet-graph": { minDimensions: 1, maxDimensions: 1, minMetrics: 2, maxMetrics: 3 },
  "stock-line": { minDimensions: 1, maxDimensions: 8, minMetrics: 4, maxMetrics: 4 },
  map: { minDimensions: 1, maxDimensions: 3, minMetrics: 1, maxMetrics: 1 },
  heatmap: { minDimensions: 2, maxDimensions: 2, minMetrics: 1, maxMetrics: 1 },
  kpi: { minDimensions: 0, maxDimensions: 0, minMetrics: 1, maxMetrics: 1 },
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
  "chart-mix": {
    minDimensions: 1,
    maxDimensions: 8,
    minMetrics: 1,
    maxMetrics: 8,
    note: "双轴图左柱或右线至少 1 个指标",
  },
  "chart-mix-group": {
    minDimensions: 1,
    maxDimensions: 8,
    minMetrics: 1,
    maxMetrics: 8,
  },
  "chart-mix-stack": {
    minDimensions: 1,
    maxDimensions: 8,
    minMetrics: 1,
    maxMetrics: 8,
  },
  "chart-mix-dual-line": {
    minDimensions: 1,
    maxDimensions: 8,
    minMetrics: 1,
    maxMetrics: 8,
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

function trimAxes(axes: ChartAxesConfig | undefined): ChartAxesConfig | undefined {
  if (!axes) return undefined;
  const next: ChartAxesConfig = {};
  for (const [axisId, refs] of Object.entries(axes)) {
    const trimmed = (refs ?? [])
      .filter((r) => r.field?.trim())
      .map((r) => ({ field: r.field.trim(), label: r.label ?? null }));
    if (trimmed.length > 0) next[axisId as DeAxisId] = trimmed;
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

/** 提交校验前：迁移 DE 轴 → 同步 legacy → 剔除空槽并按类型上限裁剪 */
export function sanitizeChartFieldsForValidate(cfg: ChartViewConfig): ChartViewConfig {
  const synced = syncLegacyFieldsFromAxes(migrateChartConfigToDeAxes(cfg));
  const rule = resolveChartFieldRule(synced.chartType);
  return {
    ...synced,
    axes: trimAxes(synced.axes),
    dimensions: (synced.dimensions ?? [])
      .filter((d) => d.field?.trim())
      .slice(0, rule.maxDimensions),
    metrics: (synced.metrics ?? [])
      .filter((m) => m.field?.trim())
      .slice(0, rule.maxMetrics),
  };
}

export function catalogFieldRule(item: ChartTypeCatalogItem): ChartFieldRule {
  return resolveChartFieldRule(item.type);
}
