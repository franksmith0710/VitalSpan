import * as d3 from "d3";

/** 笛卡尔图缩略轴：滚轮/拖拽缩放平移 */
export function attachCartesianDataZoom(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  plot: d3.Selection<SVGGElement, unknown, null, undefined>,
  margin: { left: number; top: number },
): () => void {
  const zoomed = plot.attr("transform") ?? null;
  const zoom = d3
    .zoom<SVGSVGElement>()
    .scaleExtent([0.4, 12])
    .translateExtent([
      [-margin.left, -margin.top],
      [Number(svg.attr("width")) + margin.left, Number(svg.attr("height")) + margin.top],
    ])
    .on("zoom", (event) => {
      plot.attr(
        "transform",
        `translate(${margin.left + event.transform.x},${margin.top + event.transform.y}) scale(${event.transform.k})`,
      );
    });
  svg.call(zoom);
  return () => {
    svg.on(".zoom", null);
    if (zoomed !== null) plot.attr("transform", zoomed);
  };
}
