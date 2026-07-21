import * as d3 from "d3";
import { prefersReducedMotion } from "@/components/charts/engine/d3/core/animate";
import { depthExtrudePx, resolveEffectiveDepth, shadeColor } from "@/components/charts/engine/d3/core/depthEngine";
import { radialMargin } from "@/components/charts/engine/d3/core/margin";
import { resolveDatumColor } from "@/components/charts/engine/d3/core/series";
import { createTooltip, tooltipHtml } from "@/components/charts/engine/d3/core/tooltip";
import { renderConfiguredInlineLegend } from "@/components/charts/engine/d3/core/d3Legend";
import type { D3Datum, D3RenderConfig } from "@/components/charts/engine/d3/types";
import { formatChartValue } from "@/lib/chartValueFormat";

type FunnelRow = { stage: string; number: number };

function trapezoidPath(
  cx: number,
  topY: number,
  bottomY: number,
  topW: number,
  bottomW: number,
): string {
  const tHalf = topW / 2;
  const bHalf = bottomW / 2;
  return `M ${cx - tHalf} ${topY} L ${cx + tHalf} ${topY} L ${cx + bHalf} ${bottomY} L ${cx - bHalf} ${bottomY} Z`;
}

export function renderD3FunnelChart(container: HTMLElement, config: D3RenderConfig): () => void {
  container.replaceChildren();

  const {
    width,
    height,
    colors,
    theme,
    showLabel,
    showTooltip,
    showLegend,
    labelFontSize,
    valueFormat,
    conditionalRules = [],
    legendLayout,
    onPointClick,
    options,
    depthVisual,
  } = config;

  const depthLevel = resolveEffectiveDepth(depthVisual);
  const extrude = depthExtrudePx(depthLevel);

  const xField = String(options.xField ?? "stage");
  const yField = String(options.yField ?? "number");
  const raw = (options.data as D3Datum[]) ?? [];
  const data: FunnelRow[] = raw
    .map((row) => ({ stage: String(row[xField] ?? ""), number: Number(row[yField] ?? 0) }))
    .sort((a, b) => b.number - a.number);

  if (width <= 0 || height <= 0 || data.length === 0) return () => undefined;

  const margin = radialMargin(showLegend);
  const innerW = Math.max(0, width - margin.left - margin.right);
  const innerH = Math.max(0, height - margin.top - margin.bottom);
  const cx = margin.left + innerW / 2;
  const maxVal = d3.max(data, (d) => d.number) ?? 1;
  const layerH = innerH / data.length;
  const maxWidth = innerW * 0.82;

  const root = d3
    .select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("role", "img");

  const g = root.append("g");
  const tooltip = showTooltip ? createTooltip(container, theme) : null;
  const colorScale = d3.scaleOrdinal<string>().domain(data.map((d) => d.stage)).range(colors);

  data.forEach((row, index) => {
    const topW = (row.number / maxVal) * maxWidth;
    const next = data[index + 1];
    const bottomW = next ? (next.number / maxVal) * maxWidth : topW * 0.72;
    const topY = margin.top + index * layerH;
    const bottomY = topY + layerH - 2;
    const baseColor = colorScale(row.stage) ?? colors[index % colors.length] ?? "#465fff";
    const fill = resolveDatumColor(row.number, baseColor, conditionalRules);

    if (extrude > 0) {
      g.insert("path", ":first-child")
        .attr("class", "vs-funnel-side")
        .attr(
          "d",
          trapezoidPath(
            cx + extrude * 0.55,
            topY + extrude * 0.35,
            bottomY + extrude * 0.35,
            topW,
            bottomW,
          ),
        )
        .attr("fill", shadeColor(fill, "side"))
        .attr("opacity", 0.88)
        .attr("pointer-events", "none");
    }

    const path = g
      .append("path")
      .attr("d", trapezoidPath(cx, topY, bottomY, topW, bottomW))
      .attr("fill", fill)
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .attr("opacity", 0.94)
      .attr("cursor", onPointClick ? "pointer" : "default");

    if (!prefersReducedMotion()) {
      const collapsed = trapezoidPath(cx, topY, topY, 0, 0);
      path.attr("d", collapsed).transition().duration(560).delay(index * 60).ease(d3.easeCubicOut).attr("d", trapezoidPath(cx, topY, bottomY, topW, bottomW));
    }

    path
      .on("mouseenter", () => {
        path.transition().duration(120).attr("opacity", 1);
        if (!tooltip) return;
        tooltip
          .style("opacity", "1")
          .html(tooltipHtml(row.stage, [{ name: "", color: fill, value: row.number }], valueFormat));
      })
      .on("mousemove", (event) => {
        if (!tooltip) return;
        const rect = container.getBoundingClientRect();
        tooltip
          .style("left", `${Math.min(event.clientX - rect.left + 12, width - 160)}px`)
          .style("top", `${Math.max(event.clientY - rect.top - 48, 8)}px`);
      })
      .on("mouseleave", () => {
        path.transition().duration(120).attr("opacity", 0.94);
        tooltip?.style("opacity", "0");
      })
      .on("click", () => onPointClick?.({ [xField]: row.stage, [yField]: row.number }));

    if (showLabel) {
      g.append("text")
        .attr("x", cx)
        .attr("y", (topY + bottomY) / 2)
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("fill", theme.legendText)
        .style("font-size", `${labelFontSize}px`)
        .style("pointer-events", "none")
        .text(`${row.stage} · ${formatChartValue(row.number, valueFormat)}`);
    }
  });

  if (showLegend) {
    renderConfiguredInlineLegend(
      root,
      true,
      data.map((row, index) => ({
        label: row.stage,
        color: colorScale(row.stage) ?? colors[index % colors.length] ?? "#465fff",
      })),
      { width, height, margin, theme, layout: legendLayout, fontSize: legendLayout?.fontSize },
    );
  }

  return () => container.replaceChildren();
}
