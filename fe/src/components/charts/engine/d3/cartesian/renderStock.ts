import * as d3 from "d3";
import { attachCartesianDataZoom } from "@/components/charts/engine/d3/core/dataZoom";
import { drawCartesianBandAxes } from "@/components/charts/engine/d3/core/sceneGraph";
import { cartesianMargin } from "@/components/charts/engine/d3/core/margin";
import { attachCrosshairHover, createCrosshair } from "@/components/charts/engine/d3/core/crosshair";
import { VCDS } from "@/components/charts/engine/d3/core/chartVisualTokens";
import { resolveLabelFill } from "@/components/charts/engine/d3/core/presentation";
import { staggerEnterSelection } from "@/components/charts/engine/d3/core/motionEngine";
import { resolveEffectiveDepth, shadeColor } from "@/components/charts/engine/d3/core/depthEngine";
import {
  createTooltipLayer,
  hideTooltip,
  showSimpleTooltip,
} from "@/components/charts/engine/d3/core/tooltipLayer";
import type { D3StockDatum, D3StockRenderConfig } from "@/components/charts/engine/d3/types";
import { formatChartValue } from "@/lib/chartValueFormat";

export function renderD3StockChart(container: HTMLElement, config: D3StockRenderConfig): () => void {
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
    labelFontSize,
    labelColor,
    valueFormat,
    onPointClick,
    axisStyle,
    dataZoom = false,
    tooltipPresentation,
  } = config;

  const categories = data.map((d) => d.type);
  const yMin = d3.min(data, (d) => d.low) ?? 0;
  const yMax = d3.max(data, (d) => d.high) ?? 0;
  const margin = cartesianMargin(false);
  const innerW = Math.max(0, width - margin.left - margin.right);
  const innerH = Math.max(0, height - margin.top - margin.bottom);
  const upColor = colors[0] ?? "#12b76a";
  const downColor = colors[1] ?? "#f04438";

  const x = d3.scaleBand<string>().domain(categories).range([0, innerW]).padding(0.3);
  const y = d3.scaleLinear().domain([yMin, yMax]).nice().range([innerH, 0]);
  const bodyW = Math.max(4, x.bandwidth() * 0.6);
  const depthOn = resolveEffectiveDepth() !== "off";

  const root = d3.select(container).append("svg").attr("width", width).attr("height", height).attr("role", "img");
  const g = root.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const plot = g.append("g");
  const tooltip = showTooltip ? createTooltipLayer(container, theme, tooltipPresentation) : null;
  const crosshair = createCrosshair({ plot, innerW, innerH, theme });

  drawCartesianBandAxes({ g, xScale: x, yScale: y, categories, innerW, innerH, theme, valueFormat, axisStyle });

  for (const d of data) {
    const cx = (x(d.type) ?? 0) + x.bandwidth() / 2;
    const up = d.close >= d.open;
    const color = up ? upColor : downColor;
    const bodyTop = y(Math.max(d.open, d.close));
    const bodyBottom = y(Math.min(d.open, d.close));
    const bodyH = Math.max(1, bodyBottom - bodyTop);

    plot
      .append("line")
      .attr("class", "wick")
      .attr("data-category", d.type)
      .attr("x1", cx)
      .attr("x2", cx)
      .attr("y1", y(d.high))
      .attr("y2", y(d.low))
      .attr("stroke", color)
      .attr("stroke-width", 1.5);

    const candle = plot
      .append("rect")
      .attr("class", "candle")
      .attr("data-category", d.type)
      .attr("x", cx - bodyW / 2)
      .attr("y", bodyTop)
      .attr("width", bodyW)
      .attr("height", bodyH)
      .attr("fill", color)
      .attr("cursor", onPointClick ? "pointer" : "default")
      .datum(d)
      .on("click", () => onPointClick?.(d));

    if (depthOn) {
      candle
        .attr("stroke", shadeColor(color, "top"))
        .attr("stroke-width", 1)
        .style("paint-order", "stroke fill");
    }

    if (showLabel) {
      plot
        .append("text")
        .attr("x", cx)
        .attr("y", y(d.close) - 6)
        .attr("text-anchor", "middle")
        .attr("fill", resolveLabelFill(theme, labelColor))
        .style("font-size", `${labelFontSize}px`)
        .style("pointer-events", "none")
        .text(formatChartValue(d.close, valueFormat));
    }
  }

  staggerEnterSelection(plot.selectAll<SVGRectElement, D3StockDatum>("rect.candle"));

  const xPoint = d3.scalePoint<string>().domain(categories).range(
    categories.map((cat) => (x(cat) ?? 0) + x.bandwidth() / 2),
  );

  if (showTooltip) {
    attachCrosshairHover({
      plot,
      innerW,
      innerH,
      categories,
      xScale: xPoint,
      crosshair,
      onCategory: (category, _mx, _my, event) => {
        const d = data.find((row) => row.type === category);
        if (!d) return;
        const up = d.close >= d.open;
        const color = up ? upColor : downColor;
        const cx = xPoint(category) ?? 0;
        crosshair.show(cx, y(d.close), color);
        showSimpleTooltip(
          tooltip,
          container,
          event,
          `<div style="font-weight:600;margin-bottom:2px">${d.type}</div>` +
            `<div>? <strong>${formatChartValue(d.open, valueFormat)}</strong> ù ? <strong>${formatChartValue(d.close, valueFormat)}</strong></div>` +
            `<div>? <strong>${formatChartValue(d.low, valueFormat)}</strong> ù ? <strong>${formatChartValue(d.high, valueFormat)}</strong></div>`,
          width,
        );
      },
      onLeave: () => hideTooltip(tooltip),
    });
  }

  const detachZoom = dataZoom ? attachCartesianDataZoom(root, plot, innerW, innerH, { theme }) : () => undefined;

  return () => {
    detachZoom();
    hideTooltip(tooltip);
    container.replaceChildren();
  };
}
