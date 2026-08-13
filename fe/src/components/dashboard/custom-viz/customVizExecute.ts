import { patchChartDeDisplay } from "@/lib/chartDeDisplay";
import { isChartExecuteReady } from "@/lib/chartExecuteProbe";
import type { ChartFieldRef, ChartViewConfig } from "@/lib/chartViewConfig";
import type { CustomVizDataBinding, CustomVizMetricRef } from "../layoutUtils";

function metricsAsChartFields(metrics: CustomVizMetricRef[] | undefined): ChartFieldRef[] {
  return (metrics ?? []).filter((m) => m.field?.trim());
}

export function customVizBindingToChartConfig(binding: CustomVizDataBinding | undefined): ChartViewConfig {
  const base: ChartViewConfig = {
    chartType: "table",
    styleVariant: "default",
    dataSourceId: binding?.dataSourceId,
    datasetId: binding?.datasetId,
    configId: binding?.configId,
    mode: "dataset",
    dimensions: binding?.dimensions ?? [],
    metrics: metricsAsChartFields(binding?.metrics),
    filters: binding?.filters ?? [],
  };
  const displayPatch: Record<string, string> = {};
  if (binding?.refreshMode) displayPatch.refreshMode = binding.refreshMode;
  if (binding?.resultLimit) displayPatch.resultLimit = binding.resultLimit;
  if (Object.keys(displayPatch).length === 0) return base;
  return patchChartDeDisplay(base, displayPatch);
}

export function isCustomVizExecuteReady(binding: CustomVizDataBinding | undefined): boolean {
  const cfg = customVizBindingToChartConfig(binding);
  if (!isChartExecuteReady(cfg)) return false;
  const dims = binding?.dimensions?.filter((d) => d.field?.trim()).length ?? 0;
  const metrics = binding?.metrics?.filter((m) => m.field?.trim()).length ?? 0;
  return dims + metrics > 0;
}

export function resolveCustomVizStyle(
  manifestDefault: Record<string, unknown> | undefined,
  overrides: Record<string, unknown> | undefined,
): Record<string, unknown> {
  return { ...(manifestDefault ?? {}), ...(overrides ?? {}) };
}
