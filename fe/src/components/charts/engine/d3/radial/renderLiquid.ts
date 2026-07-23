import * as d3 from "d3";
import { VCDS, motionDuration } from "@/components/charts/engine/d3/core/chartVisualTokens";
import { prefersReducedMotion } from "@/components/charts/engine/d3/core/animate";
import { depthPieExtrudeOffset, resolveEffectiveDepth, shadeColor } from "@/components/charts/engine/d3/core/depthEngine";
import { radialMargin } from "@/components/charts/engine/d3/core/margin";
import {
  createTooltipLayer,
  hideTooltip,
  showSimpleTooltip,
  formatChartValue,
} from "@/components/charts/engine/d3/core/tooltipLayer";
import type { D3RenderConfig } from "@/components/charts/engine/d3/types";

const WAVE_AMPLITUDE = 0.06;
const WAVE_STEP = 8;
const WAVE_CYCLE_MS = 2400;

function wavePath(width: number, amplitude: number, phase: number): string {
  const mid = width / 2;
  let d = `M ${-mid} 0`;
  for (let x = -mid; x <= mid; x += WAVE_STEP) {
    const y = Math.sin((x / width) * Math.PI * 2 + phase) * amplitude;
    d += ` L ${x} ${y}`;
  }
  d += ` L ${mid} ${mid * 2} L ${-mid} ${mid * 2} Z`;
  return d;
}

