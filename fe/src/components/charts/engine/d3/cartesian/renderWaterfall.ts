import * as d3 from "d3";
import { VCDS } from "@/components/charts/engine/d3/core/chartVisualTokens";
import { drawCartesianBandAxes } from "@/components/charts/engine/d3/core/sceneGraph";
import { paintVerticalBar } from "@/components/charts/engine/d3/core/depthEngine";
import { cartesianMargin } from "@/components/charts/engine/d3/core/margin";
import { renderConfiguredInlineLegend } from "@/components/charts/engine/d3/core/d3Legend";
import { wirePlotSeriesLegendDimming } from "@/components/charts/engine/d3/core/legendInteraction";
import { resolveLabelFill } from "@/components/charts/engine/d3/core/presentation";
import {
  createTooltipLayer,
  hideTooltip,
  showSimpleTooltip,
} from "@/components/charts/engine/d3/core/tooltipLayer";
import type { D3WaterfallDatum, D3WaterfallRenderConfig } from "@/components/charts/engine/d3/types";
import { formatChartValue } from "@/lib/chartValueFormat";
import { resolveBarBandPadding } from "@/lib/applyChartDeStyleBlocks";

const BAR_RX = VCDS.bar.rx;
const POS_KEY = "增加";
const NEG_KEY = "减少";

type WaterfallSegment = D3WaterfallDatum & { start: number; end: number; runningTotal: number };

function buildSegments(data: D3WaterfallDatum[]): WaterfallSegment[] {
  let running = 0;
  return data.map((d) => {
    const start = running;
    const end = running + d.value;
    running = end;
    return { ...d, start, end, runningTotal: end };
  });
}

export function renderD3WaterfallChart(container: HTMLElement, config: D3WaterfallRenderConfig): () => void {
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
    tooltipPresentation,
  } = config;

  const barRx = barRadius ?? BAR_RX;

  const segments = buildSegments(data);
  const categories = segments.map((d) => d.type);
  const yMin = Math.min(0, d3.min(segments, (d) => Math.min(d.start, d.end)) ?? 0);
  const yMax = d3.max(segments, (d) => Math.max(d.start, d.end)) ?? 0;
  const margin = cartesianMargin(false);
  const innerW = Math.max(0, width - margin.left - margin.right);
  const innerH = Math.max(0, height - margin.top - margin.bottom);

  const x = d3.scaleBand<string>().domain(categories).range([0, innerW]).padding(resolveBarBandPadding(barWidthRatio));
  const y = d3.scaleLinear().domain([yMin, yMax]).nice().range([innerH, 0]);
  const posColor = colors[0] ?? "#465fff";
  const negColor = colors[1] ?? "#f04438";

  const root = d3.select(container).append("svg").attr("width", width).attr("height", height).attr("role", "img");
  const g = root.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const plot = g.append("g");
  const tooltip = showTooltip ? createTooltipLayer(container, theme, tooltipPresentation) : null;

  drawCartesianBandAxes({ g, xScale: x, yScale: y, categories, innerW, innerH, theme, valueFormat, axisStyle });

  if (yMin < 0 && yMax > 0) {
    plot
      .append("line")
      .attr("x1", 0)
      .attr("x2", innerW)
      .attr("y1", y(0))
      .attr("y2", y(0))
      .attr("stroke", theme.gridLine)
      .attr("stroke-dasharray", VCDS.grid.dash);
  }

  plot
    .selectAll("g.waterfall")
    .data(segments)
    .join("g")
    .attr("class", "waterfall")
    .attr("data-series-key", (d) => (d.value >= 0 ? POS_KEY : NEG_KEY))
    .attr("transform", (d) => `translate(${x(d.type) ?? 0},0)`)
    .attr("cursor", onPointClick ? "pointer" : "default")
    .each(function (d) {
      const cell = d3.select(this);
      cell.selectAll("*").remove();
      const yTop = y(Math.max(d.start, d.end));
      const yBottom = y(Math.min(d.start, d.end));
      const h = Math.max(0, yBottom - yTop);
      paintVerticalBar({
        plot: cell,
        x: 0,
        y1: yTop,
        height: h,
        width: x.bandwidth(),
        color: d.value >= 0 ? posColor : negColor,
        rx: barRx,
      });
    })
    .on("click", (_event, d) => onPointClick?.(d));

  for (let i = 1; i < segments.length; i += 1) {
    const prev = segments[i - 1];
    const cur = segments[i];
    const x0 = (x(prev.type) ?? 0) + x.bandwidth();
    const x1 = x(cur.type) ?? 0;
    const y0 = y(prev.end);
    plot
      .append("line")
      .attr("x1", x0)
      .attr("x2", x1)
      .attr("y1", y0)
      .attr("y2", y0)
      .attr("stroke", theme.gridLine)
      .attr("stroke-dasharray", "3 3");
  }

  if (showTooltip) {
    plot
      .selectAll<SVGGElement, WaterfallSegment>("g.waterfall")
      .on("mouseenter", (event, d) => {
        showSimpleTooltip(
          tooltip,
          container,
          event,
          `<div style="font-weight:600;margin-bottom:2px">${d.type}</div>` +
            `<div>增量 <strong>${formatChartValue(d.value, valueFormat)}</strong></div>` +
            `<div>累计 <strong>${formatChartValue(d.runningTotal, valueFormat)}</strong></div>`,
          width,
        );
      })
      .on("mousemove", (event, d) => {
        showSimpleTooltip(
          tooltip,
          container,
          event,
          `<div style="font-weight:600;margin-bottom:2px">${d.type}</div>` +
            `<div>增量 <strong>${formatChartValue(d.value, valueFormat)}</strong></div>` +
            `<div>累计 <strong>${formatChartValue(d.runningTotal, valueFormat)}</strong></div>`,
          width,
        );
      })
      .on("mouseleave", () => hideTooltip(tooltip));
  }

  if (showLabel) {
    plot
      .selectAll("text.wf-label")
      .data(segments)
      .join("text")
      .attr("class", "wf-label")
      .attr("x", (d) => (x(d.type) ?? 0) + x.bandwidth() / 2)
      .attr("y", (d) => y(Math.max(d.start, d.end)) - 4)
      .attr("text-anchor", "middle")
      .attr("fill", resolveLabelFill(theme, labelColor))
      .style("font-size", `${labelFontSize}px`)
      .text((d) => formatChartValue(d.value, valueFormat));
  }

  const detachLegend = renderConfiguredInlineLegend(
    root,
    showLegend,
    [
      { label: POS_KEY, seriesKey: POS_KEY, color: posColor },
      { label: NEG_KEY, seriesKey: NEG_KEY, color: negColor },
    ],
    { width, height, margin, theme, layout: legendLayout, fontSize: legendLayout?.fontSize },
  );

  const detachLegendDim = wirePlotSeriesLegendDimming(plot);

  return () => {
    detachLegend();
    detachLegendDim();
    hideTooltip(tooltip);
    container.replaceChildren();
  };
}
