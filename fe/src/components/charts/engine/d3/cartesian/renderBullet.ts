import * as d3 from "d3";
import { resolveHorizontalCategoryAxisLayout } from "@/components/charts/engine/d3/core/axes";
import { drawCartesianHorizontalBandAxes } from "@/components/charts/engine/d3/core/sceneGraph";
import { paintHorizontalBar } from "@/components/charts/engine/d3/core/depthEngine";
import { cartesianMargin } from "@/components/charts/engine/d3/core/margin";
import {
  createTooltipLayer,
  hideTooltip,
  showSimpleTooltip,
} from "@/components/charts/engine/d3/core/tooltipLayer";
import type { D3BulletRenderConfig } from "@/components/charts/engine/d3/types";
import { resolveBarBandPadding } from "@/lib/applyChartDeStyleBlocks";
import { formatChartValue } from "@/lib/chartValueFormat";

const BAR_RX = 3;
const DEFAULT_ZONE_FRACTIONS = [0.66, 0.85, 1];

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
    barWidthRatio,
    barRadius,
    axisStyle,
    bulletZones,
    tooltipPresentation,
  } = config;

  const barRx = barRadius ?? BAR_RX;
  const zoneFractions = bulletZones?.length ? bulletZones : DEFAULT_ZONE_FRACTIONS;
  const categories = data.map((d) => d.type);
  const maxRange = d3.max(data, (d) => d.rangeMax) ?? 1;
  const baseMargin = cartesianMargin(false);
  const provisionalInnerH = Math.max(0, height - baseMargin.top - baseMargin.bottom);
  const yLayout = resolveHorizontalCategoryAxisLayout(categories, provisionalInnerH);
  const margin = { ...baseMargin, left: Math.max(baseMargin.left, yLayout.leftMargin) };
  const innerW = Math.max(0, width - margin.left - margin.right);
  const innerH = Math.max(0, height - margin.top - margin.bottom);
  const measureColor = colors[0] ?? "#465fff";
  const zoneColors = [colors[2] ?? "#e4e7ec", colors[3] ?? "#d0d5dd", colors[4] ?? "#98a2b3"];

  const y = d3.scaleBand<string>().domain(categories).range([0, innerH]).padding(resolveBarBandPadding(barWidthRatio));
  const x = d3.scaleLinear().domain([0, maxRange]).nice().range([0, innerW]);
  const barH = Math.max(8, y.bandwidth() * 0.55);

  const root = d3.select(container).append("svg").attr("width", width).attr("height", height).attr("role", "img");
  const g = root.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const plot = g.append("g");
  const tooltip = showTooltip ? createTooltipLayer(container, theme, tooltipPresentation) : null;

  drawCartesianHorizontalBandAxes({ g, xScale: x, yScale: y, innerW, innerH, theme, valueFormat, axisStyle });

  for (const d of data) {
    const y0 = (y(d.type) ?? 0) + (y.bandwidth() - barH) / 2;
    let start = 0;
    zoneFractions.forEach((frac, zi) => {
      const end = d.rangeMax * frac;
      plot
        .append("rect")
        .attr("x", x(start))
        .attr("y", y0)
        .attr("width", Math.max(0, x(end) - x(start)))
        .attr("height", barH)
        .attr("fill", zoneColors[zi] ?? zoneColors[zoneColors.length - 1])
        .attr("opacity", 0.55);
      start = end;
    });

    const measure = plot
      .append("g")
      .attr("class", "bullet-measure")
      .attr("transform", `translate(0,${y0})`)
      .attr("cursor", onPointClick ? "pointer" : "default")
      .each(function () {
        const cell = d3.select(this);
        const w = x(d.actual);
        paintHorizontalBar({ plot: cell, x: 0, y: 0, width: w, height: barH, color: measureColor, rx: barRx });
      })
      .on("click", () => onPointClick?.(d));

    if (showTooltip) {
      const tipHtml =
        `<div style="font-weight:600;margin-bottom:2px">${d.type}</div>` +
        `<div>实际 <strong>${formatChartValue(d.actual, valueFormat)}</strong></div>` +
        `<div>目标 <strong>${formatChartValue(d.target, valueFormat)}</strong></div>`;

      measure
        .on("mouseenter", (event) => showSimpleTooltip(tooltip, container, event, tipHtml, width))
        .on("mousemove", (event) => showSimpleTooltip(tooltip, container, event, tipHtml, width))
        .on("mouseleave", () => hideTooltip(tooltip));
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

  return () => {
    hideTooltip(tooltip);
    container.replaceChildren();
  };
}
