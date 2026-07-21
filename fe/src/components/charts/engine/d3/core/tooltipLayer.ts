import * as d3 from "d3";
import { VCDS } from "@/components/charts/engine/d3/core/chartVisualTokens";
import type { D3Theme } from "@/components/charts/engine/d3/core/themeEngine";
import { formatChartValue } from "@/lib/chartValueFormat";
import type { NumberFormatConfig } from "@/components/dashboard/dashboardStyleConfig";
import { createTooltip, tooltipHtml } from "@/components/charts/engine/d3/core/tooltip";

export type TooltipLayer = d3.Selection<HTMLDivElement, unknown, null, undefined>;

export function createTooltipLayer(container: HTMLElement, theme: D3Theme): TooltipLayer {
  const existing = d3.select(container).select<HTMLDivElement>("div.vs-tooltip-layer");
  if (!existing.empty()) return existing;

  const layer = createTooltip(container, theme);
  layer
    .classed("vs-tooltip-layer", true)
    .style("padding", VCDS.tooltip.padding)
    .style("border-radius", `${VCDS.tooltip.borderRadius}px`)
    .style("font-size", `${VCDS.tooltip.fontSize}px`)
    .style("max-width", `${VCDS.tooltip.maxWidth}px`)
    .style("backdrop-filter", "blur(8px)")
    .style("background", theme.floatSurface);

  return layer;
}

export function showMergedTooltip(
  layer: TooltipLayer | null,
  container: HTMLElement,
  event: MouseEvent,
  category: string,
  rows: { name: string; color: string; value: unknown }[],
  valueFormat?: NumberFormatConfig,
  chartWidth?: number,
): void {
  if (!layer) return;
  layer
    .style("opacity", "1")
    .html(tooltipHtml(category, rows, valueFormat));
  const rect = container.getBoundingClientRect();
  const w = chartWidth ?? rect.width;
  layer
    .style("left", `${Math.min(event.clientX - rect.left + 12, w - VCDS.tooltip.maxWidth)}px`)
    .style("top", `${Math.max(event.clientY - rect.top - 48, 8)}px`);
}

export function hideTooltip(layer: TooltipLayer | null): void {
  layer?.style("opacity", "0");
}

export { tooltipHtml, formatChartValue };
