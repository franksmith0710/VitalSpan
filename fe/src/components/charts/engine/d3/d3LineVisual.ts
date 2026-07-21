import * as d3 from "d3";

export type D3LineDatum = Record<string, string | number>;

export function pickCategoryTicks(categories: string[], innerWidth: number, minPx = 56): string[] {
  const maxTicks = Math.max(2, Math.floor(innerWidth / minPx));
  if (categories.length <= maxTicks) return categories;
  const step = Math.ceil(categories.length / maxTicks);
  return categories.filter((_, index) => index % step === 0 || index === categories.length - 1);
}

export function nearestCategory(
  mouseX: number,
  categories: string[],
  xScale: d3.ScalePoint<string>,
): string {
  let best = categories[0] ?? "";
  let bestDist = Infinity;
  for (const cat of categories) {
    const px = xScale(cat) ?? 0;
    const dist = Math.abs(px - mouseX);
    if (dist < bestDist) {
      bestDist = dist;
      best = cat;
    }
  }
  return best;
}

export function buildLineGenerator(
  horizontal: boolean,
  smooth: boolean,
  xScale: d3.ScalePoint<string> | d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number> | d3.ScalePoint<string>,
) {
  const curve = smooth ? d3.curveMonotoneX : d3.curveLinear;
  if (horizontal) {
    return d3
      .line<D3LineDatum>()
      .x((d) => (yScale as d3.ScaleLinear<number, number>)(Number(d.__value__ ?? 0)))
      .y((d) => (xScale as d3.ScalePoint<string>)(String(d.__category__ ?? "")) ?? 0)
      .curve(d3.curveMonotoneY);
  }
  return d3
    .line<D3LineDatum>()
    .x((d) => (xScale as d3.ScalePoint<string>)(String(d.__category__ ?? "")) ?? 0)
    .y((d) => (yScale as d3.ScaleLinear<number, number>)(Number(d.__value__ ?? 0)))
    .curve(curve);
}

export function buildAreaGenerator(
  horizontal: boolean,
  smooth: boolean,
  innerBaseline: number,
  xScale: d3.ScalePoint<string> | d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number> | d3.ScalePoint<string>,
) {
  const curve = smooth ? d3.curveMonotoneX : d3.curveLinear;
  if (horizontal) {
    return d3
      .area<D3LineDatum>()
      .x0(0)
      .x1((d) => (yScale as d3.ScaleLinear<number, number>)(Number(d.__value__ ?? 0)))
      .y((d) => (xScale as d3.ScalePoint<string>)(String(d.__category__ ?? "")) ?? 0)
      .curve(d3.curveMonotoneY);
  }
  return d3
    .area<D3LineDatum>()
    .x((d) => (xScale as d3.ScalePoint<string>)(String(d.__category__ ?? "")) ?? 0)
    .y0(innerBaseline)
    .y1((d) => (yScale as d3.ScaleLinear<number, number>)(Number(d.__value__ ?? 0)))
    .curve(curve);
}

export function animateStrokePath(
  path: d3.Selection<SVGPathElement, D3LineDatum[], null, undefined>,
  durationMs = 720,
) {
  const node = path.node();
  if (!node) return;
  const length = node.getTotalLength();
  path
    .attr("stroke-dasharray", `${length} ${length}`)
    .attr("stroke-dashoffset", length)
    .transition()
    .duration(durationMs)
    .ease(d3.easeCubicOut)
    .attr("stroke-dashoffset", 0);
}

export function ensureGradientDef(
  defs: d3.Selection<SVGDefsElement, unknown, null, undefined>,
  id: string,
  color: string,
  topOpacity = 0.28,
  bottomOpacity = 0.02,
) {
  const existing = defs.select(`#${id}`);
  if (!existing.empty()) existing.remove();

  const gradient = defs
    .append("linearGradient")
    .attr("id", id)
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "0%")
    .attr("y2", "100%");

  gradient.append("stop").attr("offset", "0%").attr("stop-color", color).attr("stop-opacity", topOpacity);
  gradient
    .append("stop")
    .attr("offset", "100%")
    .attr("stop-color", color)
    .attr("stop-opacity", bottomOpacity);
}
