import * as d3 from "d3";
import {
  animateStrokePath,
  buildAreaGenerator,
  buildLineGenerator,
  ensureGradientDef,
  groupSeries,
  normalizeCartesianData,
  resolveDatumColor,
} from "@/components/charts/engine/d3/d3LineVisual";
import { attachCartesianDataZoom } from "@/components/charts/engine/d3/core/dataZoom";
import { renderConfiguredInlineLegend } from "@/components/charts/engine/d3/core/d3Legend";
import { VCDS } from "@/components/charts/engine/d3/core/chartVisualTokens";
import { applyPathDepthShadow } from "@/components/charts/engine/d3/core/depthEngine";
import { attachCrosshairHover, createCrosshair } from "@/components/charts/engine/d3/core/crosshair";
import { wirePlotSeriesLegendDimming } from "@/components/charts/engine/d3/core/legendInteraction";
import { pulseSelection } from "@/components/charts/engine/d3/core/motionEngine";
import {
  buildCartesianScene,
  drawCartesianAxes,
  drawHorizontalGrid,
} from "@/components/charts/engine/d3/core/sceneGraph";
import { themeFromConfig } from "@/components/charts/engine/d3/core/themeEngine";
import {
  createTooltipLayer,
  hideTooltip,
  showMergedTooltip,
} from "@/components/charts/engine/d3/core/tooltipLayer";
import { writeIncrementalSession } from "@/components/charts/engine/d3/core/incrementalRender";
import { resolveLabelFill } from "@/components/charts/engine/d3/core/presentation";
import { highlightCategoryDots } from "@/components/charts/engine/d3/cartesian/renderCartesianBase";
import type { D3CartesianDatum, D3CartesianRenderConfig } from "@/components/charts/engine/d3/types";
import { formatChartValue } from "@/lib/chartValueFormat";
import { resolveCartesianPointSize } from "@/lib/applyChartDeStyleBlocks";

export type { D3CartesianDatum as D3LineDatum, D3CartesianRenderConfig as D3LineRenderConfig } from "@/components/charts/engine/d3/types";

export type D3LineRenderConfig = D3CartesianRenderConfig;

