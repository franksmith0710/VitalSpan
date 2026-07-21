import * as d3 from "d3";
import { animateBarHeight } from "@/components/charts/engine/d3/core/animate";
import { VCDS } from "@/components/charts/engine/d3/core/chartVisualTokens";
import { createCrosshair } from "@/components/charts/engine/d3/core/crosshair";
import { attachCartesianDataZoom } from "@/components/charts/engine/d3/core/dataZoom";
import { writeIncrementalSession } from "@/components/charts/engine/d3/core/incrementalRender";
import {
  buildCartesianScene,
  drawCartesianBandAxes,
  drawHorizontalGrid,
} from "@/components/charts/engine/d3/core/sceneGraph";
import { groupSeries, normalizeCartesianData, resolveDatumColor, resolveSeriesKeys, seriesDataKey } from "@/components/charts/engine/d3/core/series";
import { themeFromConfig } from "@/components/charts/engine/d3/core/themeEngine";
import { createTooltipLayer } from "@/components/charts/engine/d3/core/tooltipLayer";
import { attachBandCategoryInteraction } from "@/components/charts/engine/d3/cartesian/renderCartesianBase";
import { renderD3HorizontalBarChart } from "@/components/charts/engine/d3/cartesian/renderBarHorizontal";
import type { D3CartesianRenderConfig } from "@/components/charts/engine/d3/types";
import { formatChartValue } from "@/lib/chartValueFormat";

const BAR_RX = VCDS.bar.rx;
const STACK_GAP = VCDS.bar.stackGap;

type WideRow = Record<string, string | number>;

