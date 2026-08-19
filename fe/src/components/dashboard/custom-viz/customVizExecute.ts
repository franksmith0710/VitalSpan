import { patchChartDeDisplay } from "@/lib/chartDeDisplay";
import { isChartExecuteReady } from "@/lib/chartExecuteProbe";
import type { ChartFieldRef, ChartViewConfig } from "@/lib/chartViewConfig";
import type { CustomVizDataBinding, CustomVizMetricRef, CustomVizWidgetConfig } from "../layoutUtils";

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

/** @deprecated 使用 resolveCustomVizRuntimeStyle */
export { resolveCustomVizRuntimeStyle } from "./customVizDisplayStyle";

/** 大屏实例上的 customVizConfig 覆盖组件库 payload（编辑态 Dataset/字段绑定）。 */
export function applyCustomVizEditOverlay(
  resolved: CustomVizWidgetConfig,
  local: CustomVizWidgetConfig | undefined,
): CustomVizWidgetConfig {
  if (!local) return resolved;
  const resolvedBinding = resolved.dataBinding ?? { status: "manual" as const };
  const localBinding = local.dataBinding;
  if (!localBinding) {
    return {
      ...resolved,
      style: { ...(resolved.style ?? {}), ...(local.style ?? {}) },
      displayStyle: { ...(resolved.displayStyle ?? {}), ...(local.displayStyle ?? {}) },
      widgetStyle: { ...(resolved.widgetStyle ?? {}), ...(local.widgetStyle ?? {}) },
    };
  }
  return {
    ...resolved,
    artifactId: local.artifactId?.trim() ? local.artifactId : resolved.artifactId,
    style: { ...(resolved.style ?? {}), ...(local.style ?? {}) },
    displayStyle: { ...(resolved.displayStyle ?? {}), ...(local.displayStyle ?? {}) },
    widgetStyle: { ...(resolved.widgetStyle ?? {}), ...(local.widgetStyle ?? {}) },
    dataBinding: mergeCustomVizDataBinding(resolvedBinding, localBinding),
  };
}

function mergeCustomVizDataBinding(
  resolved: CustomVizDataBinding,
  local: CustomVizDataBinding,
): CustomVizDataBinding {
  return {
    ...resolved,
    ...local,
    dimensions: local.dimensions ?? resolved.dimensions,
    metrics: local.metrics ?? resolved.metrics,
    filters: local.filters ?? resolved.filters,
  };
}
