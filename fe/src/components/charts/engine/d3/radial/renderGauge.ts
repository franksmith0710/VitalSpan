import * as d3 from "d3";
import { VCDS, motionDuration } from "@/components/charts/engine/d3/core/chartVisualTokens";
import { prefersReducedMotion } from "@/components/charts/engine/d3/core/animate";
import { resolveEffectiveDepth, shadeColor } from "@/components/charts/engine/d3/core/depthEngine";
import { radialMargin } from "@/components/charts/engine/d3/core/margin";
import { resolveLabelFill } from "@/components/charts/engine/d3/core/presentation";
import {
  createTooltipLayer,
  hideTooltip,
  showSimpleTooltip,
  formatChartValue,
} from "@/components/charts/engine/d3/core/tooltipLayer";
import type { D3RenderConfig } from "@/components/charts/engine/d3/types";
import { resolveGaugeValuePercent } from "@/lib/applyChartDeStyleBlocks";

function gaugeAnglesFromOptions(options: Record<string, unknown>) {
  const startDeg = Number(options.__gaugeStartAngleDeg ?? -135);
  const endDeg = Number(options.__gaugeEndAngleDeg ?? 135);
  return { start: (startDeg * Math.PI) / 180, end: (endDeg * Math.PI) / 180 };
}

function gaugeArcPath(innerR: number, outerR: number, start: number, end: number): string {
  const arc = d3
    .arc<d3.DefaultArcObject>()
    .innerRadius(innerR)
    .outerRadius(outerR)
    .startAngle(start)
    .endAngle(end);
  return arc({ innerRadius: innerR, outerRadius: outerR, startAngle: start, endAngle: end }) ?? "";
}

function resolveSegmentColors(
  rangeColors: string[] | undefined,
  colors: string[],
  themeGrid: string,
): { segments: string[]; track: string } {
  if (!rangeColors || rangeColors.length === 0) {
    return { segments: [colors[0] ?? "#465fff"], track: themeGrid };
  }
  if (rangeColors.length === 1) {
    return { segments: [rangeColors[0]!], track: themeGrid };
  }
  return { segments: rangeColors.slice(0, -1), track: rangeColors[rangeColors.length - 1] ?? themeGrid };
}

