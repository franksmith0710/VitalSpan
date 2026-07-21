import * as d3 from "d3";
import { applyRotatedCategoryLabels, pickCategoryTicks, styleAxis } from "@/components/charts/engine/d3/core/axes";
import { VCDS } from "@/components/charts/engine/d3/core/chartVisualTokens";
import { cartesianMargin } from "@/components/charts/engine/d3/core/margin";
import { writeIncrementalSession } from "@/components/charts/engine/d3/core/incrementalRender";
import { resolveDatumColor } from "@/components/charts/engine/d3/core/series";
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
    valueFormat,
    onPointClick,
    conditionalRules = [],
  } = config;

  const theme = themeFromConfig(rawTheme);
  const xCategories = [...new Set(data.map((d) => d.x))];
  const yCategories = [...new Set(data.map((d) => d.y))];
  const margin = cartesianMargin(false);
  const innerW = Math.max(0, width - margin.left - margin.right);
  const innerH = Math.max(0, height - margin.top - margin.bottom);

  const values = data.map((d) => d.value);
  const maxVal = d3.max(values) ?? 0;
  const minVal = d3.min(values) ?? 0;
  const baseColor = colors[0] ?? theme.accent;
  const colorScale = d3
    .scaleSequential(d3.interpolateRgb("#f2f4f7", baseColor))
    .domain(minVal === maxVal ? [0, maxVal || 1] : [minVal, maxVal]);

  const x = d3.scaleBand<string>().domain(xCategories).range([0, innerW]).padding(0.06);
  const y = d3.scaleBand<string>().domain(yCategories).range([0, innerH]).padding(0.06);
  const xTicks = pickCategoryTicks(xCategories, innerW);
  const rotateX = xTicks.length >= 6 && innerW / xTicks.length < 72 ? -32 : 0;

  const root = d3.select(container).append("svg").attr("width", width).attr("height", height).attr("role", "img");
  const g = root.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const tooltip = showTooltip ? createTooltipLayer(container, theme) : null;

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
    .call(d3.axisLeft(y))
    .call(styleAxis, theme);
  g.append("g")
    .attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x).tickValues(xTicks))
    .call(styleAxis, theme)
    .call((sel) => applyRotatedCategoryLabels(sel, rotateX));

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
    .on("mouseenter", function (_event, d) {
      d3.select(this).attr("stroke-width", 1.2).attr("stroke", theme.accent);
      cross.style("opacity", 1);
      colBand
        .attr("x", x(d.x) ?? 0)
        .attr("y", 0)
        .attr("width", x.bandwidth())
        .attr("height", innerH);
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
      d3.select(this).attr("stroke-width", 0.4).attr("stroke", theme.axisLine);
      cross.style("opacity", 0);
      hideTooltip(tooltip);
    })
    .on("click", (_event, d) => onPointClick?.(d));

  writeIncrementalSession(container, { plotType: "Heatmap", width, height });
  return () => container.replaceChildren();
}
