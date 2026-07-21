import type { ChartViewModel } from "@/components/charts/engine/types";
import "@/components/charts/engine/plugins/index";
import { buildPlanForType } from "@/components/charts/engine/plugins/plans/buildPlan";
import { getChartPlugin } from "@/components/charts/engine/plugins/registry";

export type AntvPlotKind = "g2plot" | "g6" | "g2geo" | "s2" | "d3";

export type AntvRenderPlan = {
  kind: AntvPlotKind;
  plotType: string;
  options: Record<string, unknown>;
  empty?: boolean;
};

export function buildAntvRenderPlan(vm: ChartViewModel): AntvRenderPlan {
  const plugin = getChartPlugin(vm.chartType);
  if (plugin) {
    return plugin.buildRenderPlan(vm);
  }
  return buildPlanForType(vm.chartType, vm);
}