export function renderD3BarChart(container: HTMLElement, config: D3CartesianRenderConfig): () => void {
  if (config.isHorizontal) return renderD3HorizontalBarChart(container, config);

  const incremental = container.dataset.vsIncremental === "true";
  if (!incremental) container.replaceChildren();
  if (config.width <= 0 || config.height <= 0 || config.data.length === 0) return () => undefined;

  const {
    width,
    height,
    data,
    xField,
    yField,
    seriesField,
    isStack = false,
    isGroup = false,
    isPercent = false,
    colors,
    theme: rawTheme,
    showLabel,
    showTooltip,
    showLegend,
    labelFontSize,
    valueFormat,
    markLines = [],
    conditionalRules = [],
    onPointClick,
    dataZoom = false,
  } = config;

  const theme = themeFromConfig(rawTheme);
  const normalized = normalizeCartesianData(data, xField, yField, seriesField);
  const categories = [...new Set(normalized.map((d) => String(d.__category__ ?? "")))];
  const seriesGroups = groupSeries(normalized, seriesField);
  const seriesNames = seriesGroups.map((s) => s.name);
  const hasMultiSeries = seriesNames.length > 1 && Boolean(seriesField);
  const useGrouped = hasMultiSeries && (isGroup || !isStack);

  const scene = buildCartesianScene({
    container,
    width,
    height,
    showLegend: Boolean(showLegend && hasMultiSeries),
    incremental,
  });
  const { root, g, plot, innerW, innerH, margin } = scene;
  const colorScale = d3.scaleOrdinal<string>().domain(seriesNames).range(colors);
  const keys = resolveSeriesKeys(seriesNames);

  const wideRows: WideRow[] = categories.map((cat) => {
    const row: WideRow = { __category__: cat };
    for (const s of seriesGroups) {
      const pt = s.points.find((p) => String(p.__category__) === cat);
      row[seriesDataKey(s.name)] = Number(pt?.__value__ ?? 0);
    }
    if (isPercent) {
      const sum = keys.reduce((acc, name) => acc + Number(row[name] ?? 0), 0);
      if (sum > 0) for (const name of keys) row[name] = Number(row[name] ?? 0) / sum;
    }
    return row;
  });

  const maxVal =
    isStack || isPercent
      ? (d3.max(wideRows, (row) => keys.reduce((sum, k) => sum + Number(row[k] ?? 0), 0)) ?? 0)
      : (d3.max(normalized, (d) => Number(d.__value__)) ?? 0);

  const x = d3.scaleBand<string>().domain(categories).range([0, innerW]).padding(0.22);
  const y = d3.scaleLinear().domain([0, maxVal]).nice().range([innerH, 0]);
  const xSub = useGrouped ? d3.scaleBand<string>().domain(keys).range([0, x.bandwidth()]).padding(0.12) : null;

  drawHorizontalGrid(plot, { yScale: y, innerW, theme });
  drawCartesianBandAxes({ g, xScale: x, yScale: y, categories, innerW, innerH, theme, valueFormat });

  plot.selectAll("*").remove();

  if (isStack) {
    const stack = d3.stack<WideRow>().keys(keys);
    for (const layer of stack(wideRows)) {
      const name = String(layer.key);
      const color = colorScale(name) ?? colors[0] ?? theme.accent;
      plot
        .selectAll(`rect.${name}`)
        .data(layer)
        .join("rect")
        .attr("x", (d) => x(String(d.data.__category__)) ?? 0)
        .attr("width", x.bandwidth())
        .attr("rx", BAR_RX)
        .attr("fill", (d) => resolveDatumColor(Number(d[1]) - Number(d[0]), color, conditionalRules))
        .attr("cursor", onPointClick ? "pointer" : "default")
        .each(function (d) {
          const y1 = y(Number(d[1]));
          const rawH = Math.max(0, y(Number(d[0])) - y1);
          const h = rawH > STACK_GAP ? rawH - STACK_GAP : rawH;
          animateBarHeight(d3.select(this), y1, h);
        })
        .on("click", (_e, d) =>
          onPointClick?.({
            __category__: d.data.__category__,
            __value__: Number(d[1]) - Number(d[0]),
            __series__: name,
          }),
        );
    }
  } else {
    for (const s of seriesGroups) {
      const name = s.name || "value";
      const color = colorScale(name) ?? colors[0] ?? theme.accent;
      plot
        .selectAll(`rect.bar-${name}`)
        .data(s.points)
        .join("rect")
        .attr("rx", BAR_RX)
        .attr("fill", (d) => resolveDatumColor(Number(d.__value__), color, conditionalRules))
        .attr("cursor", onPointClick ? "pointer" : "default")
        .attr("x", (d) => {
          const base = x(String(d.__category__)) ?? 0;
          return useGrouped && xSub ? base + (xSub(name) ?? 0) : base;
        })
        .attr("width", useGrouped && xSub ? xSub.bandwidth() : x.bandwidth())
        .each(function (d) {
          const y1 = y(Number(d.__value__));
          animateBarHeight(d3.select(this), y1, innerH - y1);
        })
        .on("click", (_e, d) => onPointClick?.(d));
    }
  }

  for (const line of markLines.filter((m) => m.enabled && Number.isFinite(m.value))) {
    const ly = y(line.value);
    plot
      .append("line")
      .attr("x1", 0)
      .attr("x2", innerW)
      .attr("y1", ly)
      .attr("y2", ly)
      .attr("stroke", line.color ?? theme.accent)
      .attr("stroke-dasharray", line.lineStyle === "solid" ? undefined : "5 4");
  }

  const tooltip = showTooltip ? createTooltipLayer(container, theme) : null;
  const crosshair = createCrosshair({ plot, innerW, innerH, theme });
  if (showTooltip) {
    attachBandCategoryInteraction({
      container,
      plot,
      innerW,
      innerH,
      width,
      categories,
      xScale: x,
      crosshair,
      tooltip,
      valueFormat,
      buildRows: (cat) =>
        seriesGroups.map((s) => {
          const pt = s.points.find((p) => String(p.__category__) === cat);
          return {
            name: s.name,
            color: colorScale(s.name) ?? colors[0] ?? theme.accent,
            value: pt?.__value__ ?? 0,
          };
        }),
    });
  }

  if (showLabel) {
    plot
      .selectAll("text.bar-label")
      .data(normalized)
      .join("text")
      .attr("class", "bar-label")
      .attr("x", (d) => (x(String(d.__category__)) ?? 0) + x.bandwidth() / 2)
      .attr("y", (d) => y(Number(d.__value__)) - 4)
      .attr("text-anchor", "middle")
      .attr("fill", theme.axisLabel)
      .style("font-size", `${labelFontSize}px`)
      .text((d) => formatChartValue(d.__value__, valueFormat));
  }

  if (showLegend && hasMultiSeries) {
    root.selectAll("g.vs-legend").remove();
    const legend = root.append("g").attr("class", "vs-legend").attr("transform", `translate(${margin.left},10)`);
    let offsetX = 0;
    for (const name of seriesNames) {
      const color = colorScale(name) ?? colors[0] ?? theme.accent;
      const label = name || "系列";
      const item = legend.append("g").attr("transform", `translate(${offsetX},0)`);
      item.append("rect").attr("width", 10).attr("height", 10).attr("y", 1).attr("rx", 2).attr("fill", color);
      item.append("text").attr("x", 14).attr("y", 10).attr("fill", theme.legendText).style("font-size", "11px").text(label);
      offsetX += label.length * 7 + 32;
    }
  }

  writeIncrementalSession(container, { plotType: "Column", width, height });
  const detachZoom = dataZoom ? attachCartesianDataZoom(root, plot, innerW, innerH) : () => undefined;

  return () => {
    detachZoom();
    container.replaceChildren();
  };
}
