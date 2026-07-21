import * as d3 from "d3";
import { styleAxis } from "@/components/charts/engine/d3/core/axes";
import { paintHorizontalBar } from "@/components/charts/engine/d3/core/depthEngine";
import { cartesianMargin } from "@/components/charts/engine/d3/core/margin";
import { createTooltip } from "@/components/charts/engine/d3/core/tooltip";
import type { D3BulletRenderConfig } from "@/components/charts/engine/d3/types";
import { formatChartValue } from "@/lib/chartValueFormat";

const BAR_RX = 3;

export function renderD3BulletChart(container: HTMLElement, config: D3BulletRenderConfig): () => void {
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
  const maxRange = d3.max(data, (d) => d.rangeMax) ?? 1;
  const maxLabelChars = categories.reduce((max, cat) => Math.max(max, String(cat).length), 0);
  const baseMargin = cartesianMargin(false);
  const margin = { ...baseMargin, left: Math.max(baseMargin.left, Math.min(140, maxLabelChars * 6.5 + 20)) };
  const innerW = Math.max(0, width - margin.left - margin.right);
  const innerH = Math.max(0, height - margin.top - margin.bottom);
  const measureColor = colors[0] ?? "#465fff";
  const zoneColors = [colors[2] ?? "#e4e7ec", colors[3] ?? "#d0d5dd", colors[4] ?? "#98a2b3"];

  const y = d3.scaleBand<string>().domain(categories).range([0, innerH]).padding(0.3);
  const x = d3.scaleLinear().domain([0, maxRange]).nice().range([0, innerW]);
  const barH = Math.max(8, y.bandwidth() * 0.55);

  const root = d3.select(container).append("svg").attr("width", width).attr("height", height).attr("role", "img");
  const g = root.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const plot = g.append("g");
  const tooltip = showTooltip ? createTooltip(container, theme) : null;

  g.append("g").call(d3.axisLeft(y)).call(styleAxis, theme);
  g.append("g")
    .attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat((d) => formatChartValue(d, valueFormat)))
    .call(styleAxis, theme);

  for (const d of data) {
    const y0 = (y(d.type) ?? 0) + (y.bandwidth() - barH) / 2;
    const zones = [
      { end: d.rangeMax * 0.66, color: zoneColors[0] },
      { end: d.rangeMax * 0.85, color: zoneColors[1] },
      { end: d.rangeMax, color: zoneColors[2] },
    ];
    let start = 0;
    for (const zone of zones) {
      plot
        .append("rect")
        .attr("x", x(start))
        .attr("y", y0)
        .attr("width", Math.max(0, x(zone.end) - x(start)))
        .attr("height", barH)
        .attr("fill", zone.color)
        .attr("opacity", 0.55);
      start = zone.end;
    }

    const measure = plot
      .append("g")
      .attr("class", "bullet-measure")
      .attr("transform", `translate(0,${y0})`)
      .attr("cursor", onPointClick ? "pointer" : "default")
      .each(function () {
        const cell = d3.select(this);
        const w = x(d.actual);
        paintHorizontalBar({ plot: cell, x: 0, y: 0, width: w, height: barH, color: measureColor, rx: BAR_RX });
      })
      .on("click", () => onPointClick?.(d));

    if (showTooltip) {
      measure
        .on("mouseenter", () => {
          tooltip
            ?.style("opacity", "1")
            .html(
              [
                `<div style="font-weight:600;margin-bottom:2px">${d.type}</div>`,
                `<div>实际 <strong>${formatChartValue(d.actual, valueFormat)}</strong></div>`,
                `<div>目标 <strong>${formatChartValue(d.target, valueFormat)}</strong></div>`,
              ].join(""),
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

    plot
      .append("line")
      .attr("x1", x(d.target))
      .attr("x2", x(d.target))
      .attr("y1", y0 - 2)
      .attr("y2", y0 + barH + 2)
      .attr("stroke", theme.axisLabel)
      .attr("stroke-width", 2);

    if (showLabel) {
      plot
        .append("text")
        .attr("x", x(d.actual) + 4)
        .attr("y", y0 + barH / 2)
        .attr("dy", "0.32em")
        .attr("fill", theme.axisLabel)
        .style("font-size", `${labelFontSize}px`)
        .text(formatChartValue(d.actual, valueFormat));
    }
  }

  return () => container.replaceChildren();
}
