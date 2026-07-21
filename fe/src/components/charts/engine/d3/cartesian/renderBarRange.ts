import * as d3 from "d3";
import { chartTransition } from "@/components/charts/engine/d3/core/animate";
import { styleAxis } from "@/components/charts/engine/d3/core/axes";
import { cartesianMargin } from "@/components/charts/engine/d3/core/margin";
import { createTooltip } from "@/components/charts/engine/d3/core/tooltip";
import type { D3BarRangeRenderConfig } from "@/components/charts/engine/d3/types";
import { formatChartValue } from "@/lib/chartValueFormat";

const BAR_RX = 4;

export function renderD3BarRangeChart(container: HTMLElement, config: D3BarRangeRenderConfig): () => void {
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
    valueFormat,
    onPointClick,
  } = config;

  const categories = data.map((d) => d.type);
  const maxVal = d3.max(data, (d) => Math.max(d.low, d.high)) ?? 0;
  const minVal = d3.min(data, (d) => Math.min(d.low, d.high)) ?? 0;
  const maxLabelChars = categories.reduce((max, cat) => Math.max(max, String(cat).length), 0);
  const baseMargin = cartesianMargin(false);
  const margin = { ...baseMargin, left: Math.max(baseMargin.left, Math.min(140, maxLabelChars * 6.5 + 20)) };
  const innerW = Math.max(0, width - margin.left - margin.right);
  const innerH = Math.max(0, height - margin.top - margin.bottom);
  const rangeColor = colors[0] ?? "#465fff";

  const y = d3.scaleBand<string>().domain(categories).range([0, innerH]).padding(0.22);
  const x = d3.scaleLinear().domain([Math.min(0, minVal), maxVal]).nice().range([0, innerW]);

  const root = d3.select(container).append("svg").attr("width", width).attr("height", height).attr("role", "img");
  const g = root.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const plot = g.append("g");
  const tooltip = showTooltip ? createTooltip(container, theme) : null;

  g.append("g").call(d3.axisLeft(y)).call(styleAxis, theme);
  g.append("g")
    .attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat((d) => formatChartValue(d, valueFormat)))
    .call(styleAxis, theme);

  plot
    .selectAll("rect.range-bar")
    .data(data)
    .join("rect")
    .attr("class", "range-bar")
    .attr("y", (d) => y(d.type) ?? 0)
    .attr("height", y.bandwidth())
    .attr("rx", BAR_RX)
    .attr("fill", rangeColor)
    .attr("opacity", 0.85)
    .attr("cursor", onPointClick ? "pointer" : "default")
    .each(function (d) {
      const x0 = x(Math.min(d.low, d.high));
      const w = Math.max(0, Math.abs(x(d.high) - x(d.low)));
      chartTransition(d3.select(this).attr("x", x0).attr("width", 0))
        .duration(600)
        .ease(d3.easeCubicOut)
        .attr("width", w);
    })
    .on("click", (_e, d) => onPointClick?.(d));

  if (showTooltip) {
    plot
      .selectAll<SVGRectElement, (typeof data)[number]>("rect.range-bar")
      .on("mouseenter", (_e, d) => {
        tooltip
          ?.style("opacity", "1")
          .html(
            `<div style="font-weight:600;margin-bottom:2px">${d.type}</div>` +
              `<div>下限 <strong>${formatChartValue(d.low, valueFormat)}</strong></div>` +
              `<div>上限 <strong>${formatChartValue(d.high, valueFormat)}</strong></div>`,
          );
      })
      .on("mousemove", (event) => {
        const rect = container.getBoundingClientRect();
        tooltip
          ?.style("left", `${Math.min(event.clientX - rect.left + 12, width - 160)}px`)
          .style("top", `${Math.max(event.clientY - rect.top - 48, 8)}px`);
      })
      .on("mouseleave", () => tooltip?.style("opacity", "0"));
  }

  if (showLabel) {
    plot
      .selectAll("text.range-label")
      .data(data)
      .join("text")
      .attr("class", "range-label")
      .attr("x", (d) => x(Math.max(d.low, d.high)) + 4)
      .attr("y", (d) => (y(d.type) ?? 0) + y.bandwidth() / 2)
      .attr("dy", "0.32em")
      .attr("fill", theme.axisLabel)
      .style("font-size", `${labelFontSize}px`)
      .text((d) => `${formatChartValue(d.low, valueFormat)} – ${formatChartValue(d.high, valueFormat)}`);
  }

  return () => container.replaceChildren();
}
