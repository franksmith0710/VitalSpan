import { VCDS, motionDuration } from "@/components/charts/engine/d3/core/chartVisualTokens";
import { renderConfiguredInlineLegend } from "@/components/charts/engine/d3/core/d3Legend";
import { ensureDepthShadowFilter, resolveEffectiveDepth } from "@/components/charts/engine/d3/core/depthEngine";
import { wirePlotSeriesLegendDimming } from "@/components/charts/engine/d3/core/legendInteraction";
import { brushFade } from "@/components/charts/engine/d3/core/motionEngine";
import * as d3 from "d3";
import { renderScatterCanvasLayer } from "@/components/charts/engine/d3/core/canvasScatterLayer";
import { drawLinearCartesianAxes } from "@/components/charts/engine/d3/core/sceneGraph";
import { cartesianMargin } from "@/components/charts/engine/d3/core/margin";
import { drawScatterMarkLines } from "@/components/charts/engine/d3/core/markLines";
import { resolveRenderMode, sampleIndices } from "@/components/charts/engine/d3/core/perfRouter";
import { resolveLabelFill } from "@/components/charts/engine/d3/core/presentation";
import { resolveDatumColor } from "@/components/charts/engine/d3/core/series";
import { createTooltipLayer, showMergedTooltip, hideTooltip } from "@/components/charts/engine/d3/core/tooltipLayer";
import { themeFromConfig } from "@/components/charts/engine/d3/core/themeEngine";
import type { D3Datum, D3RenderConfig } from "@/components/charts/engine/d3/types";
import { formatChartValue } from "@/lib/chartValueFormat";
import { resolveCartesianPointSize } from "@/lib/applyChartDeStyleBlocks";

type ScatterDatum = Record<string, string | number>;
type ScatterSeries = { key: string; points: ScatterDatum[] };

function buildScatterSeries(data: ScatterDatum[], colorField?: string): ScatterSeries[] {
  if (!colorField) return [{ key: "value", points: data }];
  const names = [...new Set(data.map((d) => String(d[colorField] ?? "")))];
  return names.map((key) => ({
    key,
    points: data.filter((d) => String(d[colorField] ?? "") === key),
  }));
}

function sampleSeriesPoints(series: ScatterSeries, indices: number[], allData: ScatterDatum[]): ScatterDatum[] {
  const indexSet = new Set(indices);
  return series.points.filter((d) => {
    const idx = allData.indexOf(d);
    return idx >= 0 && indexSet.has(idx);
  });
}

