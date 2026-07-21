import * as d3 from "d3";
import { applyRotatedCategoryLabels, pickCategoryTicks, styleAxis } from "@/components/charts/engine/d3/core/axes";
import { cartesianMargin } from "@/components/charts/engine/d3/core/margin";
import { createTooltip } from "@/components/charts/engine/d3/core/tooltip";
import type { D3StockRenderConfig } from "@/components/charts/engine/d3/types";
import { formatChartValue } from "@/lib/chartValueFormat";

export function renderD3StockChart(container: HTMLElement, config: D3StockRenderConfig): () => void {
  container.replaceChildren();
  if (config.width <= 0 || config.height <= 0 || config.data.length === 0) return () => undefined;

  const { width, height, data, colors, theme, showTooltip, valueFormat, onPointClick } = config;

  const categories = data.map((d) => d.type);
  const yMin = d3.min(data, (d) => d.low) ?? 0;
  const yMax = d3.max(data, (d) => d.high) ?? 0;
  const margin = cartesianMargin(false);
  const innerW = Math.max(0, width - margin.left - margin.right);
  const innerH = Math.max(0, height - margin.top - margin.bottom);
  const upColor = colors[0] ?? "#12b76a";
  const downColor = colors[1] ?? "#f04438";
  const xTicks = pickCategoryTicks(categories, innerW);
  const rotateX = xTicks.length >= 6 && innerW / xTicks.length < 72 ? -32 : 0;

  const x = d3.scaleBand<string>().domain(categories).range([0, innerW]).padding(0.3);
  const y = d3.scaleLinear().domain([yMin, yMax]).nice().range([innerH, 0]);
  const bodyW = Math.max(4, x.bandwidth() * 0.6);

  const root = d3.select(container).append("svg").attr("width", width).attr("height", height).attr("role", "img");
  const g = root.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const plot = g.append("g");
  const tooltip = showTooltip ? createTooltip(container, theme) : null;

  g.append("g")
    .call(d3.axisLeft(y).ticks(5).tickFormat((d) => formatChartValue(d, valueFormat)))
    .call(styleAxis, theme);
  g.append("g")
    .attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x).tickValues(xTicks))
    .call(styleAxis, theme)
    .call((sel) => applyRotatedCategoryLabels(sel, rotateX));

  for (const d of data) {
    const cx = (x(d.type) ?? 0) + x.bandwidth() / 2;
    const up = d.close >= d.open;
    const color = up ? upColor : downColor;
    const bodyTop = y(Math.max(d.open, d.close));
    const bodyBottom = y(Math.min(d.open, d.close));
    const bodyH = Math.max(1, bodyBottom - bodyTop);

    plot
      .append("line")
      .attr("x1", cx)
      .attr("x2", cx)
      .attr("y1", y(d.high))
      .attr("y2", y(d.low))
      .attr("stroke", color)
      .attr("stroke-width", 1.5);

    const candle = plot
      .append("rect")
      .attr("class", "candle")
      .attr("x", cx - bodyW / 2)
      .attr("y", bodyTop)
      .attr("width", bodyW)
      .attr("height", bodyH)
      .attr("fill", color)
      .attr("cursor", onPointClick ? "pointer" : "default")
      .on("click", () => onPointClick?.(d));

    if (showTooltip) {
      candle
        .on("mouseenter", () => {
          tooltip
            ?.style("opacity", "1")
            .html(
              `<div style="font-weight:600;margin-bottom:2px">${d.type}</div>` +
                `<div>开 <strong>${formatChartValue(d.open, valueFormat)}</strong> · 收 <strong>${formatChartValue(d.close, valueFormat)}</strong></div>` +
                `<div>低 <strong>${formatChartValue(d.low, valueFormat)}</strong> · 高 <strong>${formatChartValue(d.high, valueFormat)}</strong></div>`,
            );
        })
        .on("mousemove", (event) => {
          const rect = container.getBoundingClientRect();
          tooltip
            ?.style("left", `${Math.min(event.clientX - rect.left + 12, width - 180)}px`)
            .style("top", `${Math.max(event.clientY - rect.top - 56, 8)}px`);
        })
        .on("mouseleave", () => tooltip?.style("opacity", "0"));
    }
  }

  return () => container.replaceChildren();
}
