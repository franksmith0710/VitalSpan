import * as d3 from "d3";
import { styleAxis } from "@/components/charts/engine/d3/core/axes";
import { cartesianMargin } from "@/components/charts/engine/d3/core/margin";
import { createTooltip, tooltipHtml } from "@/components/charts/engine/d3/core/tooltip";
import type { D3Datum, D3RenderConfig } from "@/components/charts/engine/d3/types";
import { formatChartValue } from "@/lib/chartValueFormat";

type ScatterDatum = Record<string, string | number>;

export function renderD3ScatterChart(container: HTMLElement, config: D3RenderConfig): () => void {
  container.replaceChildren();
  const { width, height, colors, theme, showLabel, showTooltip, valueFormat, options, onPointClick } = config;
  const data = (options.data as ScatterDatum[]) ?? [];
  const xField = String(options.xField ?? "x");
  const yField = String(options.yField ?? "y");
  const colorField = options.colorField ? String(options.colorField) : undefined;
  if (width <= 0 || height <= 0 || data.length === 0) return () => undefined;

  const margin = cartesianMargin(false);
  const innerW = Math.max(0, width - margin.left - margin.right);
  const innerH = Math.max(0, height - margin.top - margin.bottom);

  const xExtent = d3.extent(data, (d) => Number(d[xField])) as [number, number];
  const yExtent = d3.extent(data, (d) => Number(d[yField])) as [number, number];
  const xScale = d3.scaleLinear().domain(xExtent).nice().range([0, innerW]);
  const yScale = d3.scaleLinear().domain(yExtent).nice().range([innerH, 0]);

  const seriesNames = colorField
    ? [...new Set(data.map((d) => String(d[colorField] ?? "")))]
    : ["value"];
  const colorScale = d3.scaleOrdinal<string>().domain(seriesNames).range(colors);

  const svg = d3
    .select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("role", "img");

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const plot = g.append("g");

  plot
    .append("g")
    .attr("class", "grid")
    .call(
      d3
        .axisLeft(yScale)
        .ticks(5)
        .tickSize(-innerW)
        .tickFormat(() => ""),
    )
    .call((sel) => sel.select(".domain").remove())
    .call((sel) => sel.selectAll(".tick line").attr("stroke", theme.gridLine).attr("stroke-opacity", 0.9));

  g.append("g")
    .attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(xScale).ticks(6))
    .call(styleAxis, theme);

  g.append("g")
    .call(d3.axisLeft(yScale).ticks(5))
    .call(styleAxis, theme);

  const tooltip = showTooltip ? createTooltip(container, theme) : null;
  plot
    .selectAll<SVGCircleElement, ScatterDatum>("circle.point")
    .data(data)
    .join("circle")
    .attr("class", "point")
    .attr("r", 4.5)
    .attr("cx", (d) => xScale(Number(d[xField])))
    .attr("cy", (d) => yScale(Number(d[yField])))
    .attr("fill", (d) => {
      const key = colorField ? String(d[colorField] ?? "") : "value";
      return colorScale(key) ?? colors[0] ?? "#465fff";
    })
    .attr("stroke", "#fff")
    .attr("stroke-width", 1.5)
    .attr("opacity", 0.9)
    .style("cursor", onPointClick ? "pointer" : "default")
    .on("mouseenter", function () {
      d3.select(this).attr("r", 6).attr("opacity", 1);
    })
    .on("mouseleave", function () {
      d3.select(this).attr("r", 4.5).attr("opacity", 0.9);
      tooltip?.style("opacity", "0");
    })
    .on("mousemove", (event, d) => {
      if (!tooltip) return;
      const series = colorField ? String(d[colorField] ?? "") : "";
      const color = colorScale(series || "value") ?? colors[0] ?? "#465fff";
      const title = series || `${xField} / ${yField}`;
      tooltip
        .style("opacity", "1")
        .html(
          tooltipHtml(
            title,
            [
              { name: xField, color, value: d[xField] },
              { name: yField, color, value: d[yField] },
            ],
            valueFormat,
          ),
        );
      const rect = container.getBoundingClientRect();
      tooltip
        .style("left", `${Math.min(event.clientX - rect.left + 12, width - 160)}px`)
        .style("top", `${Math.max(event.clientY - rect.top - 48, 8)}px`);
    })
    .on("click", (_event, d) => onPointClick?.(d as D3Datum));

  if (showLabel) {
    plot
      .selectAll<SVGTextElement, ScatterDatum>("text.scatter-label")
      .data(data)
      .join("text")
      .attr("class", "scatter-label")
      .attr("x", (d) => xScale(Number(d[xField])) + 6)
      .attr("y", (d) => yScale(Number(d[yField])) - 6)
      .attr("fill", theme.axisLabel)
      .style("font-size", "10px")
      .text((d) => {
        if (colorField) return String(d[colorField] ?? "");
        return `${formatChartValue(d[xField], valueFormat)}, ${formatChartValue(d[yField], valueFormat)}`;
      });
  }

  return () => container.replaceChildren();
}
