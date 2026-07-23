import * as d3 from "d3";
import { VCDS } from "@/components/charts/engine/d3/core/chartVisualTokens";
import { resolveHorizontalCategoryAxisLayout } from "@/components/charts/engine/d3/core/axes";
import { drawCartesianHorizontalBandAxes } from "@/components/charts/engine/d3/core/sceneGraph";
import { paintHorizontalBar } from "@/components/charts/engine/d3/core/depthEngine";
import { cartesianMargin } from "@/components/charts/engine/d3/core/margin";
import {
  createTooltipLayer,
  hideTooltip,
  showSimpleTooltip,
} from "@/components/charts/engine/d3/core/tooltipLayer";
import type { D3ProgressBarRenderConfig } from "@/components/charts/engine/d3/types";
import { resolveBarBandPadding } from "@/lib/applyChartDeStyleBlocks";
import { formatChartValue } from "@/lib/chartValueFormat";

const BAR_RX = 6;

export function renderD3ProgressBarChart(
  container: HTMLElement,
  config: D3ProgressBarRenderConfig,
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
    valueFormat,
    onPointClick,
    barWidthRatio,
    barRadius,
    axisStyle,
    showTargetLine = true,
    tooltipPresentation,
  } = config;

  const barRx = barRadius ?? BAR_RX;
  const categories = data.map((d) => d.type);
  const baseMargin = cartesianMargin(false);
  const provisionalInnerH = Math.max(0, height - baseMargin.top - baseMargin.bottom);
  const yLayout = resolveHorizontalCategoryAxisLayout(categories, provisionalInnerH);
  const margin = { ...baseMargin, left: Math.max(baseMargin.left, yLayout.leftMargin) };
  const innerW = Math.max(0, width - margin.left - margin.right);
  const innerH = Math.max(0, height - margin.top - margin.bottom);
  const fillColor = colors[0] ?? "#465fff";
  const trackColor = theme.gridLine;

  const y = d3.scaleBand<string>().domain(categories).range([0, innerH]).padding(resolveBarBandPadding(barWidthRatio));
  const x = d3.scaleLinear().domain([0, 1]).range([0, innerW]);

  const root = d3.select(container).append("svg").attr("width", width).attr("height", height).attr("role", "img");
  const g = root.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const plot = g.append("g");
  const tooltip = showTooltip ? createTooltipLayer(container, theme, tooltipPresentation) : null;

  drawCartesianHorizontalBandAxes({
    g,
    xScale: x,
    yScale: y,
    innerW,
    innerH,
    theme,
    valueFormat,
    axisStyle,
    xTickFormat: (d) => `${Math.round(Number(d) * 100)}%`,
  });

  plot
    .selectAll("rect.track")
    .data(data)
    .join("rect")
    .attr("class", "track")
    .attr("x", 0)
    .attr("y", (d) => y(d.type) ?? 0)
    .attr("width", innerW)
    .attr("height", y.bandwidth())
    .attr("rx", barRx)
    .attr("fill", trackColor)
    .attr("opacity", 0.35);

  plot
    .selectAll("g.progress")
    .data(data)
    .join("g")
    .attr("class", "progress")
    .attr("transform", (d) => `translate(0,${y(d.type) ?? 0})`)
    .attr("cursor", onPointClick ? "pointer" : "default")
    .each(function (d) {
      const cell = d3.select(this);
      cell.selectAll("*").remove();
      const ratio = d.max > 0 ? d.value / d.max : 0;
      const w = x(Math.min(1, Math.max(0, ratio)));
      paintHorizontalBar({ plot: cell, x: 0, y: 0, width: w, height: y.bandwidth(), color: fillColor, rx: barRx });
    })
    .on("click", (_e, d) => onPointClick?.(d));

  if (showTargetLine) {
    plot
      .selectAll("line.progress-target")
      .data(data.filter((d) => d.max > 0))
      .join("line")
      .attr("class", "progress-target")
      .attr("x1", (d) => x(d.value / d.max))
      .attr("x2", (d) => x(d.value / d.max))
      .attr("y1", (d) => y(d.type) ?? 0)
      .attr("y2", (d) => (y(d.type) ?? 0) + y.bandwidth())
      .attr("stroke", theme.axisLabel)
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", VCDS.grid.dash);
  }

  if (showTooltip) {
    const tipHtml = (d: (typeof data)[number]) => {
      const pct = d.max > 0 ? (d.value / d.max) * 100 : 0;
      return (
        `<div style="font-weight:600;margin-bottom:2px">${d.type}</div>` +
        `<div>?? <strong>${pct.toFixed(1)}%</strong></div>` +
        `<div>?? <strong>${formatChartValue(d.value, valueFormat)}</strong> / ${formatChartValue(d.max, valueFormat)}</div>`
      );
    };

    plot
      .selectAll<SVGGElement, (typeof data)[number]>("g.progress")
      .on("mouseenter", (event, d) => showSimpleTooltip(tooltip, container, event, tipHtml(d), width))
      .on("mousemove", (event, d) => showSimpleTooltip(tooltip, container, event, tipHtml(d), width))
      .on("mouseleave", () => hideTooltip(tooltip));
  }

  if (showLabel) {
    plot
      .selectAll("text.progress-label")
      .data(data)
      .join("text")
      .attr("class", "progress-label")
      .attr("x", (d) => x(d.max > 0 ? d.value / d.max : 0) + 6)
      .attr("y", (d) => (y(d.type) ?? 0) + y.bandwidth() / 2)
      .attr("dy", "0.32em")
      .attr("fill", theme.axisLabel)
      .style("font-size", `${labelFontSize}px`)
      .text((d) => {
        const pct = d.max > 0 ? (d.value / d.max) * 100 : 0;
        return `${pct.toFixed(0)}%`;
      });
  }

  return () => {
    hideTooltip(tooltip);
    container.replaceChildren();
  };
}
