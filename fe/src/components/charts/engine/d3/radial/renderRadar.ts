import * as d3 from "d3";
import { VCDS, motionDuration } from "@/components/charts/engine/d3/core/chartVisualTokens";
import { chartTransition, prefersReducedMotion } from "@/components/charts/engine/d3/core/animate";
import { resolveEffectiveDepth, shadeColor } from "@/components/charts/engine/d3/core/depthEngine";
import { renderConfiguredInlineLegend } from "@/components/charts/engine/d3/core/d3Legend";
import { wirePlotSeriesLegendDimming } from "@/components/charts/engine/d3/core/legendInteraction";
import { staggerDelay } from "@/components/charts/engine/d3/core/motionEngine";
import { groupSeries, resolveDatumColor } from "@/components/charts/engine/d3/core/series";
import {
  createTooltipLayer,
  hideTooltip,
  showMergedTooltip,
} from "@/components/charts/engine/d3/core/tooltipLayer";
import type { D3Datum, D3RenderConfig } from "@/components/charts/engine/d3/types";
import { computeRadarLayout } from "./radarLayout";

function radarCategories(data: D3Datum[], xField: string): string[] {
  const seen = new Set<string>();
  const cats: string[] = [];
  for (const row of data) {
    const key = String(row[xField] ?? "");
    if (seen.has(key)) continue;
    seen.add(key);
    cats.push(key);
  }
  return cats;
}

function seriesPoints(
  points: D3Datum[],
  categories: string[],
  xField: string,
  yField: string,
  radius: number,
  maxValue: number,
  angleStep: number,
): [number, number][] {
  const byCat = new Map(points.map((p) => [String(p[xField] ?? ""), p]));
  const coords = categories.map((cat, i) => {
    const row = byCat.get(cat);
    const v = Number(row?.[yField] ?? 0);
    const r = (v / (maxValue || 1)) * radius;
    const angle = i * angleStep - Math.PI / 2;
    return [Math.cos(angle) * r, Math.sin(angle) * r] as [number, number];
  });
  if (coords.length > 0) coords.push(coords[0]!);
  return coords;
}

