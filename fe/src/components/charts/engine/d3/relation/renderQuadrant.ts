import * as d3 from "d3";
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
  if (data.length === 0) return cleanupScatter;

  const xMean = d3.mean(data, (d) => Number(d[xField])) ?? 0;
  const yMean = d3.mean(data, (d) => Number(d[yField])) ?? 0;

  const margin = { left: 48, top: 16 };
  const width = Number(svg.getAttribute("width")) || 0;
  const height = Number(svg.getAttribute("height")) || 0;
  const innerW = Math.max(0, width - margin.left - 16);
  const innerH = Math.max(0, height - margin.top - 24);

  const xExtent = d3.extent(data, (d) => Number(d[xField])) as [number, number];
  const yExtent = d3.extent(data, (d) => Number(d[yField])) as [number, number];
  const xScale = d3.scaleLinear().domain(xExtent).nice().range([0, innerW]);
  const yScale = d3.scaleLinear().domain(yExtent).nice().range([innerH, 0]);

  const plot = d3.select(svg).select<SVGGElement>("g");
  if (plot.empty()) return cleanupScatter;

  plot
    .append("line")
    .attr("class", "quadrant-median-x")
    .attr("x1", margin.left + xScale(xMean))
    .attr("x2", margin.left + xScale(xMean))
    .attr("y1", margin.top)
    .attr("y2", margin.top + innerH)
    .attr("stroke", "#64748b")
    .attr("stroke-width", 1.5)
    .attr("stroke-dasharray", "4 3");

  plot
    .append("line")
    .attr("class", "quadrant-median-y")
    .attr("x1", margin.left)
    .attr("x2", margin.left + innerW)
    .attr("y1", margin.top + yScale(yMean))
    .attr("y2", margin.top + yScale(yMean))
    .attr("stroke", "#64748b")
    .attr("stroke-width", 1.5)
    .attr("stroke-dasharray", "4 3");

  return () => {
    cleanupScatter();
  };
}
