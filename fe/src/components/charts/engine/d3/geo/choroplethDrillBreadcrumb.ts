import type { Selection } from "d3";
import type { AntvThemeTokens } from "@/components/charts/engine/antv/theme";

export type ChoroplethDrillBreadcrumbOpts = {
  drillBreadcrumbLabels?: string[];
  levelLabel?: string;
  drillDepth?: number;
  theme: AntvThemeTokens;
  isDark: boolean;
};

/** 地图下钻路径提示（画布内左上角，与 ChartDrillChrome 文案一致） */
export function mountChoroplethDrillBreadcrumb(
  root: Selection<SVGSVGElement, unknown, null, undefined>,
  opts: ChoroplethDrillBreadcrumbOpts,
): void {
  const crumbs = opts.drillBreadcrumbLabels?.filter(Boolean) ?? [];
  const showLevel = (opts.drillDepth ?? 0) > 0 || crumbs.length > 0;
  if (!showLevel) return;

  const trail = crumbs.length > 0 ? crumbs.join(" › ") : (opts.levelLabel ?? "");
  if (!trail) return;

  const g = root.append("g").attr("class", "map-drill-breadcrumb").attr("pointer-events", "none");
  const padX = 8;
  const padY = 5;
  const text = g
    .append("text")
    .attr("x", 12)
    .attr("y", 18)
    .attr("fill", opts.theme.axisLabel)
    .style("font-size", "11px")
    .style("font-weight", "500")
    .text(trail);

  const bbox = (text.node() as SVGTextElement | null)?.getBBox();
  if (bbox) {
    g.insert("rect", "text")
      .attr("x", bbox.x - padX)
      .attr("y", bbox.y - padY)
      .attr("width", bbox.width + padX * 2)
      .attr("height", bbox.height + padY * 2)
      .attr("rx", 4)
      .attr("fill", opts.isDark ? "rgba(15, 23, 42, 0.72)" : "rgba(255, 255, 255, 0.88)")
      .attr("stroke", opts.isDark ? "rgba(148, 163, 184, 0.35)" : "rgba(148, 163, 184, 0.45)")
      .attr("stroke-width", 0.75);
  }
}