export function renderD3LineChart(container: HTMLElement, config: D3LineRenderConfig): () => void {
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
    smooth = false,
    isHorizontal = false,
    colors,
    theme: rawTheme,
    showLabel,
    showTooltip,
    showLegend,
    labelFontSize,
    valueFormat,
    markLines = [],
    conditionalRules = [],
    labelColor,
    seriesGradient = false,
    tooltipPresentation,
    onPointClick,
    dataZoom = false,
    legendLayout,
    pointSize,
    axisStyle,
    areaOpacity,
  } = config;

  const dotRadius = resolveCartesianPointSize(pointSize);
  const areaFillOpacity = areaOpacity ?? 0.12;

  const theme = themeFromConfig(rawTheme);
  const normalized = normalizeCartesianData(data, xField, yField, seriesField);
  const categories = [...new Set(normalized.map((d) => String(d.__category__ ?? "")))];
  const seriesGroups = groupSeries(normalized, seriesField);
  const colorScale = d3.scaleOrdinal<string>().domain(seriesGroups.map((s) => s.name)).range(colors);
  const singleSeries = seriesGroups.length === 1;

  if (isHorizontal) {
    return renderHorizontalLineFallback(container, config, normalized, categories, seriesGroups, colorScale);
  }

  const scene = buildCartesianScene({
    container,
    width,
    height,
    showLegend: Boolean(showLegend && seriesField),
    incremental,
    categories,
    axisStyle,
  });
  const { root, defs, g, plot, innerW, innerH } = scene;

  const maxVal = d3.max(normalized, (d) => Number(d.__value__)) ?? 0;
  const xScale = d3.scalePoint<string>().domain(categories).range([0, innerW]).padding(0.5);
  const yScale = d3.scaleLinear().domain([0, maxVal]).nice().range([innerH, 0]);

  drawHorizontalGrid(plot, { yScale, innerW, theme });
  drawCartesianAxes({ g, xScale, yScale, categories, innerW, innerH, theme, valueFormat, axisStyle });

  plot.selectAll("*").remove();

  const lineGen = buildLineGenerator(false, smooth, xScale, yScale);
  const areaGen = buildAreaGenerator(false, smooth, innerH, xScale, yScale);

  const markLineLayer = plot.append("g").attr("class", "mark-lines");
  for (const line of markLines.filter((m) => m.enabled && Number.isFinite(m.value))) {
    const y = yScale(line.value);
    markLineLayer
      .append("line")
      .attr("x1", 0)
      .attr("x2", innerW)
      .attr("y1", y)
      .attr("y2", y)
      .attr("stroke", line.color ?? theme.accent)
      .attr("stroke-opacity", 0.85)
      .attr("stroke-dasharray", line.lineStyle === "solid" ? undefined : "5 4");
  }

  const tooltip = showTooltip ? createTooltipLayer(container, theme, tooltipPresentation) : null;
  const crosshair = createCrosshair({ plot, innerW, innerH, theme });
  const dotLayers: d3.Selection<SVGCircleElement, D3CartesianDatum, SVGGElement, unknown>[] = [];

  seriesGroups.forEach((series, seriesIndex) => {
    const seriesKey = series.name || `series-${seriesIndex}`;
    const color = colorScale(series.name) ?? colors[0] ?? theme.accent;
    const gradId = ensureGradientDef(defs, `d3-line-grad-${seriesIndex}`, color, singleSeries ? 0.32 : 0.16, 0.01);
    const points = [...series.points].sort(
      (a, b) => categories.indexOf(String(a.__category__)) - categories.indexOf(String(b.__category__)),
    );

    plot
      .append("path")
      .datum(points)
      .attr("data-series-key", seriesKey)
      .attr("fill", seriesGradient ? `url(#${gradId})` : color)
      .attr("fill-opacity", seriesGradient ? 0.95 : areaFillOpacity)
      .attr("d", areaGen);

    const linePath = plot
      .append("path")
      .datum(points)
      .attr("data-series-key", seriesKey)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", VCDS.line.width)
      .attr("stroke-linecap", VCDS.line.cap)
      .attr("stroke-linejoin", VCDS.line.join)
      .attr("d", lineGen);
    applyPathDepthShadow(defs, linePath, color, `line-${seriesIndex}`);
    animateStrokePath(linePath);

    const dots = plot
      .selectAll<SVGCircleElement, D3CartesianDatum>(`circle.series-${seriesIndex}`)
      .data(points)
      .join("circle")
      .attr("class", `series-${seriesIndex}`)
      .attr("data-series-key", seriesKey)
      .attr("r", dotRadius)
      .attr("fill", (d) => resolveDatumColor(Number(d.__value__), color, conditionalRules))
      .attr("stroke", "#fff")
      .attr("stroke-width", VCDS.dot.strokeWidth)
      .attr("opacity", 0.92)
      .attr("cursor", onPointClick ? "pointer" : "default")
      .attr("cx", (d) => xScale(String(d.__category__)) ?? 0)
      .attr("cy", (d) => yScale(Number(d.__value__)));
    dotLayers.push(dots);
    if (onPointClick) dots.on("click", (_event, datum) => onPointClick(datum));

    if (showLabel) {
      plot
        .selectAll<SVGTextElement, D3CartesianDatum>(`text.label-${seriesIndex}`)
        .data(points)
        .join("text")
        .attr("x", (d) => xScale(String(d.__category__)) ?? 0)
        .attr("y", (d) => yScale(Number(d.__value__)) - 8)
        .attr("text-anchor", "middle")
        .attr("fill", resolveLabelFill(theme, labelColor))
        .style("font-size", `${labelFontSize}px`)
        .text((d) => formatChartValue(d.__value__, valueFormat));
    }
  });

  const primaryColor = colorScale(seriesGroups[0]?.name ?? "") ?? colors[0] ?? theme.accent;
  crosshair.dot.attr("fill", primaryColor);

  attachCrosshairHover({
    plot,
    innerW,
    innerH,
    categories,
    xScale,
    crosshair,
    onCategory: (category, _mx, my, event) => {
      const cx = xScale(category) ?? 0;
      const rows = seriesGroups.map((series) => {
        const point = series.points.find((p) => String(p.__category__) === category);
        const color = colorScale(series.name) ?? colors[0] ?? theme.accent;
        return { name: series.name, color, value: point?.__value__ ?? 0 };
      });
      const anchor = rows[0];
      const cy = anchor ? yScale(Number(anchor.value)) : my;
      crosshair.show(cx, cy, primaryColor);
      highlightCategoryDots(dotLayers, category);
      pulseSelection(crosshair.dot);
      showMergedTooltip(tooltip, container, event, category, rows, valueFormat, width);
    },
    onLeave: () => {
      highlightCategoryDots(dotLayers, null);
      hideTooltip(tooltip);
    },
  });

  const detachLegend =
    showLegend && seriesField
      ? renderConfiguredInlineLegend(
          root,
          true,
          seriesGroups.map((series) => ({
            label: series.name || "系列",
            seriesKey: series.name || "系列",
            color: colorScale(series.name) ?? colors[0] ?? theme.accent,
            marker: "line",
            markerWidth: 14,
            markerHeight: 3,
          })),
          {
            width,
            height,
            margin: scene.margin,
            theme,
            layout: legendLayout,
            fontSize: legendLayout?.fontSize,
          },
        )
      : () => undefined;

  const detachLegendDim = wirePlotSeriesLegendDimming(plot);

  writeIncrementalSession(container, { plotType: "Line", width, height });
  const detachZoom = dataZoom ? attachCartesianDataZoom(root, plot, innerW, innerH, { theme }) : () => undefined;

  return () => {
    detachZoom();
    detachLegend();
    detachLegendDim();
    if (!incremental) container.replaceChildren();
  };
}

