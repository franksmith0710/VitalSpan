import * as d3 from "d3";

/** 笛卡尔图缩略轴：滚轮/拖拽缩放平移（plot 须位于已应用 margin 的父 g 内） */
export function attachCartesianDataZoom(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  plot: d3.Selection<SVGGElement, unknown, null, undefined>,
  innerW: number,
  innerH: number,
): () => void {
  const zoomed = plot.attr("transform") ?? null;
  const zoom = d3
    .zoom<SVGSVGElement>()
    .scaleExtent([0.4, 12])
    .translateExtent([
      [-innerW, -innerH],
      [innerW * 2, innerH * 2],
    ])
    .on("zoom", (event) => {
      plot.attr("transform", event.transform.toString());
    });
  svg.call(zoom);
  return () => {
    svg.on(".zoom", null);
    if (zoomed !== null) plot.attr("transform", zoomed);
  };
}
