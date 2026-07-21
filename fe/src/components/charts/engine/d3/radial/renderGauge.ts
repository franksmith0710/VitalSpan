import * as d3 from "d3";
import { prefersReducedMotion } from "@/components/charts/engine/d3/core/animate";
import { radialMargin } from "@/components/charts/engine/d3/core/margin";
import type { D3RenderConfig } from "@/components/charts/engine/d3/types";
import { formatChartValue } from "@/lib/chartValueFormat";

const START_ANGLE = -Math.PI * 0.75;
const END_ANGLE = Math.PI * 0.75;

function gaugeArcPath(innerR: number, outerR: number, start: number, end: number): string {
  const arc = d3
    .arc<d3.DefaultArcObject>()
    .innerRadius(innerR)
    .outerRadius(outerR)
    .startAngle(start)
    .endAngle(end);
  return arc({ innerRadius: innerR, outerRadius: outerR, startAngle: start, endAngle: end }) ?? "";
}

export function renderD3GaugeChart(container: HTMLElement, config: D3RenderConfig): () => void {
  container.replaceChildren();

  const { width, height, colors, theme, showTooltip, valueFormat, options } = config;
  const rawValue = Number(options.rawValue ?? NaN);
  const percent = Math.min(1, Math.max(0, Number(options.percent ?? 0)));
  const usePercent = Number.isFinite(rawValue) ? rawValue <= 100 : true;

  if (width <= 0 || height <= 0) return () => undefined;

  const margin = radialMargin(false);
  const innerW = Math.max(0, width - margin.left - margin.right);
  const innerH = Math.max(0, height - margin.top - margin.bottom);
  const cx = margin.left + innerW / 2;
  const cy = margin.top + innerH * 0.58;
  const radius = Math.min(innerW, innerH) * 0.42;
  const rangeColors = (options.range as { color?: string[] } | undefined)?.color;
  const activeColor = rangeColors?.[0] ?? colors[0] ?? "#465fff";
  const trackColor = rangeColors?.[1] ?? theme.gridLine;

  const root = d3
    .select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("role", "img");

  const g = root.append("g").attr("transform", `translate(${cx},${cy})`);

  const trackArc = gaugeArcPath(radius * 0.72, radius, START_ANGLE, END_ANGLE);
  const valueArc = gaugeArcPath(
    radius * 0.72,
    radius,
    START_ANGLE,
    START_ANGLE + (END_ANGLE - START_ANGLE) * percent,
  );

  g.append("path").attr("d", trackArc).attr("fill", trackColor).attr("opacity", 0.95);

  const valuePath = g.append("path").attr("fill", activeColor).attr("opacity", 0.95).attr("d", valueArc);

  if (!prefersReducedMotion()) {
    const interp = d3.interpolateNumber(START_ANGLE, START_ANGLE + (END_ANGLE - START_ANGLE) * percent);
    valuePath
      .attr("d", gaugeArcPath(radius * 0.72, radius, START_ANGLE, START_ANGLE))
      .transition()
      .duration(720)
      .ease(d3.easeCubicOut)
      .attrTween("d", () => (t) => gaugeArcPath(radius * 0.72, radius, START_ANGLE, interp(t)));
  }

  const pointerAngle = START_ANGLE + (END_ANGLE - START_ANGLE) * percent;
  const pointerLen = radius * 0.62;
  const pointer = g
    .append("line")
    .attr("x1", 0)
    .attr("y1", 0)
    .attr("x2", Math.cos(pointerAngle - Math.PI / 2) * pointerLen)
    .attr("y2", Math.sin(pointerAngle - Math.PI / 2) * pointerLen)
    .attr("stroke", activeColor)
    .attr("stroke-width", 3)
    .attr("stroke-linecap", "round");

  if (!prefersReducedMotion()) {
    pointer
      .attr("x2", Math.cos(START_ANGLE - Math.PI / 2) * pointerLen)
      .attr("y2", Math.sin(START_ANGLE - Math.PI / 2) * pointerLen)
      .transition()
      .duration(720)
      .ease(d3.easeCubicOut)
      .attr("x2", Math.cos(pointerAngle - Math.PI / 2) * pointerLen)
      .attr("y2", Math.sin(pointerAngle - Math.PI / 2) * pointerLen);
  }

  g.append("circle").attr("r", 5).attr("fill", activeColor);

  const statistic = options.statistic as { content?: { formatter?: () => string } } | undefined;
  const centerText =
    statistic?.content?.formatter?.() ??
    (usePercent
      ? formatChartValue(percent * 100, valueFormat ? { ...valueFormat, unit: "%" } : { type: "percent" })
      : formatChartValue(rawValue, valueFormat));

  g.append("text")
    .attr("y", radius * 0.35)
    .attr("text-anchor", "middle")
    .attr("fill", theme.legendText)
    .style("font-size", "22px")
    .style("font-weight", "600")
    .text(centerText);

  if (showTooltip) {
    const tip = d3
      .select(container)
      .append("div")
      .style("position", "absolute")
      .style("pointer-events", "none")
      .style("opacity", "0")
      .style("padding", "6px 8px")
      .style("border-radius", "6px")
      .style("font-size", "12px")
      .style("background", theme.tooltipBg)
      .style("color", theme.tooltipText)
      .style("border", `1px solid ${theme.axisLine}`)
      .style("z-index", "10");

    root
      .append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "transparent")
      .on("mousemove", (event) => {
        tip.style("opacity", "1").text(formatChartValue(percent * 100, valueFormat));
        const rect = container.getBoundingClientRect();
        tip
          .style("left", `${event.clientX - rect.left + 10}px`)
          .style("top", `${event.clientY - rect.top - 28}px`);
      })
      .on("mouseleave", () => tip.style("opacity", "0"));
  }

  return () => container.replaceChildren();
}
