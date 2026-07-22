import * as d3 from "d3";
import { prefersReducedMotion } from "@/components/charts/engine/d3/core/animate";
import { resolveEffectiveDepth, shadeColor } from "@/components/charts/engine/d3/core/depthEngine";
import { resolveDatumColor } from "@/components/charts/engine/d3/core/series";
import { createTooltip, tooltipHtml } from "@/components/charts/engine/d3/core/tooltip";
import type { D3Datum, D3RenderConfig } from "@/components/charts/engine/d3/types";
import { computeRadarLayout } from "./radarLayout";

export function renderD3RadarChart(container: HTMLElement, config: D3RenderConfig): () => void {
  container.replaceChildren();

  const {
    width,
    height,
    colors,
    theme,
    showLabel,
    showTooltip,
    labelFontSize,
    valueFormat,
    conditionalRules = [],
    onPointClick,
    options,
  } = config;

  const data = (options.data as D3Datum[]) ?? [];
  const xField = String(options.xField ?? "type");
  const yField = String(options.yField ?? "value");
  const radarShape = String(options.__radarShape ?? "polygon");
  const radarAreaOpacity = Number(options.__radarAreaOpacity ?? 0.18);
  const showAxisName = options.__radarShowAxisName !== false;

  if (width <= 0 || height <= 0 || data.length === 0) return () => undefined;

  const layout = computeRadarLayout(width, height, false, showLabel);
  const { cx, cy, radius } = layout;
  const levels = 4;
  const maxValue = d3.max(data, (d) => Number(d[yField] ?? 0)) ?? 1;
  const baseColor = colors[0] ?? "#465fff";
  const depthOn = resolveEffectiveDepth() !== "off";

  const root = d3
    .select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("role", "img");

  const g = root.append("g").attr("transform", `translate(${cx},${cy})`);
  const angleStep = (Math.PI * 2) / data.length;

  for (let level = 1; level <= levels; level += 1) {
    const r = (radius * level) / levels;
    if (radarShape === "circle") {
      g.append("circle")
        .attr("r", r)
        .attr("fill", "none")
        .attr("stroke", theme.gridLine)
        .attr("stroke-opacity", 0.9);
    } else {
      const ring = d3.range(data.length).map((i) => {
        const angle = i * angleStep - Math.PI / 2;
        return [Math.cos(angle) * r, Math.sin(angle) * r] as [number, number];
      });
      ring.push(ring[0]!);
      g.append("path")
        .attr("d", d3.line()(ring) ?? "")
        .attr("fill", "none")
        .attr("stroke", theme.gridLine)
        .attr("stroke-opacity", 0.9);
    }
  }

  data.forEach((row, i) => {
    const angle = i * angleStep - Math.PI / 2;
    g.append("line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", Math.cos(angle) * radius)
      .attr("y2", Math.sin(angle) * radius)
      .attr("stroke", theme.gridLine)
      .attr("stroke-opacity", 0.9);

    if (showLabel && showAxisName) {
      const labelR = radius + 14;
      g.append("text")
        .attr("x", Math.cos(angle) * labelR)
        .attr("y", Math.sin(angle) * labelR)
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("fill", theme.axisLabel)
        .style("font-size", `${labelFontSize}px`)
        .text(String(row[xField] ?? ""));
    }
  });

  const points: [number, number][] = data.map((row, i) => {
    const v = Number(row[yField] ?? 0);
    const r = (v / (maxValue || 1)) * radius;
    const angle = i * angleStep - Math.PI / 2;
    return [Math.cos(angle) * r, Math.sin(angle) * r];
  });
  points.push(points[0]!);

  const areaPath = g
    .append("path")
    .attr("fill", baseColor)
    .attr("fill-opacity", radarAreaOpacity)
    .attr("stroke", depthOn ? shadeColor(baseColor, "top") : baseColor)
    .attr("stroke-width", depthOn ? 2.5 : 2)
    .attr("stroke-linejoin", "round")
    .style("paint-order", depthOn ? "stroke fill" : null);

  if (!prefersReducedMotion()) {
    areaPath
      .attr("d", d3.line()([points[0]!]) ?? "")
      .transition()
      .duration(680)
      .ease(d3.easeCubicOut)
      .attrTween("d", () => {
        const interp = d3.interpolateArray([points[0]!], points);
        return (t) => d3.line()(interp(t)) ?? "";
      });
  } else {
    areaPath.attr("d", d3.line()(points) ?? "");
  }

  const tooltip = showTooltip ? createTooltip(container, theme) : null;
  const dots = g
    .selectAll<SVGCircleElement, D3Datum>("circle.radar-dot")
    .data(data)
    .join("circle")
    .attr("class", "radar-dot")
    .attr("r", 4)
    .attr("fill", (d) => resolveDatumColor(Number(d[yField] ?? 0), baseColor, conditionalRules))
    .attr("stroke", "#fff")
    .attr("stroke-width", 1.5)
    .attr("cursor", onPointClick ? "pointer" : "default")
    .attr("cx", (_d, i) => points[i]![0])
    .attr("cy", (_d, i) => points[i]![1])
    .on("mouseenter", (_event, d) => {
      if (!tooltip) return;
      const color = resolveDatumColor(Number(d[yField] ?? 0), baseColor, conditionalRules);
      tooltip
        .style("opacity", "1")
        .html(tooltipHtml(String(d[xField] ?? ""), [{ name: "", color, value: d[yField] }], valueFormat));
    })
    .on("mousemove", (event) => {
      if (!tooltip) return;
      const rect = container.getBoundingClientRect();
      tooltip
        .style("left", `${Math.min(event.clientX - rect.left + 12, width - 160)}px`)
        .style("top", `${Math.max(event.clientY - rect.top - 48, 8)}px`);
    })
    .on("mouseleave", () => tooltip?.style("opacity", "0"))
    .on("click", (_event, d) => onPointClick?.(d));

  if (!prefersReducedMotion()) {
    dots.attr("r", 0).transition().duration(480).delay((_d, i) => i * 40).attr("r", 4);
  }

  return () => container.replaceChildren();
}