function renderHorizontalLineFallback(
  container: HTMLElement,
  config: D3LineRenderConfig,
  normalized: D3CartesianDatum[],
  categories: string[],
  seriesGroups: ReturnType<typeof groupSeries>,
  colorScale: d3.ScaleOrdinal<string, string>,
): () => void {
  container.replaceChildren();
  const {
    width,
    height,
    colors,
    theme: rawTheme,
    smooth,
    showTooltip,
    valueFormat,
    onPointClick,
    tooltipPresentation,
    showLegend,
    seriesField,
    legendLayout,
  } = config;
  const theme = themeFromConfig(rawTheme);
  const scene = buildCartesianScene({
    container,
    width,
    height,
    showLegend: Boolean(showLegend && seriesField),
    categories,
  });
  const { root, plot, innerW, innerH } = scene;
  const maxVal = d3.max(normalized, (d) => Number(d.__value__)) ?? 0;
  const catScale = d3.scalePoint<string>().domain(categories).range([0, innerH]).padding(0.5);
  const valScale = d3.scaleLinear().domain([0, maxVal]).nice().range([0, innerW]);
  const lineGen = buildLineGenerator(true, smooth, catScale, valScale);
  const dotLayers: d3.Selection<SVGCircleElement, D3CartesianDatum, SVGGElement, unknown>[] = [];

  seriesGroups.forEach((series, i) => {
    const seriesKey = series.name || `series-${i}`;
    const color = colorScale(series.name) ?? colors[0] ?? theme.accent;
    const points = [...series.points].sort(
      (a, b) => categories.indexOf(String(a.__category__)) - categories.indexOf(String(b.__category__)),
    );
    const linePath = plot
      .append("path")
      .datum(points)
      .attr("data-series-key", seriesKey)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", VCDS.line.width)
      .attr("d", lineGen);
    applyPathDepthShadow(scene.defs, linePath, color, `hline-${i}`);
    animateStrokePath(linePath);

    const dots = plot
      .selectAll<SVGCircleElement, D3CartesianDatum>(`circle.hseries-${i}`)
      .data(points)
      .join("circle")
      .attr("class", `hseries-${i}`)
      .attr("data-series-key", seriesKey)
      .attr("r", VCDS.dot.radius)
      .attr("fill", color)
      .attr("stroke", "#fff")
      .attr("stroke-width", VCDS.dot.strokeWidth)
      .attr("cx", (d) => valScale(Number(d.__value__)))
      .attr("cy", (d) => catScale(String(d.__category__)) ?? 0)
      .attr("cursor", onPointClick ? "pointer" : "default");
    dotLayers.push(dots);
    if (onPointClick) dots.on("click", (_event, datum) => onPointClick(datum));
  });

  const tooltip = showTooltip ? createTooltipLayer(container, theme, tooltipPresentation) : null;
  const crosshair = createCrosshair({ plot, innerW, innerH, theme });
  const primaryColor = colorScale(seriesGroups[0]?.name ?? "") ?? colors[0] ?? theme.accent;
  crosshair.dot.attr("fill", primaryColor);

  if (showTooltip) {
    plot
      .append("rect")
      .attr("class", "vs-crosshair-hit")
      .attr("width", innerW)
      .attr("height", innerH)
      .attr("fill", "transparent")
      .style("cursor", "crosshair")
      .lower()
      .on("mousemove", (event) => {
        const [mx, my] = d3.pointer(event);
        let best = categories[0] ?? "";
        let bestDist = Infinity;
        for (const cat of categories) {
          const py = catScale(cat) ?? 0;
          const dist = Math.abs(py - my);
          if (dist < bestDist) {
            bestDist = dist;
            best = cat;
          }
        }
        const rows = seriesGroups.map((series) => {
          const point = series.points.find((p) => String(p.__category__) === best);
          const color = colorScale(series.name) ?? colors[0] ?? theme.accent;
          return { name: series.name, color, value: point?.__value__ ?? 0 };
        });
        const anchor = rows[0];
        const cx = anchor ? valScale(Number(anchor.value)) : mx;
        const cy = catScale(best) ?? my;
        crosshair.show(cx, cy, primaryColor);
        highlightCategoryDots(dotLayers, best);
        pulseSelection(crosshair.dot);
        showMergedTooltip(tooltip, container, event, best, rows, valueFormat, width);
      })
      .on("mouseleave", () => {
        crosshair.hide();
        highlightCategoryDots(dotLayers, null);
        hideTooltip(tooltip);
      });
  }

  const detachLegend =
    showLegend && seriesField
      ? renderConfiguredInlineLegend(
          root,
          true,
          seriesGroups.map((series) => ({
            label: series.name || "系列",
            seriesKey: series.name || "系列",
            color: colorScale(series.name) ?? colors[0] ?? theme.accent,
            marker: "line",
            markerWidth: 14,
            markerHeight: 3,
          })),
          {
            width,
            height,
            margin: scene.margin,
            theme,
            layout: legendLayout,
            fontSize: legendLayout?.fontSize,
          },
        )
      : () => undefined;

  const detachLegendDim = wirePlotSeriesLegendDimming(plot);

  return () => {
    detachLegend();
    detachLegendDim();
    hideTooltip(tooltip);
    container.replaceChildren();
  };
}
