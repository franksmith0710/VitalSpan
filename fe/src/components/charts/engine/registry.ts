import "@/components/charts/engine/plugins/index";
import type { ChartEngineId, ChartViewModel } from "@/components/charts/engine/types";
import type { ChartType } from "@/lib/chartViewConfig";
import { exportAntvPngFromContainer } from "@/components/charts/engine/antv/exportPng";
import { getChartPlugin, listChartPlugins } from "@/components/charts/engine/plugins/registry";

const LEGACY_CANVAS_TYPES = new Set<string>([
  "line",
  "bar",
  "pie",
  "gauge",
  "map",
  "heatmap",
  "timeline",
  "sankey",
  "funnel",
  "graph",
  "scatter",
  "combo",
  "wordCloud",
  "bidirectional-bar",
  "waterfall",
]);

function resolvePlugin(type: string) {
  return getChartPlugin(type);
}

/** 图表类型 → 渲染引擎（catalog / plugin 驱动，legacy 回退） */
export function getEngineIdForChartType(chartType: string): ChartEngineId {
  const plugin = resolvePlugin(chartType);
  if (plugin) {
    if (plugin.renderer === "table") return "table";
    if (plugin.renderer === "kpi") return "kpi";
    return "antv";
  }
  if (chartType === "table") return "table";
  if (chartType === "kpi") return "kpi";
  return "antv";
}

export function isCanvasChartType(type: ChartType | string): boolean {
  const plugin = resolvePlugin(type);
  if (plugin) {
    return plugin.renderer === "antv" && plugin.library !== "react";
  }
  return LEGACY_CANVAS_TYPES.has(type);
}

export function isS2TableChartType(type: string): boolean {
  const plugin = resolvePlugin(type);
  return plugin?.library === "s2";
}

export function isLegacyTableChartType(type: string): boolean {
  return type === "table";
}

export function supportsChartEngine(engineId: ChartEngineId, chartType: string): boolean {
  return getEngineIdForChartType(chartType) === engineId;
}

export function viewModelUsesEngine(vm: ChartViewModel, engineId: ChartEngineId): boolean {
  return vm.engine === engineId;
}

/** 从画布容器导出 PNG（经 registry 统一入口） */
export async function exportChartPng(
  container: HTMLElement,
  chartType: string,
  title?: string,
): Promise<void> {
  const engine = getEngineIdForChartType(chartType);
  if (engine === "antv") {
    exportAntvPngFromContainer(container, title ?? "chart");
    return;
  }
  if (engine === "table" || engine === "kpi") {
    throw new Error("当前图表类型不支持 PNG 导出");
  }
  exportAntvPngFromContainer(container, title ?? "chart");
}

export function listRegisteredCanvasChartTypes(): string[] {
  return listChartPlugins()
    .filter((p) => p.renderer === "antv" && p.library !== "react")
    .map((p) => p.type);
}
