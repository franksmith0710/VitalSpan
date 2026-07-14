import type { ChartFieldRef, ChartViewConfig } from "@/lib/chartViewConfig";
import { isChartExecuteReady } from "@/lib/chartExecuteProbe";

export type ChartConfigPhase = {
  bindingReady: boolean;
  queryReady: boolean;
  renderReady: boolean;
};

export function activeFieldRefs(refs: ChartFieldRef[] | undefined): ChartFieldRef[] {
  return (refs ?? []).filter((r) => Boolean(r.field?.trim()));
}

export function normalizeChartFieldRefs(refs: ChartFieldRef[] | undefined): ChartFieldRef[] {
  return activeFieldRefs(refs);
}

export function resolveChartConfigPhase(config: ChartViewConfig | undefined): ChartConfigPhase {
  const queryReady = config ? isChartExecuteReady(config) : false;
  const dimFields = activeFieldRefs(config?.dimensions);
  const metricFields = activeFieldRefs(config?.metrics);
  const chartType = config?.chartType ?? "table";

  let renderReady = false;
  if (queryReady) {
    if (chartType === "table") {
      renderReady = dimFields.length > 0 || metricFields.length > 0;
    } else if (chartType === "kpi") {
      renderReady = metricFields.length > 0;
    } else {
      renderReady = dimFields.length > 0 && metricFields.length > 0;
    }
  }

  return {
    bindingReady: queryReady,
    queryReady,
    renderReady,
  };
}

export function isWidgetConfigReady(chartConfig: ChartViewConfig | undefined): boolean {
  return chartConfig ? isChartExecuteReady(chartConfig) : false;
}

export function reconcileChartFields(
  config: ChartViewConfig,
  availableColumns: string[],
): ChartViewConfig {
  const colSet = new Set(availableColumns);
  const reconcile = (refs: ChartFieldRef[] | undefined) =>
    (refs ?? []).map((r) => (r.field?.trim() && colSet.has(r.field) ? r : { field: "" }));
  return {
    ...config,
    dimensions: reconcile(config.dimensions),
    metrics: reconcile(config.metrics),
  };
}

export function chartConfigToRenderSpec(config: ChartViewConfig) {
  return {
    engine: "echarts" as const,
    chartType: config.chartType,
    styleVariant: config.styleVariant ?? "default",
    encoding: {
      dimensions: activeFieldRefs(config.dimensions),
      metrics: activeFieldRefs(config.metrics),
    },
    source: {},
  };
}
