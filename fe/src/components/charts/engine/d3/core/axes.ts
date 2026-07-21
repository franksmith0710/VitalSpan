import * as d3 from "d3";
import type { AntvThemeTokens } from "@/components/charts/engine/antv/theme";

export function pickCategoryTicks(categories: string[], innerWidth: number, minPx = 56): string[] {
  const maxTicks = Math.max(2, Math.floor(innerWidth / minPx));
  if (categories.length <= maxTicks) return categories;
  const step = Math.ceil(categories.length / maxTicks);
  return categories.filter((_, index) => index % step === 0 || index === categories.length - 1);
}

export function styleAxis(
  sel: d3.Selection<SVGGElement, unknown, null, undefined>,
  theme: AntvThemeTokens,
) {
  sel
    .selectAll("text")
    .attr("fill", theme.axisLabel)
    .style("font-size", "11px")
    .style("font-family", "inherit");
  sel.select(".domain").attr("stroke", theme.axisLine);
  sel.selectAll(".tick line").attr("stroke", theme.axisLine);
}

export function applyRotatedCategoryLabels(
  sel: d3.Selection<SVGGElement, unknown, null, undefined>,
  rotateDeg: number,
) {
  if (!rotateDeg) return;
  sel
    .selectAll("text")
    .attr("transform", `rotate(${rotateDeg})`)
    .style("text-anchor", "end")
    .attr("dx", "-0.4em")
    .attr("dy", "0.15em");
}
