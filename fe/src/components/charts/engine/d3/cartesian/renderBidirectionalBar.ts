import * as d3 from "d3";
import { VCDS } from "@/components/charts/engine/d3/core/chartVisualTokens";
import { resolveBarLabelFontSize, resolveHorizontalCategoryAxisLayout } from "@/components/charts/engine/d3/core/axes";
import { drawBidirectionalBandAxes } from "@/components/charts/engine/d3/core/sceneGraph";
import { paintHorizontalBar } from "@/components/charts/engine/d3/core/depthEngine";
import { cartesianMargin } from "@/components/charts/engine/d3/core/margin";
import { renderConfiguredInlineLegend } from "@/components/charts/engine/d3/core/d3Legend";
import { wirePlotSeriesLegendDimming } from "@/components/charts/engine/d3/core/legendInteraction";
import { staggerEnterSelection } from "@/components/charts/engine/d3/core/motionEngine";
import { resolveLabelFill } from "@/components/charts/engine/d3/core/presentation";
import {
  createTooltipLayer,
  hideTooltip,
  showSimpleTooltip,
} from "@/components/charts/engine/d3/core/tooltipLayer";
import type { D3BidirectionalBarRenderConfig } from "@/components/charts/engine/d3/types";
import { formatChartValue } from "@/lib/chartValueFormat";
import { resolveBarBandPadding } from "@/lib/applyChartDeStyleBlocks";

const BAR_RX = VCDS.bar.rx;
const LEFT_KEY = "left";
const RIGHT_KEY = "right";

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
    barWidthRatio,
    barRadius,
    axisStyle,
    leftLabel,
    rightLabel,
    tooltipPresentation,
  } = config;

  const barRx = barRadius ?? BAR_RX;
  const leftName = leftLabel ?? "左";
  const rightName = rightLabel ?? "右";

  const categories = data.map((d) => d.type);
  const maxLeft = d3.max(data, (d) => Math.abs(d.left)) ?? 0;
  const maxRight = d3.max(data, (d) => Math.abs(d.right)) ?? 0;
  const maxVal = Math.max(maxLeft, maxRight, 1);
  const baseMargin = cartesianMargin(false);
  const provisionalInnerH = Math.max(0, height - baseMargin.top - baseMargin.bottom);
  const yLayout = resolveHorizontalCategoryAxisLayout(categories, provisionalInnerH);
  const margin = { ...baseMargin, left: Math.max(72, yLayout.leftMargin), right: 72 };
  const innerW = Math.max(0, width - margin.left - margin.right);
  const innerH = Math.max(0, height - margin.top - margin.bottom);
  const centerX = innerW / 2;

  const y = d3.scaleBand<string>().domain(categories).range([0, innerH]).padding(resolveBarBandPadding(barWidthRatio));
  const xLeft = d3.scaleLinear().domain([0, maxVal]).range([centerX, 0]);
  const xRight = d3.scaleLinear().domain([0, maxVal]).range([centerX, innerW]);
  const leftColor = colors[0] ?? "#465fff";
  const rightColor = colors[1] ?? "#12b76a";

  const root = d3.select(container).append("svg").attr("width", width).attr("height", height).attr("role", "img");
  const g = root.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const plot = g.append("g");
  const tooltip = showTooltip ? createTooltipLayer(container, theme, tooltipPresentation) : null;

  drawBidirectionalBandAxes({
    g,
    yScale: y,
    xScale: xRight,
    innerW,
    innerH,
    theme,
    valueFormat,
    axisStyle,
  });

  plot
    .append("line")
    .attr("x1", centerX)
    .attr("x2", centerX)
    .attr("y1", 0)
    .attr("y2", innerH)
    .attr("stroke", theme.axisLine)
    .attr("stroke-width", 1);

  const leftBars = plot
    .selectAll("g.left-bar")
    .data(data)
    .join("g")
    .attr("class", "left-bar")
    .attr("data-series-key", LEFT_KEY)
    .attr("transform", (d) => `translate(0,${y(d.type) ?? 0})`)
    .attr("cursor", onPointClick ? "pointer" : "default")
    .each(function (d) {
      const cell = d3.select(this) as d3.Selection<SVGGElement, unknown, null, undefined>;
      cell.selectAll("*").remove();
      const x1 = xLeft(Math.abs(d.left));
      const w = centerX - x1;
      paintHorizontalBar({ plot: cell, x: x1, y: 0, width: w, height: y.bandwidth(), color: leftColor, rx: barRx });
    })
    .on("click", (_event, d) => onPointClick?.(d));

  const rightBars = plot
    .selectAll("g.right-bar")
    .data(data)
    .join("g")
    .attr("class", "right-bar")
    .attr("data-series-key", RIGHT_KEY)
    .attr("transform", (d) => `translate(0,${y(d.type) ?? 0})`)
    .attr("cursor", onPointClick ? "pointer" : "default")
    .each(function (d) {
      const cell = d3.select(this) as d3.Selection<SVGGElement, unknown, null, undefined>;
      cell.selectAll("*").remove();
      const w = xRight(Math.abs(d.right)) - centerX;
      paintHorizontalBar({ plot: cell, x: centerX, y: 0, width: w, height: y.bandwidth(), color: rightColor, rx: barRx });
    })
    .on("click", (_event, d) => onPointClick?.(d));

  staggerEnterSelection(leftBars);
  staggerEnterSelection(rightBars);

  if (showTooltip) {
    const bindTooltip = (sel: d3.Selection<SVGGElement, (typeof data)[0], SVGGElement, unknown>, side: "left" | "right") => {
      const label = side === "left" ? leftName : rightName;
      sel
        .on("mouseenter", (event, d) => {
          const value = side === "left" ? d.left : d.right;
          showSimpleTooltip(
            tooltip,
            container,
            event,
            `<div style="font-weight:600;margin-bottom:2px">${d.type}</div>` +
              `<div>${label} · <strong>${formatChartValue(value, valueFormat)}</strong></div>`,
            width,
          );
        })
        .on("mousemove", (event, d) => {
          const value = side === "left" ? d.left : d.right;
          showSimpleTooltip(
            tooltip,
            container,
            event,
            `<div style="font-weight:600;margin-bottom:2px">${d.type}</div>` +
              `<div>${label} · <strong>${formatChartValue(value, valueFormat)}</strong></div>`,
            width,
          );
        })
        .on("mouseleave", () => hideTooltip(tooltip));
    };
    bindTooltip(plot.selectAll<SVGGElement, (typeof data)[0]>("g.left-bar"), "left");
    bindTooltip(plot.selectAll<SVGGElement, (typeof data)[0]>("g.right-bar"), "right");
  }

  const detachLegend = renderConfiguredInlineLegend(
    root,
    showLegend,
    [
      { label: leftName, seriesKey: LEFT_KEY, color: leftColor },
      { label: rightName, seriesKey: RIGHT_KEY, color: rightColor },
    ],
    { width, height, margin, theme, layout: legendLayout, fontSize: legendLayout?.fontSize },
  );

  const detachLegendDim = wirePlotSeriesLegendDimming(plot);

  if (showLabel) {
    const barLabelFs = resolveBarLabelFontSize(y.bandwidth(), labelFontSize);
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
      .style("font-size", `${barLabelFs}px`)
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
      .style("font-size", `${barLabelFs}px`)
      .text((d) => formatChartValue(d.right, valueFormat));
  }

  return () => {
    detachLegend();
    detachLegendDim();
    hideTooltip(tooltip);
    container.replaceChildren();
  };
}
