import * as d3 from "d3";
import { prefersReducedMotion } from "@/components/charts/engine/d3/core/animate";
import { depthPieExtrudeOffset, resolveEffectiveDepth, shadeColor } from "@/components/charts/engine/d3/core/depthEngine";
import { radialMargin } from "@/components/charts/engine/d3/core/margin";
import type { D3RenderConfig } from "@/components/charts/engine/d3/types";
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

export function renderD3LiquidChart(container: HTMLElement, config: D3RenderConfig): () => void {
  container.replaceChildren();

  const { width, height, colors, theme, showLabel, showTooltip, labelFontSize, valueFormat, options } = config;
  const rawValue = Number(options.rawValue ?? NaN);
  const percent = Math.min(1, Math.max(0, Number(options.percent ?? 0)));
  const usePercent = Number.isFinite(rawValue) ? rawValue <= 100 : true;

  if (width <= 0 || height <= 0) return () => undefined;

  const margin = radialMargin(false);
  const innerW = Math.max(0, width - margin.left - margin.right);
  const innerH = Math.max(0, height - margin.top - margin.bottom);
  const cx = margin.left + innerW / 2;
  const cy = margin.top + innerH / 2;
  const radius = Math.min(innerW, innerH) * 0.38;
  const fillColor = colors[0] ?? "#465fff";
  const depthLevel = resolveEffectiveDepth();
  const depthOn = depthLevel !== "off";
  const depthOffset = depthPieExtrudeOffset(depthLevel);
  const clipId = `d3-liquid-clip-${Math.random().toString(36).slice(2, 9)}`;

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
    .attr("stroke-width", 1.5);

  const fillLevel = cy + radius - percent * radius * 2;
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
      .text(
        usePercent
          ? formatChartValue(percent * 100, valueFormat ? { ...valueFormat, unit: "%" } : { type: "percent" })
          : formatChartValue(rawValue, valueFormat),
      );
  }

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
      .append("circle")
      .attr("cx", cx)
      .attr("cy", cy)
      .attr("r", radius)
      .attr("fill", "transparent")
      .style("cursor", "default")
      .on("mousemove", (event) => {
        tip
          .style("opacity", "1")
          .text(
            usePercent
              ? formatChartValue(percent * 100, valueFormat)
              : formatChartValue(rawValue, valueFormat),
          );
        const rect = container.getBoundingClientRect();
        tip
          .style("left", `${event.clientX - rect.left + 10}px`)
          .style("top", `${event.clientY - rect.top - 28}px`);
      })
      .on("mouseleave", () => tip.style("opacity", "0"));
  }

  return () => container.replaceChildren();
}