export function renderD3RadarChart(container: HTMLElement, config: D3RenderConfig): () => void {
  container.replaceChildren();

  const {
    width,
    height,
    colors,
    theme,
    showLabel,
    showTooltip,
    showLegend,
    legendLayout,
    labelFontSize,
    valueFormat,
    conditionalRules = [],
    onPointClick,
    options,
  } = config;

  const data = (options.data as D3Datum[]) ?? [];
  const xField = String(options.xField ?? "type");
  const yField = String(options.yField ?? "value");
  const seriesField = options.seriesField ? String(options.seriesField) : undefined;
  const radarShape = String(options.__radarShape ?? "polygon");
  const radarAreaOpacity = Number(options.__radarAreaOpacity ?? VCDS.radar.areaOpacity);
  const showAxisName = options.__radarShowAxisName !== false;

  if (width <= 0 || height <= 0 || data.length === 0) return () => undefined;

  const layout = computeRadarLayout(width, height, showLegend, showLabel);
  const { cx, cy, radius } = layout;
  const levels = VCDS.radar.gridLevels;
  const categories = radarCategories(data, xField);
  const seriesGroups = groupSeries(data, seriesField);
  const maxValue = d3.max(data, (d) => Number(d[yField] ?? 0)) ?? 1;
  const depthOn = resolveEffectiveDepth() !== "off";
  const angleStep = (Math.PI * 2) / categories.length;
  const colorScale = d3.scaleOrdinal<string>().domain(seriesGroups.map((s) => s.name)).range(colors);

  const root = d3
    .select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("role", "img");

  const plot = root.append("g").attr("transform", `translate(${cx},${cy})`);

  for (let level = 1; level <= levels; level += 1) {
    const r = (radius * level) / levels;
    if (radarShape === "circle") {
      plot
        .append("circle")
        .attr("r", r)
        .attr("fill", "none")
        .attr("stroke", theme.gridLine)
        .attr("stroke-opacity", VCDS.grid.opacity);
    } else {
      const ring = categories.map((_, i) => {
        const angle = i * angleStep - Math.PI / 2;
        return [Math.cos(angle) * r, Math.sin(angle) * r] as [number, number];
      });
      ring.push(ring[0]!);
      plot
        .append("path")
        .attr("d", d3.line()(ring) ?? "")
        .attr("fill", "none")
        .attr("stroke", theme.gridLine)
        .attr("stroke-opacity", VCDS.grid.opacity);
    }
  }

  categories.forEach((cat, i) => {
    const angle = i * angleStep - Math.PI / 2;
    plot
      .append("line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", Math.cos(angle) * radius)
      .attr("y2", Math.sin(angle) * radius)
      .attr("stroke", theme.gridLine)
      .attr("stroke-opacity", VCDS.grid.opacity);

    if (showLabel && showAxisName) {
      const labelR = radius + 14;
      plot
        .append("text")
        .attr("x", Math.cos(angle) * labelR)
        .attr("y", Math.sin(angle) * labelR)
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("fill", theme.axisLabel)
        .style("font-size", `${labelFontSize}px`)
        .text(cat);
    }
  });

  const tooltip = showTooltip ? createTooltipLayer(container, theme, config.tooltipPresentation) : null;

  seriesGroups.forEach((series, seriesIndex) => {
    const seriesKey = series.name || `series-${seriesIndex}`;
    const baseColor = colorScale(series.name) ?? colors[seriesIndex % colors.length] ?? "#465fff";
    const points = seriesPoints(series.points, categories, xField, yField, radius, maxValue, angleStep);
    const layer = plot
      .append("g")
      .attr("class", "radar-series")
      .attr("data-series-key", seriesKey);

    const areaPath = layer
      .append("path")
      .attr("fill", baseColor)
      .attr("fill-opacity", radarAreaOpacity)
      .attr("stroke", depthOn ? shadeColor(baseColor, "top") : baseColor)
      .attr("stroke-width", VCDS.radar.strokeWidth)
      .attr("stroke-linejoin", "round")
      .style("paint-order", depthOn ? "stroke fill" : null);

    if (!prefersReducedMotion()) {
      areaPath
        .attr("d", d3.line()([points[0]!]) ?? "")
        .transition()
        .duration(motionDuration("enter"))
        .delay(staggerDelay(seriesIndex))
        .ease(d3.easeCubicOut)
        .attrTween("d", () => {
          const interp = d3.interpolateArray([points[0]!], points);
          return (t) => d3.line()(interp(t)) ?? "";
        });
    } else {
      areaPath.attr("d", d3.line()(points) ?? "");
    }

    const dotData = categories.map((cat) => {
      const row = series.points.find((p) => String(p[xField] ?? "") === cat);
      return row ?? { [xField]: cat, [yField]: 0 };
    });

    layer
      .selectAll<SVGCircleElement, D3Datum>("circle.radar-dot")
      .data(dotData)
      .join("circle")
      .attr("class", "radar-dot")
      .attr("r", VCDS.radar.pointRadius)
      .attr("fill", (d) => resolveDatumColor(Number(d[yField] ?? 0), baseColor, conditionalRules))
      .attr("stroke", "#fff")
      .attr("stroke-width", VCDS.dot.strokeWidth)
      .attr("cursor", onPointClick ? "pointer" : "default")
      .attr("cx", (_d, i) => points[i]![0])
      .attr("cy", (_d, i) => points[i]![1])
      .on("mouseenter", (event, d) => {
        if (!tooltip) return;
        const color = resolveDatumColor(Number(d[yField] ?? 0), baseColor, conditionalRules);
        showMergedTooltip(
          tooltip,
          container,
          event as MouseEvent,
          String(d[xField] ?? ""),
          [{ name: seriesKey, color, value: d[yField] }],
          valueFormat,
          width,
        );
      })
      .on("mousemove", (event, d) => {
        if (!tooltip) return;
        const color = resolveDatumColor(Number(d[yField] ?? 0), baseColor, conditionalRules);
        showMergedTooltip(
          tooltip,
          container,
          event as MouseEvent,
          String(d[xField] ?? ""),
          [{ name: seriesKey, color, value: d[yField] }],
          valueFormat,
          width,
        );
      })
      .on("mouseleave", () => hideTooltip(tooltip))
      .on("click", (_event, d) => onPointClick?.(d));

    if (!prefersReducedMotion()) {
      layer
        .selectAll<SVGCircleElement, D3Datum>("circle.radar-dot")
        .attr("r", 0)
        .transition()
        .duration(motionDuration("enter"))
        .delay((_d, i) => staggerDelay(seriesIndex) + i * VCDS.motion.stagger)
        .attr("r", VCDS.radar.pointRadius);
    }
  });

  const margin = { top: 8, right: 8, bottom: 8, left: 8 };
  const legendCleanup = renderConfiguredInlineLegend(
    root,
    showLegend && seriesGroups.length > 1,
    seriesGroups.map((series, i) => ({
      label: series.name || `系列 ${i + 1}`,
      color: colorScale(series.name) ?? colors[i % colors.length] ?? "#465fff",
      seriesKey: series.name || `series-${i}`,
    })),
    { width, height, margin, theme, layout: legendLayout, fontSize: legendLayout?.fontSize },
  );

  const dimCleanup = wirePlotSeriesLegendDimming(plot);

  return () => {
    dimCleanup();
    legendCleanup();
    container.replaceChildren();
  };
}
