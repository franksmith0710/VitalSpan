import * as d3 from "d3";
import { VCDS } from "@/components/charts/engine/d3/core/chartVisualTokens";
import { resolveHorizontalCategoryAxisLayout } from "@/components/charts/engine/d3/core/axes";
import { drawCartesianHorizontalBandAxes } from "@/components/charts/engine/d3/core/sceneGraph";
import { applyCellBevel, applyDepthHoverLift, paintHorizontalBar } from "@/components/charts/engine/d3/core/depthEngine";
import { cartesianMargin } from "@/components/charts/engine/d3/core/margin";
import {
  createTooltipLayer,
  hideTooltip,
  showSimpleTooltip,
} from "@/components/charts/engine/d3/core/tooltipLayer";
import type { D3BarRangeRenderConfig } from "@/components/charts/engine/d3/types";
import { resolveBarBandPadding } from "@/lib/applyChartDeStyleBlocks";
import { formatChartValue } from "@/lib/chartValueFormat";

const BAR_RX = VCDS.bar.rx;

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
    barWidthRatio,
    barRadius,
    axisStyle,
    tooltipPresentation,
  } = config;

  const barRx = barRadius ?? BAR_RX;
  const categories = data.map((d) => d.type);
  const maxVal = d3.max(data, (d) => Math.max(d.low, d.high)) ?? 0;
  const minVal = d3.min(data, (d) => Math.min(d.low, d.high)) ?? 0;
  const baseMargin = cartesianMargin(false);
  const provisionalInnerH = Math.max(0, height - baseMargin.top - baseMargin.bottom);
  const yLayout = resolveHorizontalCategoryAxisLayout(categories, provisionalInnerH);
  const margin = { ...baseMargin, left: Math.max(baseMargin.left, yLayout.leftMargin) };
  const innerW = Math.max(0, width - margin.left - margin.right);
  const innerH = Math.max(0, height - margin.top - margin.bottom);
  const rangeColor = colors[0] ?? "#465fff";

  const y = d3.scaleBand<string>().domain(categories).range([0, innerH]).padding(resolveBarBandPadding(barWidthRatio));
  const x = d3.scaleLinear().domain([Math.min(0, minVal), maxVal]).nice().range([0, innerW]);

  const root = d3.select(container).append("svg").attr("width", width).attr("height", height).attr("role", "img");
  const g = root.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const plot = g.append("g");
  const tooltip = showTooltip ? createTooltipLayer(container, theme, tooltipPresentation) : null;

  drawCartesianHorizontalBandAxes({ g, xScale: x, yScale: y, innerW, innerH, theme, valueFormat, axisStyle });

  plot
    .selectAll("g.range-bar")
    .data(data)
    .join("g")
    .attr("class", "range-bar")
    .attr("transform", (d) => `translate(0,${y(d.type) ?? 0})`)
    .attr("cursor", onPointClick ? "pointer" : "default")
    .each(function (d) {
      const cell = d3.select(this);
      cell.selectAll("*").remove();
      const x0 = x(Math.min(d.low, d.high));
      const w = Math.max(0, Math.abs(x(d.high) - x(d.low)));
      paintHorizontalBar({ plot: cell, x: x0, y: 0, width: w, height: y.bandwidth(), color: rangeColor, rx: barRx });
      const front = cell.select<SVGRectElement>(".vs-hbar-front, rect").filter(function () {
        return d3.select(this).attr("class") !== "vs-hbar-side";
      });
      if (!front.empty()) applyCellBevel(front);
      cell.attr("opacity", 0.85);
    })
    .on("click", (_e, d) => onPointClick?.(d));

  if (showTooltip) {
    const tipHtml = (d: (typeof data)[number]) =>
      `<div style="font-weight:600;margin-bottom:2px">${d.type}</div>` +
      `<div>?? <strong>${formatChartValue(d.low, valueFormat)}</strong></div>` +
      `<div>?? <strong>${formatChartValue(d.high, valueFormat)}</strong></div>`;

    plot
      .selectAll<SVGGElement, (typeof data)[number]>("g.range-bar")
      .on("mouseenter", (event, d) => {
        applyDepthHoverLift(d3.select(event.currentTarget), -VCDS.depth.hoverLiftPx.standard);
        showSimpleTooltip(tooltip, container, event, tipHtml(d), width);
      })
      .on("mousemove", (event, d) => showSimpleTooltip(tooltip, container, event, tipHtml(d), width))
      .on("mouseleave", function () {
        d3.select(this).attr("transform", (d) => `translate(0,${y((d as (typeof data)[number]).type) ?? 0})`);
        hideTooltip(tooltip);
      });
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
      .text((d) => `${formatChartValue(d.low, valueFormat)} ? ${formatChartValue(d.high, valueFormat)}`);
  }

  return () => {
    hideTooltip(tooltip);
    container.replaceChildren();
  };
}
