import * as d3 from "d3";
import { prefersReducedMotion } from "@/components/charts/engine/d3/core/animate";
import { depthPieExtrudeOffset, resolveEffectiveDepth, shadeColor } from "@/components/charts/engine/d3/core/depthEngine";
import { radialMargin } from "@/components/charts/engine/d3/core/margin";
import { createTooltip } from "@/components/charts/engine/d3/core/tooltip";
import type { D3RenderConfig } from "@/components/charts/engine/d3/types";
import { resolveLiquidPercent } from "@/lib/applyChartDeStyleBlocks";
import { DEFAULT_LIQUID_SIZE } from "@/lib/chartDeStyleBlocks";
import { formatChartValue } from "@/lib/chartValueFormat";

function wavePath(width: number, amplitude: number, phase: number): string {
  const mid = width / 2;
  let d = `M ${-mid} 0`;
  for (let x = -mid; x <= mid; x += 8) {
    const y = Math.sin((x / width) * Math.PI * 2 + phase) * amplitude;
    d += ` L ${x} ${y}`;
  }
  d += ` L ${mid} ${mid * 2} L ${-mid} ${mid * 2} Z`;
  return d;
}

function liquidPercentLabel(
  labelPercent: number,
  valueFormat: D3RenderConfig["valueFormat"],
): string {
  // formatMetricValue(percent) 内部已 ×100，勿再传 labelPercent*100
  return formatChartValue(
    labelPercent,
    valueFormat ? { ...valueFormat, type: "percent" } : { type: "percent" },
  );
}

export function renderD3LiquidChart(container: HTMLElement, config: D3RenderConfig): () => void {
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
    tooltipPresentation,
    options,
  } = config;
  const rawValue = Number(options.rawValue ?? NaN);
  const resolved =
    options.__liquidFillPercent != null && options.__liquidLabelPercent != null
      ? {
          fillPercent: Number(options.__liquidFillPercent),
          labelPercent: Number(options.__liquidLabelPercent),
          max: Number(options.__liquidMax ?? rawValue),
        }
      : resolveLiquidPercent(options, rawValue);
  const { fillPercent, labelPercent } = resolved;
  const outlineWidth = Number(options.__liquidOutlineWidth ?? 1.5);
  const waveColor = String(options.__liquidWaveColor ?? "");
  const liquidSize = Number(options.__liquidSize ?? DEFAULT_LIQUID_SIZE);

  if (width <= 0 || height <= 0) return () => undefined;

  const margin = radialMargin(false);
  const innerW = Math.max(0, width - margin.left - margin.right);
  const innerH = Math.max(0, height - margin.top - margin.bottom);
  const cx = margin.left + innerW / 2;
  const cy = margin.top + innerH / 2;
  const radius = Math.min(innerW, innerH) * (liquidSize / 100) * 0.5;
  const fillColor = waveColor || (colors[0] ?? "#465fff");
  const depthLevel = resolveEffectiveDepth();
  const depthOn = depthLevel !== "off";
  const depthOffset = depthPieExtrudeOffset(depthLevel);
  const clipId = `d3-liquid-clip-${Math.random().toString(36).slice(2, 9)}`;
  const percentLabel = liquidPercentLabel(labelPercent, valueFormat);

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

  const fillLevel = cy + radius - fillPercent * radius * 2;
  const waveG = root.append("g").attr("clip-path", `url(#${clipId})`);

  const shadowTransform =
    depthOn && depthOffset > 0
      ? `translate(${cx + depthOffset * 0.6},${fillLevel + depthOffset})`
      : null;
  const shadowWave =
    depthOn && shadowTransform
      ? waveG
          .append("path")
          .attr("class", "vs-liquid-extrude")
          .attr("fill", shadeColor(fillColor, "shadow"))
          .attr("opacity", 0.45)
          .attr("transform", shadowTransform)
      : null;

  const wave = waveG
    .append("path")
    .attr("fill", depthOn ? shadeColor(fillColor, "top") : fillColor)
    .attr("opacity", 0.88)
    .attr("transform", `translate(${cx},${fillLevel})`);

  const updateWave = (phase: number) => {
    const d = wavePath(radius * 2.2, radius * 0.06, phase);
    wave.attr("d", d);
    shadowWave?.attr("d", d);
  };
  updateWave(0);

  if (depthOn && shadowTransform) {
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

  waveG
    .append("rect")
    .attr("x", cx - radius)
    .attr("y", fillLevel)
    .attr("width", radius * 2)
    .attr("height", cy + radius - fillLevel)
    .attr("fill", depthOn ? shadeColor(fillColor, "top") : fillColor)
    .attr("opacity", 0.88);

  if (!prefersReducedMotion()) {
    const tween = d3.transition().duration(2400).ease(d3.easeLinear);
    wave
      .transition(tween)
      .on("start", function repeat() {
        d3.active(this)
          ?.transition()
          .duration(2400)
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
      .text(percentLabel);
  }

  if (showTooltip) {
    const tip = createTooltip(container, theme, tooltipPresentation);

    root
      .append("circle")
      .attr("cx", cx)
      .attr("cy", cy)
      .attr("r", radius)
      .attr("fill", "transparent")
      .style("cursor", "default")
      .on("mousemove", (event) => {
        tip.style("opacity", "1").text(percentLabel);
        const rect = container.getBoundingClientRect();
        tip
          .style("left", `${event.clientX - rect.left + 10}px`)
          .style("top", `${event.clientY - rect.top - 28}px`);
      })
      .on("mouseleave", () => tip.style("opacity", "0"));
  }

  return () => container.replaceChildren();
}