export function renderD3LiquidChart(container: HTMLElement, config: D3RenderConfig): () => void {
  container.replaceChildren();

  const { width, height, colors, theme, showLabel, showTooltip, labelFontSize, valueFormat, options } = config;
  const rawValue = Number(options.rawValue ?? NaN);
  const percent = Math.min(1, Math.max(0, Number(options.percent ?? 0)));
  const usePercent = Number.isFinite(rawValue) ? rawValue <= 100 : true;
  const targetValue = Number(options.__liquidTarget ?? NaN);
  const outlineWidth = Number(options.__liquidOutlineWidth ?? 1.5);
  const waveColor = String(options.__liquidWaveColor ?? "");

  if (width <= 0 || height <= 0) return () => undefined;

  const margin = radialMargin(false);
  const innerW = Math.max(0, width - margin.left - margin.right);
  const innerH = Math.max(0, height - margin.top - margin.bottom);
  const cx = margin.left + innerW / 2;
  const cy = margin.top + innerH / 2;
  const radius = Math.min(innerW, innerH) * 0.38;
  const fillColor = waveColor || (colors[0] ?? "#465fff");
  const depthLevel = resolveEffectiveDepth();
  const depthOn = depthLevel !== "off";
  const depthOffset = depthPieExtrudeOffset(depthLevel);
  const clipId = `d3-liquid-clip-${Math.random().toString(36).slice(2, 9)}`;
  const targetFillLevel = cy + radius - percent * radius * 2;
  const bottomLevel = cy + radius;

  const root = d3
    .select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("role", "img");

  const defs = root.append("defs");
  defs
    .append("clipPath")
    .attr("id", clipId)
    .append("circle")
    .attr("cx", cx)
    .attr("cy", cy)
    .attr("r", radius);

  root
    .append("circle")
    .attr("cx", cx)
    .attr("cy", cy)
    .attr("r", radius)
    .attr("fill", theme.gridLine)
    .attr("stroke", theme.axisLine)
    .attr("stroke-width", outlineWidth);

  if (Number.isFinite(targetValue) && targetValue > 0) {
    const targetPercent = Math.min(1, Math.max(0, targetValue / 100));
    const targetY = cy + radius - targetPercent * radius * 2;
    root
      .append("line")
      .attr("x1", cx - radius)
      .attr("x2", cx + radius)
      .attr("y1", targetY)
      .attr("y2", targetY)
      .attr("stroke", theme.accent)
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", VCDS.grid.dash)
      .attr("clip-path", `url(#${clipId})`);
  }

  const waveG = root.append("g").attr("clip-path", `url(#${clipId})`);
  let fillLevel = prefersReducedMotion() ? targetFillLevel : bottomLevel;

  const shadowTransform =
    depthOn && depthOffset > 0
      ? () => `translate(${cx + depthOffset * 0.6},${fillLevel + depthOffset})`
      : null;

  const shadowWave =
    depthOn && shadowTransform
      ? waveG
          .append("path")
          .attr("class", "vs-liquid-extrude")
          .attr("fill", shadeColor(fillColor, "shadow"))
          .attr("opacity", 0.45)
          .attr("transform", shadowTransform())
      : null;

  const wave = waveG
    .append("path")
    .attr("fill", depthOn ? shadeColor(fillColor, "top") : fillColor)
    .attr("opacity", 0.88)
    .attr("transform", `translate(${cx},${fillLevel})`);

  const waveAmp = radius * WAVE_AMPLITUDE;
  const updateWave = (phase: number) => {
    const d = wavePath(radius * 2.2, waveAmp, phase);
    wave.attr("d", d);
    shadowWave?.attr("d", d);
  };
  updateWave(0);

  const fillRect = waveG
    .append("rect")
    .attr("x", cx - radius)
    .attr("y", fillLevel)
    .attr("width", radius * 2)
    .attr("height", cy + radius - fillLevel)
    .attr("fill", depthOn ? shadeColor(fillColor, "top") : fillColor)
    .attr("opacity", 0.88);

  if (depthOn && depthOffset > 0) {
    waveG
      .append("rect")
      .attr("class", "vs-liquid-extrude")
      .attr("x", cx - radius + depthOffset * 0.6)
      .attr("y", fillLevel + depthOffset)
      .attr("width", radius * 2)
      .attr("height", cy + radius - fillLevel)
      .attr("fill", shadeColor(fillColor, "shadow"))
      .attr("opacity", 0.45);
  }

  const applyFillLevel = (level: number) => {
    fillLevel = level;
    wave.attr("transform", `translate(${cx},${level})`);
    shadowWave?.attr("transform", shadowTransform?.() ?? null);
    fillRect.attr("y", level).attr("height", Math.max(0, cy + radius - level));
  };

  if (!prefersReducedMotion() && motionDuration("enter") > 0) {
    d3.transition()
      .duration(motionDuration("enter"))
      .ease(d3.easeCubicOut)
      .tween("liquid-rise", () => {
        const interp = d3.interpolateNumber(bottomLevel, targetFillLevel);
        return (t) => applyFillLevel(interp(t));
      });
  } else {
    applyFillLevel(targetFillLevel);
  }

  if (!prefersReducedMotion()) {
    const cycle = WAVE_CYCLE_MS;
    wave
      .transition()
      .duration(cycle)
      .ease(d3.easeLinear)
      .on("start", function repeat() {
        d3.active(this)
          ?.transition()
          .duration(cycle)
          .ease(d3.easeLinear)
          .attrTween("transform", () => {
            const interp = d3.interpolateNumber(0, Math.PI * 2);
            return (t) => {
              updateWave(interp(t));
              return `translate(${cx},${fillLevel})`;
            };
          })
          .on("end", repeat);
      });
  }

  const displayText = usePercent
    ? formatChartValue(percent * 100, valueFormat ? { ...valueFormat, unit: "%" } : { type: "percent" })
    : formatChartValue(rawValue, valueFormat);

  if (showLabel) {
    root
      .append("text")
      .attr("x", cx)
      .attr("y", cy)
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", theme.legendText)
      .style("font-size", `${labelFontSize + 4}px`)
      .style("font-weight", "600")
      .text(displayText);
  }

  const tooltip = showTooltip ? createTooltipLayer(container, theme, config.tooltipPresentation) : null;
  const tipHtml = `<strong>${displayText}</strong>`;

  root
    .append("circle")
    .attr("cx", cx)
    .attr("cy", cy)
    .attr("r", radius)
    .attr("fill", "transparent")
    .style("cursor", "default")
    .on("mousemove", (event) => {
      if (!tooltip) return;
      showSimpleTooltip(tooltip, container, event as MouseEvent, tipHtml, width);
    })
    .on("mouseleave", () => hideTooltip(tooltip));

  return () => container.replaceChildren();
}
