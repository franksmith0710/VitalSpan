import type { ChartRenderPlan } from "@/components/charts/engine/buildChartRenderPlan";
import { applyD3Style } from "@/components/charts/engine/d3/applyD3Style";
import type { ChartStyleContext } from "@/components/charts/engine/types";
import { resolveChartSeriesColorItems } from "@/lib/chartSeriesColor";
import { readChartDeStyle } from "@/lib/chartDeStyle";
import type { ChartViewConfig } from "@/lib/chartViewConfig";

export function applyChartStyleChain(
  plan: ChartRenderPlan,
  style: ChartStyleContext,
  chartConfig?: ChartViewConfig,
): ChartRenderPlan {
  let next = applyD3Style(plan, style);

  if (!chartConfig) return next;

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
    next = { ...next, options: { ...next.options, __conditionalRules: conditionalRules } };
  }
  if (style.deFeatures?.markLines?.length) {
    next = { ...next, options: { ...next.options, __markLines: style.deFeatures.markLines } };
  }

  return next;
}
