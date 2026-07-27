import { buildPlanForType } from "@/components/charts/engine/plugins/plans/buildPlan";
import { BUILTIN_PLUGIN_DEFS } from "@/components/charts/engine/plugins/metadata";
import { registerChartPlugin, registerChartPluginPackage } from "@/components/charts/engine/plugins/registry";
import type { ChartViewPlugin } from "@/components/charts/engine/plugins/types";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import { createBarPluginPackage } from "@/components/charts/plugins/bar";

export function registerBuiltinChartPlugins(): void {
  registerChartPluginPackage(createBarPluginPackage());
  for (const def of BUILTIN_PLUGIN_DEFS) {
    if (def.type === "bar") continue;
    const plugin: ChartViewPlugin = {
      ...def,
      buildRenderPlan: (vm) => buildPlanForType(def.type, vm),
      setupDefaultConfig: (cfg) => ({
        ...cfg,
        chartType: def.type as ChartViewConfig["chartType"],
        styleVariant: "default",
      }),
    };
    registerChartPlugin(plugin);
  }
}

registerBuiltinChartPlugins();
