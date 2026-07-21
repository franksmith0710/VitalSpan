import * as d3 from "d3";
import type { AntvThemeTokens } from "@/components/charts/engine/antv/theme";

const SLIDER_H = 14;
const SLIDER_GAP = 6;

type DataZoomOpts = {
  showSlider?: boolean;
  theme?: AntvThemeTokens;
};

/** 笛卡尔图缩略轴：滚轮/拖拽缩放平移；可选底部 brush 滑条 */
export function attachCartesianDataZoom(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  plot: d3.Selection<SVGGElement, unknown, null, undefined>,
  innerW: number,
  innerH: number,
  opts: DataZoomOpts = {},
): () => void {
  const showSlider = opts.showSlider !== false;
  const theme = opts.theme;
  const plotBase = plot.attr("transform") ?? null;

  const zoom = d3
    .zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.4, 12])
    .translateExtent([
      [-innerW, -innerH],
      [innerW * 2, innerH * 2],
    ])
    .on("zoom", (event) => {
      plot.attr("transform", event.transform.toString());
    });

  svg.call(zoom);

  let brushG: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
  let brushCleanup = () => undefined;

  if (showSlider && innerW > 48) {
    const parent = plot.node()?.parentElement
      ? d3.select<SVGGElement, unknown>(plot.node()!.parentElement as SVGGElement)
      : null;
    if (parent) {
      brushG = parent
        .append("g")
        .attr("class", "data-zoom-slider")
        .attr("transform", `translate(0,${innerH + SLIDER_GAP})`);

      brushG
        .append("rect")
        .attr("width", innerW)
        .attr("height", SLIDER_H)
        .attr("rx", 3)
        .attr("fill", theme?.gridLine ?? "#e4e7ec")
        .attr("opacity", 0.35);

      const brush = d3
        .brushX()
        .extent([
          [0, 0],
          [innerW, SLIDER_H],
        ])
        .on("end", (event) => {
          if (!event.selection) return;
          const [x0, x1] = event.selection as [number, number];
          const span = Math.max(x1 - x0, 8);
          const k = innerW / span;
          const t = d3.zoomIdentity.translate(-x0 * k, 0).scale(k);
          svg.transition().duration(280).call(zoom.transform, t);
        });

      brushG.call(brush);
      brushG.selectAll(".overlay").attr("cursor", "crosshair");
      brushG.selectAll(".selection").attr("fill", theme?.accent ?? "#465fff").attr("fill-opacity", 0.18);

      brushCleanup = () => {
        brushG?.remove();
      };
    }
  }

  return () => {
    svg.on(".zoom", null);
    brushCleanup();
    if (plotBase !== null) plot.attr("transform", plotBase);
  };
}
