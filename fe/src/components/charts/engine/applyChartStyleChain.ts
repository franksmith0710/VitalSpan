import type { ChartRenderPlan } from "@/components/charts/engine/buildChartRenderPlan";
import { applyD3Style } from "@/components/charts/engine/d3/applyD3Style";
import type { ChartStyleContext } from "@/components/charts/engine/types";
import { hasActiveConditionalRules } from "@/components/charts/engine/d3/views/resolveD3ChartColors";
import { resolveChartSeriesColorItems } from "@/lib/chartSeriesColor";
import { readChartDeStyle } from "@/lib/chartDeStyle";
import { applyChartDeStyleBlocksToPlan } from "@/lib/applyChartDeStyleBlocks";
import type { ChartViewConfig } from "@/lib/chartViewConfig";

export function applyChartStyleChain(
  plan: ChartRenderPlan,
  style: ChartStyleContext,
  chartConfig?: ChartViewConfig,
): ChartRenderPlan {
  let next = applyD3Style(plan, style);
  next = applyChartDeStyleBlocksToPlan(next, style.deStyle, {
    styleVariant: chartConfig?.styleVariant,
  });

  if (!chartConfig) return next;

  const paletteId = style.effectivePaletteId ?? style.deStyle.paletteId;
  const items = resolveChartSeriesColorItems(
    chartConfig,
    paletteId,
    readChartDeStyle(chartConfig).seriesColor ?? style.deStyle.seriesColor,
  );
  if (items.length && !hasActiveConditionalRules(style)) {
    next = { ...next, options: { ...next.options, color: items.map((item) => item.color) } };
  }
  const conditionalRules = style.deFeatures?.conditionalRules ?? [];
  if (conditionalRules.length > 0) {
    next = { ...next, options: { ...next.options, __conditionalRules: conditionalRules } };
  }
  if (style.deFeatures?.markLines?.length) {
    next = { ...next, options: { ...next.options, __markLines: style.deFeatures.markLines } };
  }

  return next;
}
