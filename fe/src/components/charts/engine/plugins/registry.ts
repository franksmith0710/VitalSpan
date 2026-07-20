import type { ChartViewPlugin } from "@/components/charts/engine/plugins/types";

const plugins = new Map<string, ChartViewPlugin>();

export function registerChartPlugin(plugin: ChartViewPlugin): void {
  plugins.set(plugin.type, plugin);
}

export function getChartPlugin(type: string): ChartViewPlugin | undefined {
  return plugins.get(type);
}

export function listChartPlugins(): ChartViewPlugin[] {
  return [...plugins.values()];
}

export function listChartPluginTypes(): string[] {
  return [...plugins.keys()];
}

export function hasChartPlugin(type: string): boolean {
  return plugins.has(type);
}
