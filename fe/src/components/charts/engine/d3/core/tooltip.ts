import * as d3 from "d3";
import type { AntvThemeTokens } from "@/components/charts/engine/antv/theme";
import { formatChartValue } from "@/lib/chartValueFormat";
import type { NumberFormatConfig } from "@/components/dashboard/dashboardStyleConfig";

export function createTooltip(container: HTMLElement, theme: AntvThemeTokens) {
  return d3
    .select(container)
    .append("div")
    .style("position", "absolute")
    .style("pointer-events", "none")
    .style("opacity", "0")
    .style("padding", "8px 10px")
    .style("border-radius", "8px")
    .style("font-size", "12px")
    .style("line-height", "1.35")
    .style("background", theme.tooltipBg)
    .style("color", theme.tooltipText)
    .style("border", `1px solid ${theme.axisLine}`)
    .style("box-shadow", "0 8px 24px rgba(16,24,40,0.14)")
    .style("backdrop-filter", "blur(6px)")
    .style("transition", "opacity 120ms ease")
    .style("z-index", "10");
}

export function tooltipHtml(
  category: string,
  rows: { name: string; color: string; value: unknown }[],
  valueFormat?: NumberFormatConfig,
): string {
  const items = rows
    .map(
      (row) =>
        `<div style="display:flex;align-items:center;gap:6px;margin-top:4px">` +
        `<span style="width:8px;height:8px;border-radius:999px;background:${row.color};flex-shrink:0"></span>` +
        `<span style="opacity:0.78">${row.name ? `${row.name} · ` : ""}</span>` +
        `<strong>${formatChartValue(row.value, valueFormat)}</strong></div>`,
    )
    .join("");
  return `<div style="font-weight:600;margin-bottom:2px">${category}</div>${items}`;
}
