import { VCDS, motionDuration } from "@/components/charts/engine/d3/core/chartVisualTokens";
import { ensureDepthShadowFilter, resolveEffectiveDepth } from "@/components/charts/engine/d3/core/depthEngine";
import * as d3 from "d3";
import { renderScatterCanvasLayer } from "@/components/charts/engine/d3/core/canvasScatterLayer";
import { drawLinearCartesianAxes, appendChartSvg } from "@/components/charts/engine/d3/core/sceneGraph";
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

export function renderD3ScatterChart(container: HTMLElement, config: D3RenderConfig): () => void {
  container.replaceChildren();
  const {
    width,
    height,
    colors,
    theme: rawTheme,
    showLabel,
    showTooltip,
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
  } = config;
  const dotRadius = resolveCartesianPointSize(pointSize ?? (options.__pointSize as number | undefined));
  const theme = themeFromConfig(rawTheme);
  const depthLevel = resolveEffectiveDepth(depthVisual);
  const data = (options.data as ScatterDatum[]) ?? [];
  const xField = String(options.xField ?? "x");
  const yField = String(options.yField ?? "y");
  const colorField = options.colorField ? String(options.colorField) : undefined;
  if (width <= 0 || height <= 0 || data.length === 0) return () => undefined;

  const margin = cartesianMargin(false);
  const innerW = Math.max(0, width - margin.left - margin.right);
  const innerH = Math.max(0, height - margin.top - margin.bottom);
  const renderMode = resolveRenderMode(data.length, "Scatter");
  const useCanvas = renderMode === "hybrid-canvas";
  const maxSvgPoints =
    renderMode === "svg-full" ? data.length : VCDS.perf.svgSampleMaxPoints;
  const svgIndices =
    renderMode === "svg-full" ? data.map((_, i) => i) : sampleIndices(data.length, maxSvgPoints);
  const svgData = svgIndices.map((i) => data[i]);

  const xExtent = d3.extent(data, (d) => Number(d[xField])) as [number, number];
  const yExtent = d3.extent(data, (d) => Number(d[yField])) as [number, number];
  const xScale = d3.scaleLinear().domain(xExtent).nice().range([0, innerW]);
  const yScale = d3.scaleLinear().domain(yExtent).nice().range([innerH, 0]);

  const seriesNames = colorField
    ? [...new Set(data.map((d) => String(d[colorField] ?? "")))]
    : ["value"];
  const colorScale = d3.scaleOrdinal<string>().domain(seriesNames).range(colors);

  const svg = appendChartSvg(container, width, height);
  if (useCanvas) {
    svg.style("position", "relative").style("z-index", "1");
  }

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
  plot
    .selectAll<SVGCircleElement, ScatterDatum>("circle.point")
    .data(svgData)
    .join("circle")
    .attr("class", "point")
    .attr("r", useCanvas ? dotRadius : dotRadius + 1.5)
    .attr("cx", (d) => xScale(Number(d[xField])))
    .attr("cy", (d) => yScale(Number(d[yField])))
    .attr("fill", (d) => {
      const key = colorField ? String(d[colorField] ?? "") : "value";
      const base = colorScale(key) ?? colors[0] ?? theme.accent;
      return conditionalRules.length > 0
        ? resolveDatumColor(Number(d[yField]), base, conditionalRules)
        : base;
    })
    .attr("stroke", "#fff")
    .attr("stroke-width", 1.5)
    .attr("filter", scatterShadowId ? `url(#${scatterShadowId})` : null)
    .attr("opacity", useCanvas ? 0 : 0.9)
    .style("cursor", onPointClick ? "pointer" : "default")
    .on("mouseenter", function () {
      if (useCanvas) return;
      d3.select(this).transition().duration(motionDuration("hover")).attr("r", dotRadius + 2).attr("opacity", 1);
    })
    .on("mouseleave", function () {
      if (useCanvas) return;
      d3.select(this).transition().duration(motionDuration("hover")).attr("r", dotRadius + 1.5).attr("opacity", 0.9);
      hideTooltip(tooltip);
    })
    .on("mousemove", (event, d) => {
      if (!tooltip) return;
      const series = colorField ? String(d[colorField] ?? "") : "";
      const color = colorScale(series || "value") ?? colors[0] ?? theme.accent;
      const title = series || `${xField} / ${yField}`;
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
    plot
      .selectAll<SVGTextElement, ScatterDatum>("text.scatter-label")
      .data(svgData)
      .join("text")
      .attr("class", "scatter-label")
      .attr("x", (d) => xScale(Number(d[xField])) + 6)
      .attr("y", (d) => yScale(Number(d[yField])) - 6)
      .attr("fill", resolveLabelFill(theme, labelColor))
      .style("font-size", "10px")
      .text((d) => {
        if (colorField) return String(d[colorField] ?? "");
        return `${formatChartValue(d[xField], valueFormat)}, ${formatChartValue(d[yField], valueFormat)}`;
      });
  }

  return () => {
    removeCanvas();
    container.replaceChildren();
  };
}