export function renderD3ScatterChart(container: HTMLElement, config: D3RenderConfig): () => void {
  container.replaceChildren();
  const {
    width,
    height,
    colors,
    theme: rawTheme,
    showLabel,
    showTooltip,
    showLegend,
    labelFontSize,
    labelColor,
    tooltipPresentation,
    valueFormat,
    options,
    onPointClick,
    markLines = [],
    conditionalRules = [],
    depthVisual,
    axisStyle,
    pointSize,
    legendLayout,
  } = config;
  const dotRadius = resolveCartesianPointSize(pointSize ?? (options.__pointSize as number | undefined));
  const theme = themeFromConfig(rawTheme);
  const depthLevel = resolveEffectiveDepth(depthVisual);
  const data = (options.data as ScatterDatum[]) ?? [];
  const xField = String(options.xField ?? "x");
  const yField = String(options.yField ?? "y");
  const colorField = options.colorField ? String(options.colorField) : undefined;
  if (width <= 0 || height <= 0 || data.length === 0) return () => undefined;

  const margin = cartesianMargin(showLegend && !!colorField);
  const innerW = Math.max(0, width - margin.left - margin.right);
  const innerH = Math.max(0, height - margin.top - margin.bottom);
  const renderMode = resolveRenderMode(data.length, "Scatter");
  const useCanvas = renderMode === "hybrid-canvas";
  const maxSvgPoints =
    renderMode === "svg-full" ? data.length : VCDS.perf.svgSampleMaxPoints;
  const svgIndices =
    renderMode === "svg-full" ? data.map((_, i) => i) : sampleIndices(data.length, maxSvgPoints);
  const seriesList = buildScatterSeries(data, colorField);
  const seriesNames = seriesList.map((s) => s.key);
  const colorScale = d3.scaleOrdinal<string>().domain(seriesNames).range(colors);

  const xExtent = d3.extent(data, (d) => Number(d[xField])) as [number, number];
  const yExtent = d3.extent(data, (d) => Number(d[yField])) as [number, number];
  const xScale = d3.scaleLinear().domain(xExtent).nice().range([0, innerW]);
  const yScale = d3.scaleLinear().domain(yExtent).nice().range([innerH, 0]);

  const svg = d3
    .select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("role", "img")
    .style("position", useCanvas ? "relative" : undefined)
    .style("z-index", useCanvas ? "1" : undefined);

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const plot = g.append("g");

  plot
    .append("g")
    .attr("class", "grid")
    .call(
      d3
        .axisLeft(yScale)
        .ticks(5)
        .tickSize(-innerW)
        .tickFormat(() => ""),
    )
    .call((sel) => sel.select(".domain").remove())
    .call((sel) => sel.selectAll(".tick line").attr("stroke", theme.gridLine).attr("stroke-opacity", 0.9));

  drawLinearCartesianAxes({
    g,
    xScale,
    yScale,
    innerW,
    innerH,
    theme,
    valueFormat,
    axisStyle: axisStyle ?? (options.__axisStyle as typeof axisStyle),
  });

  drawScatterMarkLines(plot, markLines, xScale, yScale, innerW, innerH);

  const scatterShadowId =
    !useCanvas && depthLevel !== "off"
      ? ensureDepthShadowFilter(svg.append("defs"), "scatter", depthLevel)
      : null;

  let removeCanvas = () => undefined;
  if (useCanvas) {
    const canvasPoints = data.map((d) => {
      const key = colorField ? String(d[colorField] ?? "") : "value";
      const base = colorScale(key) ?? colors[0] ?? theme.accent;
      const fill =
        conditionalRules.length > 0
          ? resolveDatumColor(Number(d[yField]), base, conditionalRules)
          : base;
      return {
        x: xScale(Number(d[xField])),
        y: yScale(Number(d[yField])),
        color: fill,
      };
    });
    removeCanvas = renderScatterCanvasLayer(container, canvasPoints, width, height, margin);
  }

  const tooltip = showTooltip ? createTooltipLayer(container, theme, tooltipPresentation) : null;
  const pointRadius = useCanvas ? dotRadius : dotRadius + 1.5;

  const bindPointEvents = (
    circle: d3.Selection<SVGCircleElement, ScatterDatum, SVGGElement, ScatterSeries>,
    seriesKey: string,
  ) => {
    circle
      .attr("class", "point")
      .attr("r", pointRadius)
      .attr("cx", (d) => xScale(Number(d[xField])))
      .attr("cy", (d) => yScale(Number(d[yField])))
      .attr("fill", (d) => {
        const base = colorScale(seriesKey) ?? colors[0] ?? theme.accent;
        return conditionalRules.length > 0
          ? resolveDatumColor(Number(d[yField]), base, conditionalRules)
          : base;
      })
      .attr("stroke", theme.background === "transparent" ? "#fff" : theme.background)
      .attr("stroke-width", VCDS.dot.strokeWidth)
      .attr("filter", scatterShadowId ? `url(#${scatterShadowId})` : null)
      .attr("opacity", useCanvas ? 0 : 0.9)
      .style("cursor", onPointClick ? "pointer" : "default")
      .on("mouseenter", function () {
        if (useCanvas) return;
        d3.select(this)
          .transition()
          .duration(motionDuration("hover"))
          .attr("r", dotRadius + 2)
          .attr("opacity", 1);
      })
      .on("mouseleave", function () {
        if (useCanvas) return;
        d3.select(this)
          .transition()
          .duration(motionDuration("hover"))
          .attr("r", pointRadius)
          .attr("opacity", 0.9);
        hideTooltip(tooltip);
      })
      .on("mousemove", (event, d) => {
        if (!tooltip) return;
        const color = colorScale(seriesKey) ?? colors[0] ?? theme.accent;
        const title = seriesKey === "value" ? `${xField} / ${yField}` : seriesKey;
        showMergedTooltip(
          tooltip,
          container,
          event,
          title,
          [
            { name: xField, color, value: d[xField] },
            { name: yField, color, value: d[yField] },
          ],
          valueFormat,
          width,
        );
      })
      .on("click", (_event, d) => onPointClick?.(d as D3Datum));
  };

  plot
    .selectAll<SVGGElement, ScatterSeries>("g.scatter-series")
    .data(seriesList)
    .join("g")
    .attr("class", "scatter-series")
    .attr("data-series-key", (d) => d.key)
    .each(function (series) {
      const pts = sampleSeriesPoints(series, svgIndices, data);
      const circles = d3
        .select(this)
        .selectAll<SVGCircleElement, ScatterDatum>("circle")
        .data(pts, (d) => `${series.key}-${d[xField]}-${d[yField]}`)
        .join("circle");
      bindPointEvents(circles, series.key);
    });

  if (!useCanvas) {
    const brushG = plot.append("g").attr("class", "scatter-brush").style("pointer-events", "all");
    const brush = d3
      .brush()
      .extent([
        [0, 0],
        [innerW, innerH],
      ])
      .on("brush end", (event) => {
        const sel = event.selection as [[number, number], [number, number]] | null;
        if (!sel) {
          plot.selectAll<SVGCircleElement, ScatterDatum>("circle.point").attr("opacity", 0.9);
          return;
        }
        const [[x0, y0], [x1, y1]] = sel;
        const minX = Math.min(x0, x1);
        const maxX = Math.max(x0, x1);
        const minY = Math.min(y0, y1);
        const maxY = Math.max(y0, y1);
        plot.selectAll<SVGCircleElement, ScatterDatum>("circle.point").attr("opacity", function () {
          const cx = Number(d3.select(this).attr("cx"));
          const cy = Number(d3.select(this).attr("cy"));
          return cx >= minX && cx <= maxX && cy >= minY && cy <= maxY ? 1 : 0.18;
        });
      });
    brushG.call(brush);
    brushG.selectAll(".overlay").attr("cursor", "crosshair");
    brushG
      .selectAll<SVGRectElement, unknown>(".selection")
      .attr("fill", theme.accent)
      .attr("fill-opacity", 0.12)
      .call((sel) => brushFade(sel, 0.12));
    brushG.raise();
    plot.selectAll("g.scatter-series").raise();
  }

  if (useCanvas && showTooltip) {
    plot
      .append("rect")
      .attr("width", innerW)
      .attr("height", innerH)
      .attr("fill", "transparent")
      .style("cursor", "crosshair")
      .on("mousemove", (event) => {
        const [mx, my] = d3.pointer(event);
        let best: ScatterDatum | null = null;
        let bestDist = Infinity;
        for (const d of data) {
          const dx = xScale(Number(d[xField])) - mx;
          const dy = yScale(Number(d[yField])) - my;
          const dist = dx * dx + dy * dy;
          if (dist < bestDist) {
            bestDist = dist;
            best = d;
          }
        }
        if (!best || !tooltip) return;
        const series = colorField ? String(best[colorField] ?? "") : "";
        const color = colorScale(series || "value") ?? colors[0] ?? theme.accent;
        showMergedTooltip(
          tooltip,
          container,
          event,
          series || `${xField} / ${yField}`,
          [
            { name: xField, color, value: best[xField] },
            { name: yField, color, value: best[yField] },
          ],
          valueFormat,
          width,
        );
      })
      .on("mouseleave", () => hideTooltip(tooltip));
  }

  if (showLabel && !useCanvas) {
    const labelData = svgIndices.map((i) => data[i]);
    plot
      .selectAll<SVGTextElement, ScatterDatum>("text.scatter-label")
      .data(labelData)
      .join("text")
      .attr("class", "scatter-label")
      .attr("x", (d) => xScale(Number(d[xField])) + 6)
      .attr("y", (d) => yScale(Number(d[yField])) - 6)
      .attr("fill", resolveLabelFill(theme, labelColor))
      .style("font-size", "10px")
      .style("pointer-events", "none")
      .text((d) => {
        if (colorField) return String(d[colorField] ?? "");
        return `${formatChartValue(d[xField], valueFormat)}, ${formatChartValue(d[yField], valueFormat)}`;
      });
  }

  const cleanupLegend = renderConfiguredInlineLegend(
    svg,
    showLegend && !!colorField,
    seriesList.map((series, index) => ({
      label: series.key,
      color: colorScale(series.key) ?? colors[index % colors.length] ?? theme.accent,
      seriesKey: series.key,
      marker: "circle",
    })),
    { width, height, margin, theme, layout: legendLayout, fontSize: legendLayout?.fontSize },
  );
  const cleanupDimming = colorField ? wirePlotSeriesLegendDimming(plot) : () => undefined;

  return () => {
    cleanupDimming();
    cleanupLegend();
    removeCanvas();
    container.replaceChildren();
  };
}
