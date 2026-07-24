import * as d3 from "d3";
import { appendChartSvg } from "@/components/charts/engine/d3/core/sceneGraph";
import { planCategoryAxisLayout, resolveHorizontalCategoryAxisLayout, applyRotatedCategoryLabels, formatAxisCategoryLabel, formatHorizontalBandAxisLabel, resolveBandAxisFontSize, styleAxis } from "@/components/charts/engine/d3/core/axes";
import { VCDS } from "@/components/charts/engine/d3/core/chartVisualTokens";
import { applyCellBevel, applyDepthHoverLift, resolveEffectiveDepth } from "@/components/charts/engine/d3/core/depthEngine";
import { cartesianMargin } from "@/components/charts/engine/d3/core/margin";
import { writeIncrementalSession } from "@/components/charts/engine/d3/core/incrementalRender";
import { resolveDatumColor } from "@/components/charts/engine/d3/core/series";
import { resolveLabelFill } from "@/components/charts/engine/d3/core/presentation";
import { themeFromConfig } from "@/components/charts/engine/d3/core/themeEngine";
import { createTooltipLayer, hideTooltip, showMergedTooltip } from "@/components/charts/engine/d3/core/tooltipLayer";
import type { D3MatrixRenderConfig } from "@/components/charts/engine/d3/types";
import { formatChartValue } from "@/lib/chartValueFormat";

const CELL_RX = VCDS.bar.rx;