export function renderD3GaugeChart(container: HTMLElement, config: D3RenderConfig): () => void {
  container.replaceChildren();

  const {
    width,
    height,
    colors,
    theme,
    showLabel,
    showTooltip,
    labelColor,
    labelFontSize,
    tooltipPresentation,
    valueFormat,
    onPointClick,
    options,
  } = config;
  const rawValue = Number(options.rawValue ?? NaN);
  const percent = resolveGaugeValuePercent(options, rawValue, Math.min(1, Math.max(0, Number(options.percent ?? 0))));
  const usePercent = !Number.isFinite(rawValue);

  if (width <= 0 || height <= 0) return () => undefined;

  const margin = radialMargin(false);
  const innerW = Math.max(0, width - margin.left - margin.right);
  const innerH = Math.max(0, height - margin.top - margin.bottom);
  const cx = margin.left + innerW / 2;
  const cy = margin.top + innerH * 0.58;
  const radius = Math.min(innerW, innerH) * 0.42;
  const { start: START_ANGLE, end: END_ANGLE } = gaugeAnglesFromOptions(options);
  const rangeColors = (options.range as { color?: string[] } | undefined)?.color;
  const { segments, track } = resolveSegmentColors(rangeColors, colors, theme.gridLine);
  const activeColor =
    segments[Math.min(segments.length - 1, Math.floor(percent * segments.length))] ??
    segments[0] ??
    colors[0] ??
    "#465fff";
  const pointerColor = String(options.__gaugePointerColor ?? activeColor);
  const depthOn = resolveEffectiveDepth() !== "off";
  const arcWidth = VCDS.gauge.arcWidth;
  const innerR = radius * 0.72;
  const outerR = innerR + arcWidth;
  const tickCount = Number(options.__gaugeSplitNumber ?? VCDS.gauge.tickCount);

  const root = d3
    .select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("role", "img");

  const g = root.append("g").attr("transform", `translate(${cx},${cy})`);
  const span = END_ANGLE - START_ANGLE;
  const segCount = segments.length;

  for (let i = 0; i < segCount; i += 1) {
    const segStart = START_ANGLE + (span * i) / segCount;
    const segEnd = START_ANGLE + (span * (i + 1)) / segCount;
    const segPath = gaugeArcPath(innerR, outerR, segStart, segEnd);
    const color = segments[i] ?? track;
    if (depthOn) {
      g.append("path").attr("d", segPath).attr("fill", shadeColor(color, "shadow")).attr("opacity", 0.35);
    }
    g.append("path").attr("d", segPath).attr("fill", depthOn ? shadeColor(color, "top") : color).attr("opacity", 0.55);
  }

  const trackArc = gaugeArcPath(innerR, outerR, START_ANGLE, END_ANGLE);
  g.append("path").attr("d", trackArc).attr("fill", track).attr("opacity", depthOn ? 0.25 : 0.4);

  const valueArc = gaugeArcPath(innerR, outerR, START_ANGLE, START_ANGLE + span * percent);
  let valueShadowPath: d3.Selection<SVGPathElement, unknown, null, undefined> | null = null;
  if (depthOn) {
    valueShadowPath = g
      .append("path")
      .attr("fill", shadeColor(activeColor, "shadow"))
      .attr("opacity", 0.75)
      .attr("d", valueArc);
  }
  const valuePath = g
    .append("path")
    .attr("fill", depthOn ? shadeColor(activeColor, "top") : activeColor)
    .attr("opacity", 0.95)
    .attr("d", valueArc);

  if (!prefersReducedMotion()) {
    const interp = d3.interpolateNumber(START_ANGLE, START_ANGLE + span * percent);
    const collapsed = gaugeArcPath(innerR, outerR, START_ANGLE, START_ANGLE);
    const tween = () => (t: number) => gaugeArcPath(innerR, outerR, START_ANGLE, interp(t));
    valuePath.attr("d", collapsed).transition().duration(motionDuration("enter")).ease(d3.easeCubicOut).attrTween("d", tween);
    valueShadowPath
      ?.attr("d", collapsed)
      .transition()
      .duration(motionDuration("enter"))
      .ease(d3.easeCubicOut)
      .attrTween("d", tween);
  }

  for (let i = 0; i <= tickCount; i += 1) {
    const t = i / tickCount;
    const angle = START_ANGLE + span * t - Math.PI / 2;
    const r0 = outerR + 2;
    const majorEvery = Math.max(1, Math.floor(tickCount / 2));
    const r1 = outerR + (i % majorEvery === 0 ? 8 : 5);
    g.append("line")
      .attr("x1", Math.cos(angle) * r0)
      .attr("y1", Math.sin(angle) * r0)
      .attr("x2", Math.cos(angle) * r1)
      .attr("y2", Math.sin(angle) * r1)
      .attr("stroke", theme.axisLine)
      .attr("stroke-width", 1)
      .attr("stroke-opacity", 0.85);
  }

  const pointerAngle = START_ANGLE + span * percent;
  const pointerLen = radius * VCDS.gauge.pointerLength;
  const pointer = g
    .append("line")
    .attr("x1", 0)
    .attr("y1", 0)
    .attr("x2", Math.cos(pointerAngle - Math.PI / 2) * pointerLen)
    .attr("y2", Math.sin(pointerAngle - Math.PI / 2) * pointerLen)
    .attr("stroke", pointerColor)
    .attr("stroke-width", 3)
    .attr("stroke-linecap", "round");

  if (!prefersReducedMotion()) {
    pointer
      .attr("x2", Math.cos(START_ANGLE - Math.PI / 2) * pointerLen)
      .attr("y2", Math.sin(START_ANGLE - Math.PI / 2) * pointerLen)
      .transition()
      .duration(motionDuration("enter"))
      .ease(d3.easeCubicOut)
      .attr("x2", Math.cos(pointerAngle - Math.PI / 2) * pointerLen)
      .attr("y2", Math.sin(pointerAngle - Math.PI / 2) * pointerLen);
  }

  g.append("circle").attr("r", 5).attr("fill", pointerColor);

  const statistic = options.statistic as { content?: { formatter?: () => string } } | undefined;
  const centerText =
    statistic?.content?.formatter?.() ??
    (usePercent
      ? formatChartValue(percent * 100, valueFormat ? { ...valueFormat, unit: "%" } : { type: "percent" })
      : formatChartValue(rawValue, valueFormat));

  if (showLabel) {
    g.append("text")
      .attr("y", radius * 0.35)
      .attr("text-anchor", "middle")
      .attr("fill", resolveLabelFill(theme, labelColor))
      .style("font-size", `${labelFontSize + 10}px`)
      .style("font-weight", "600")
      .text(centerText);
  }

  const tooltip = showTooltip ? createTooltipLayer(container, theme, tooltipPresentation) : null;
  const tipHtml = `<strong>${centerText}</strong><br/><span style="opacity:0.85">${formatChartValue(percent * 100, valueFormat ? { ...valueFormat, unit: "%" } : { type: "percent" })}</span>`;

  root
    .append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "transparent")
    .attr("cursor", onPointClick ? "pointer" : "default")
    .on("mousemove", (event) => {
      if (!tooltip) return;
      showSimpleTooltip(tooltip, container, event as MouseEvent, tipHtml, width);
    })
    .on("mouseleave", () => hideTooltip(tooltip))
    .on("click", () => onPointClick?.({ value: rawValue, percent }));

  return () => container.replaceChildren();
}
