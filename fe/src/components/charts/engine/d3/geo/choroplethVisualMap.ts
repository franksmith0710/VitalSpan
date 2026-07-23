import type { Selection } from "d3";
import { formatGeoTooltipValue } from "@/components/charts/engine/geo/OfflineGeoPort";
import { colorForGeoValue } from "@/components/charts/engine/geo/geoSurfaceColors";
import type { GeoSurfacePalette } from "@/components/charts/engine/geo/geoSurfaceColors";
import type { AntvThemeTokens } from "@/components/charts/engine/antv/theme";
import type { NumberFormatConfig } from "@/components/dashboard/dashboardStyleConfig";

export type ChoroplethVisualMapOpts = {
  minVal: number;
  maxVal: number;
  surface: GeoSurfacePalette;
  theme: AntvThemeTokens;
  valueFormat?: NumberFormatConfig;
  isDark: boolean;
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
};

/** 2D  choropleth 连续色阶图例（与 Three visualMap 语义对齐） */
export function mountChoroplethVisualMap(
  root: Selection<SVGSVGElement, unknown, null, undefined>,
  opts: ChoroplethVisualMapOpts,
): void {
  const { minVal, maxVal, surface, theme, valueFormat, isDark, width, height, margin } = opts;
  const legendW = 100;
  const legendH = 8;
  const legendX = width - margin.right - legendW;
  const legendY = height - margin.bottom + 4;
  const legendG = root.append("g").attr("class", "map-visual-map").attr("transform", `translate(${legendX},${legendY})`);
  const defs = root.append("defs");
  const gradId = `d3-choropleth-legend-${Math.random().toString(36).slice(2, 9)}`;
  const grad = defs.append("linearGradient").attr("id", gradId).attr("x1", "0%").attr("x2", "100%");
  const legendStops = [0, 0.35, 0.7, 1];
  for (const t of legendStops) {
    grad
      .append("stop")
      .attr("offset", `${t * 100}%`)
      .attr("stop-color", colorForGeoValue(minVal + t * (maxVal - minVal || 1), minVal, maxVal, surface));
  }
  legendG
    .append("rect")
    .attr("width", legendW)
    .attr("height", legendH)
    .attr("rx", 3)
    .attr("fill", `url(#${gradId})`)
    .attr("stroke", isDark ? "rgba(148, 163, 184, 0.35)" : "rgba(148, 163, 184, 0.5)")
    .attr("stroke-width", 0.75);
  legendG
    .append("text")
    .attr("y", legendH + 12)
    .attr("fill", theme.axisLabel)
    .style("font-size", "10px")
    .text(formatGeoTooltipValue(minVal, valueFormat));
  legendG
    .append("text")
    .attr("x", legendW)
    .attr("y", legendH + 12)
    .attr("text-anchor", "end")
    .attr("fill", theme.axisLabel)
    .style("font-size", "10px")
    .text(formatGeoTooltipValue(maxVal, valueFormat));
}