export function renderD3HeatmapChart(container: HTMLElement, config: D3MatrixRenderConfig): () => void {
  container.replaceChildren();
  if (config.width <= 0 || config.height <= 0 || config.data.length === 0) return () => undefined;

  const {
    width,
    height,
    data,
    colors,
    theme: rawTheme,
    showTooltip,
    tooltipPresentation,
    valueFormat,
    onPointClick,
    conditionalRules = [],
    depthVisual,
    showCellLabel = false,
    showVisualMap = true,
  } = config;

  const theme = themeFromConfig(rawTheme);
  const depthLevel = resolveEffectiveDepth(depthVisual);
  const xCategories = [...new Set(data.map((d) => d.x))];
  const yCategories = [...new Set(data.map((d) => d.y))];
  const baseMargin = cartesianMargin(false);
  const provisionalInnerH = Math.max(0, height - baseMargin.top - baseMargin.bottom);
  const ySideLayout = resolveHorizontalCategoryAxisLayout(yCategories, provisionalInnerH);
  let margin = cartesianMargin(false, { left: Math.max(baseMargin.left, ySideLayout.leftMargin) });
  const innerW = Math.max(0, width - margin.left - margin.right);
  const xLayout = planCategoryAxisLayout(xCategories, innerW);
  margin = { ...margin, bottom: margin.bottom + xLayout.extraBottom };
  const plotInnerH = Math.max(0, height - margin.top - margin.bottom);

  const values = data.map((d) => d.value);
  const maxVal = d3.max(values) ?? 0;
  const minVal = d3.min(values) ?? 0;
  const baseColor = colors[0] ?? theme.accent;
  const colorScale = d3
    .scaleSequential(d3.interpolateRgb("#f2f4f7", baseColor))
    .domain(minVal === maxVal ? [0, maxVal || 1] : [minVal, maxVal]);

  const x = d3.scaleBand<string>().domain(xCategories).range([0, innerW]).padding(0.06);
  const y = d3.scaleBand<string>().domain(yCategories).range([0, plotInnerH]).padding(0.06);

  const root = appendChartSvg(container, width, height);
  const g = root.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const tooltip = showTooltip ? createTooltipLayer(container, theme, tooltipPresentation) : null;

  const cross = g.append("g").attr("class", "vs-heatmap-cross").style("pointer-events", "none").style("opacity", 0);
  const colBand = cross
    .append("rect")
    .attr("fill", theme.crosshair)
    .attr("opacity", 0.08);
  const rowBand = cross
    .append("rect")
    .attr("fill", theme.crosshair)
    .attr("opacity", 0.08);
  const colLabel = cross
    .append("text")
    .attr("fill", theme.axisLabel)
    .attr("font-size", `${VCDS.axis.fontSize}px`)
    .attr("font-weight", 600);
  const rowLabel = cross
    .append("text")
    .attr("fill", theme.axisLabel)
    .attr("font-size", `${VCDS.axis.fontSize}px`)
    .attr("font-weight", 600);

  g.append("g")
    .call(d3.axisLeft(y).tickValues(ySideLayout.ticks))
    .call(styleAxis, theme, resolveBandAxisFontSize(ySideLayout.bandHeight))
    .selectAll<SVGTextElement, string>("text")
    .text((d) => formatHorizontalBandAxisLabel(String(d)));
  g.append("g")
    .attr("transform", `translate(0,${plotInnerH})`)
    .call(d3.axisBottom(x).tickValues(xLayout.ticks))
    .call(styleAxis, theme)
    .selectAll<SVGTextElement, string>("text")
    .text((d) => formatAxisCategoryLabel(String(d), xLayout.slotSpan, xLayout.rotateDeg))
    .call((sel) => applyRotatedCategoryLabels(sel, xLayout.rotateDeg));

  g.selectAll("rect.cell")
    .data(data)
    .join("rect")
    .attr("class", "cell")
    .attr("x", (d) => x(d.x) ?? 0)
    .attr("y", (d) => y(d.y) ?? 0)
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("rx", CELL_RX)
    .attr("fill", (d) => {
      const tinted = resolveDatumColor(d.value, baseColor, conditionalRules);
      return conditionalRules.length > 0 ? tinted : colorScale(d.value);
    })
    .attr("stroke", theme.axisLine)
    .attr("stroke-width", 0.4)
    .attr("cursor", onPointClick ? "pointer" : "default")
    .each(function () {
      applyCellBevel(d3.select(this), depthLevel);
    })
    .on("mouseenter", function (_event, d) {
      const cell = d3.select(this);
      applyDepthHoverLift(cell);
      cell.attr("stroke-width", 1.2).attr("stroke", theme.accent);
      cross.style("opacity", 1);
      colBand
        .attr("x", x(d.x) ?? 0)
        .attr("y", 0)
        .attr("width", x.bandwidth())
        .attr("height", plotInnerH);
      rowBand
        .attr("x", 0)
        .attr("y", y(d.y) ?? 0)
        .attr("width", innerW)
        .attr("height", y.bandwidth());
      colLabel.attr("x", (x(d.x) ?? 0) + x.bandwidth() / 2).attr("y", -6).attr("text-anchor", "middle").text(d.x);
      rowLabel.attr("x", -8).attr("y", (y(d.y) ?? 0) + y.bandwidth() / 2).attr("text-anchor", "end").attr("dominant-baseline", "middle").text(d.y);
      if (!tooltip) return;
      showMergedTooltip(
        tooltip,
        container,
        _event,
        `${d.x} · ${d.y}`,
        [{ name: "值", color: baseColor, value: d.value }],
        valueFormat,
        width,
      );
    })
    .on("mousemove", (event, d) => {
      if (!tooltip) return;
      showMergedTooltip(
        tooltip,
        container,
        event,
        `${d.x} · ${d.y}`,
        [{ name: "值", color: baseColor, value: d.value }],
        valueFormat,
        width,
      );
    })
    .on("mouseleave", function () {
      d3.select(this).attr("stroke-width", 0.4).attr("stroke", theme.axisLine).attr("transform", null);
      cross.style("opacity", 0);
      hideTooltip(tooltip);
    })
    .on("click", (_event, d) => onPointClick?.(d));

  if (showCellLabel) {
    g.selectAll("text.cell-label")
      .data(data)
      .join("text")
      .attr("class", "cell-label")
      .attr("x", (d) => (x(d.x) ?? 0) + x.bandwidth() / 2)
      .attr("y", (d) => (y(d.y) ?? 0) + y.bandwidth() / 2)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", resolveLabelFill(theme))
      .style("font-size", "10px")
      .style("pointer-events", "none")
      .text((d) => formatChartValue(d.value, valueFormat));
  }

  if (showVisualMap) {
    const legendW = 10;
    const legendH = Math.min(plotInnerH, 120);
    const legendX = innerW + 12;
    const legendG = g.append("g").attr("transform", `translate(${legendX},0)`);
    const defs = root.append("defs");
    const gradId = `d3-heatmap-legend-${Math.random().toString(36).slice(2, 9)}`;
    const grad = defs.append("linearGradient").attr("id", gradId).attr("x1", "0%").attr("y1", "100%").attr("x2", "0%").attr("y2", "0%");
    for (let i = 0; i <= 10; i += 1) {
      const t = i / 10;
      grad
        .append("stop")
        .attr("offset", `${t * 100}%`)
        .attr("stop-color", colorScale(minVal + t * (maxVal - minVal || 1)));
    }
    legendG.append("rect").attr("width", legendW).attr("height", legendH).attr("rx", 2).attr("fill", `url(#${gradId})`);
    legendG
      .append("text")
      .attr("x", legendW + 4)
      .attr("y", legendH)
      .attr("fill", theme.axisLabel)
      .style("font-size", "9px")
      .text(formatChartValue(maxVal, valueFormat));
    legendG
      .append("text")
      .attr("x", legendW + 4)
      .attr("y", 8)
      .attr("fill", theme.axisLabel)
      .style("font-size", "9px")
      .text(formatChartValue(minVal, valueFormat));
  }

  writeIncrementalSession(container, { plotType: "Heatmap", width, height });
  return () => container.replaceChildren();
}
