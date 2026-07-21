import * as d3 from "d3";

export function ensureGradientDef(
  defs: d3.Selection<SVGDefsElement, unknown, null, undefined>,
  id: string,
  color: string,
  topOpacity = 0.28,
  bottomOpacity = 0.02,
) {
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "_");
  defs.select(`#${safeId}`).remove();

  const gradient = defs
    .append("linearGradient")
    .attr("id", safeId)
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

  return safeId;
}
