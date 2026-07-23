import * as d3 from "d3";
import { cartesianMargin } from "@/components/charts/engine/d3/core/margin";
import { resolveEffectiveDepth } from "@/components/charts/engine/d3/core/depthEngine";
import { themeFromConfig } from "@/components/charts/engine/d3/core/themeEngine";
import { renderD3ScatterChart } from "@/components/charts/engine/d3/relation/renderScatter";
import type { D3RenderConfig } from "@/components/charts/engine/d3/types";

/** 象限图：散点 + 均值十字分割线 */
export function renderD3QuadrantChart(container: HTMLElement, config: D3RenderConfig): () => void {
  const cleanupScatter = renderD3ScatterChart(container, config);
  const svg = container.querySelector("svg");
  if (!svg) return cleanupScatter;

  const data = (config.options.data as Array<Record<string, number>>) ?? [];
  const xField = String(config.options.xField ?? "x");
  const yField = String(config.options.yField ?? "y");
  const colorField = config.options.colorField ? String(config.options.colorField) : undefined;
  if (data.length === 0) return cleanupScatter;

  const theme = themeFromConfig(config.theme);
  const margin = cartesianMargin(config.showLegend && !!colorField);
  const width = Number(svg.getAttribute("width")) || 0;
  const height = Number(svg.getAttribute("height")) || 0;
  const innerW = Math.max(0, width - margin.left - margin.right);
  const innerH = Math.max(0, height - margin.top - margin.bottom);

  const xMean = d3.mean(data, (d) => Number(d[xField])) ?? 0;
  const yMean = d3.mean(data, (d) => Number(d[yField])) ?? 0;
  const xExtent = d3.extent(data, (d) => Number(d[xField])) as [number, number];
  const yExtent = d3.extent(data, (d) => Number(d[yField])) as [number, number];
  const xScale = d3.scaleLinear().domain(xExtent).nice().range([0, innerW]);
  const yScale = d3.scaleLinear().domain(yExtent).nice().range([innerH, 0]);

  const plot = d3.select(svg).select<SVGGElement>("g > g");
  if (plot.empty()) return cleanupScatter;

  const depthLevel = resolveEffectiveDepth(config.depthVisual);
  if (depthLevel !== "off") {
    const xMid = xScale(xMean);
    const yMid = yScale(yMean);
    const quadrants = [
      { key: "tl", x: 0, y: 0, w: xMid, h: yMid, cx: 0, cy: 0 },
      { key: "tr", x: xMid, y: 0, w: innerW - xMid, h: yMid, cx: 1, cy: 0 },
      { key: "bl", x: 0, y: yMid, w: xMid, h: innerH - yMid, cx: 0, cy: 1 },
      { key: "br", x: xMid, y: yMid, w: innerW - xMid, h: innerH - yMid, cx: 1, cy: 1 },
    ];
    const defs = d3.select(svg).select("defs").empty() ? d3.select(svg).append("defs") : d3.select(svg).select("defs");
    const bg = plot.insert("g", ":first-child").attr("class", "quadrant-depth-bg");
    for (const q of quadrants) {
      if (q.w <= 0 || q.h <= 0) continue;
      const gradId = `vs-quadrant-radial-${q.key}`;
      const grad = defs
        .append("radialGradient")
        .attr("id", gradId)
        .attr("cx", q.cx === 0 ? "0%" : "100%")
        .attr("cy", q.cy === 0 ? "0%" : "100%")
        .attr("r", "100%");
      grad.append("stop").attr("offset", "0%").attr("stop-color", theme.accent).attr("stop-opacity", 0.1);
      grad.append("stop").attr("offset", "100%").attr("stop-color", theme.accent).attr("stop-opacity", 0);
      bg.append("rect")
        .attr("x", q.x)
        .attr("y", q.y)
        .attr("width", q.w)
        .attr("height", q.h)
        .attr("fill", `url(#${gradId})`)
        .attr("pointer-events", "none");
    }
  }

  const medianStroke = theme.axisLine;
  plot
    .append("line")
    .attr("class", "quadrant-median-x")
    .attr("x1", xScale(xMean))
    .attr("x2", xScale(xMean))
    .attr("y1", 0)
    .attr("y2", innerH)
    .attr("stroke", medianStroke)
    .attr("stroke-width", 1.5)
    .attr("stroke-dasharray", "4 3")
    .attr("pointer-events", "none");

  plot
    .append("line")
    .attr("class", "quadrant-median-y")
    .attr("x1", 0)
    .attr("x2", innerW)
    .attr("y1", yScale(yMean))
    .attr("y2", yScale(yMean))
    .attr("stroke", medianStroke)
    .attr("stroke-width", 1.5)
    .attr("stroke-dasharray", "4 3")
    .attr("pointer-events", "none");

  return () => {
    cleanupScatter();
  };
}
