import type { AntvRenderPlan } from "@/components/charts/engine/antv/buildAntvSpec";
import { applyAdvancedFeatures } from "@/components/charts/engine/antv/applyAdvancedFeatures";
import { applyAntvStyle } from "@/components/charts/engine/antv/applyAntvStyle";
import type { ChartStyleContext } from "@/components/charts/engine/types";
import { resolveChartSeriesColorItems } from "@/lib/chartSeriesColor";
import { applyConditionalRulesToG2PlotOptions } from "@/lib/chartDeFeatures";
import { readChartDeStyle } from "@/lib/chartDeStyle";
import type { ChartViewConfig } from "@/lib/chartViewConfig";

export function applyChartStyleChain(
  plan: AntvRenderPlan,
  style: ChartStyleContext,
  chartConfig?: ChartViewConfig,
): AntvRenderPlan {
  let next = applyAntvStyle(plan, style);
  next = applyAdvancedFeatures(next, style);

  if (chartConfig && next.kind === "g2plot") {
    const items = resolveChartSeriesColorItems(
      chartConfig,
      style.deStyle.paletteId,
      readChartDeStyle(chartConfig).seriesColor ?? style.deStyle.seriesColor,
    );
    const conditionalRules = style.deFeatures?.conditionalRules ?? [];
    if (items.length && conditionalRules.length === 0) {
      next = { ...next, options: { ...next.options, color: items.map((item) => item.color) } };
    }
    if (conditionalRules.length > 0) {
      next = {
        ...next,
        options: applyConditionalRulesToG2PlotOptions(
          next.options as Record<string, unknown>,
          next.plotType,
          conditionalRules,
        ),
      };
    }
  }

  return next;
}
