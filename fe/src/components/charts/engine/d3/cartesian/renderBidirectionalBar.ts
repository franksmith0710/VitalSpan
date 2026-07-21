import * as d3 from "d3";
import { styleAxis } from "@/components/charts/engine/d3/core/axes";
import { paintHorizontalBar } from "@/components/charts/engine/d3/core/depthEngine";
import { cartesianMargin } from "@/components/charts/engine/d3/core/margin";
import { createTooltip } from "@/components/charts/engine/d3/core/tooltip";
import { resolveLabelFill } from "@/components/charts/engine/d3/core/presentation";
import { renderConfiguredInlineLegend } from "@/components/charts/engine/d3/core/d3Legend";
import type { D3BidirectionalBarRenderConfig } from "@/components/charts/engine/d3/types";
import { formatChartValue } from "@/lib/chartValueFormat";

const BAR_RX = 4;

export function renderD3BidirectionalBarChart(
  container: HTMLElement,
  config: D3BidirectionalBarRenderConfig,
): () => void {
  container.replaceChildren();
  if (config.width <= 0 || config.height <= 0 || config.data.length === 0) return () => undefined;

  const {
    width,
    height,
    data,
    colors,
    theme,
    showTooltip,
    showLabel,
    labelFontSize = 11,
    labelColor,
    showLegend = true,
    legendLayout,
    valueFormat,
    onPointClick,
  } = config;

  const categories = data.map((d) => d.type);
  const maxLeft = d3.max(data, (d) => Math.abs(d.left)) ?? 0;
  const maxRight = d3.max(data, (d) => Math.abs(d.right)) ?? 0;
  const maxVal = Math.max(maxLeft, maxRight, 1);
  const margin = { ...cartesianMargin(false), left: 72, right: 72 };
  const innerW = Math.max(0, width - margin.left - margin.right);
  const innerH = Math.max(0, height - margin.top - margin.bottom);
  const centerX = innerW / 2;

  const y = d3.scaleBand<string>().domain(categories).range([0, innerH]).padding(0.22);
  const xLeft = d3.scaleLinear().domain([0, maxVal]).range([centerX, 0]);
  const xRight = d3.scaleLinear().domain([0, maxVal]).range([centerX, innerW]);
  const leftColor = colors[0] ?? "#465fff";
  const rightColor = colors[1] ?? "#12b76a";

  const root = d3.select(container).append("svg").attr("width", width).attr("height", height).attr("role", "img");
  const g = root.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const plot = g.append("g");
  const tooltip = showTooltip ? createTooltip(container, theme) : null;

  g.append("g").call(d3.axisLeft(y)).call(styleAxis, theme);
  g.append("g")
    .attr("transform", `translate(0,${innerH})`)
    .call(
      d3
        .axisBottom(xRight)
        .ticks(5)
        .tickFormat((d) => formatChartValue(d, valueFormat)),
    )
    .call(styleAxis, theme);

  plot
    .append("line")
    .attr("x1", centerX)
    .attr("x2", centerX)
    .attr("y1", 0)
    .attr("y2", innerH)
    .attr("stroke", theme.axisLine)
    .attr("stroke-width", 1);

  plot
    .selectAll("g.left-bar")
    .data(data)
    .join("g")
    .attr("class", "left-bar")
    .attr("transform", (d) => `translate(0,${y(d.type) ?? 0})`)
    .attr("cursor", onPointClick ? "pointer" : "default")
    .each(function (d) {
      const cell = d3.select(this) as d3.Selection<SVGGElement, unknown, null, undefined>;
      cell.selectAll("*").remove();
      const x1 = xLeft(Math.abs(d.left));
      const w = centerX - x1;
      paintHorizontalBar({ plot: cell, x: x1, y: 0, width: w, height: y.bandwidth(), color: leftColor, rx: BAR_RX });
    })
    .on("click", (_event, d) => onPointClick?.(d));

  plot
    .selectAll("g.right-bar")
    .data(data)
    .join("g")
    .attr("class", "right-bar")
    .attr("transform", (d) => `translate(0,${y(d.type) ?? 0})`)
    .attr("cursor", onPointClick ? "pointer" : "default")
    .each(function (d) {
      const cell = d3.select(this) as d3.Selection<SVGGElement, unknown, null, undefined>;
      cell.selectAll("*").remove();
      const w = xRight(Math.abs(d.right)) - centerX;
      paintHorizontalBar({ plot: cell, x: centerX, y: 0, width: w, height: y.bandwidth(), color: rightColor, rx: BAR_RX });
    })
    .on("click", (_event, d) => onPointClick?.(d));

  if (showTooltip) {
    const bindTooltip = (sel: d3.Selection<SVGGElement, (typeof data)[0], SVGGElement, unknown>, side: "left" | "right") => {
      sel
        .on("mouseenter", function (_event, d) {
          const value = side === "left" ? d.left : d.right;
          tooltip
            ?.style("opacity", "1")
            .html(
              `<div style="font-weight:600;margin-bottom:2px">${d.type}</div>` +
                `<div>${side === "left" ? "左" : "右"} · <strong>${formatChartValue(value, valueFormat)}</strong></div>`,
            );
        })
        .on("mousemove", (event) => {
          const rect = container.getBoundingClientRect();
          tooltip
            ?.style("left", `${Math.min(event.clientX - rect.left + 12, width - 160)}px`)
            .style("top", `${Math.max(event.clientY - rect.top - 48, 8)}px`);
        })
        .on("mouseleave", () => tooltip?.style("opacity", "0"));
    };
    bindTooltip(plot.selectAll<SVGGElement, (typeof data)[0]>("g.left-bar"), "left");
    bindTooltip(plot.selectAll<SVGGElement, (typeof data)[0]>("g.right-bar"), "right");
  }

  renderConfiguredInlineLegend(
    root,
    showLegend,
    [
      { label: "左", color: leftColor },
      { label: "右", color: rightColor },
    ],
    { width, height, margin, theme, layout: legendLayout, fontSize: legendLayout?.fontSize },
  );

  if (showLabel) {
    plot
      .selectAll("text.left-label")
      .data(data)
      .join("text")
      .attr("class", "left-label")
      .attr("x", (d) => xLeft(Math.abs(d.left)) - 4)
      .attr("y", (d) => (y(d.type) ?? 0) + y.bandwidth() / 2)
      .attr("dy", "0.32em")
      .attr("text-anchor", "end")
      .attr("fill", resolveLabelFill(theme, labelColor))
      .style("font-size", `${labelFontSize}px`)
      .text((d) => formatChartValue(d.left, valueFormat));
    plot
      .selectAll("text.right-label")
      .data(data)
      .join("text")
      .attr("class", "right-label")
      .attr("x", (d) => xRight(Math.abs(d.right)) + 4)
      .attr("y", (d) => (y(d.type) ?? 0) + y.bandwidth() / 2)
      .attr("dy", "0.32em")
      .attr("text-anchor", "start")
      .attr("fill", resolveLabelFill(theme, labelColor))
      .style("font-size", `${labelFontSize}px`)
      .text((d) => formatChartValue(d.right, valueFormat));
  }

  return () => container.replaceChildren();
}
