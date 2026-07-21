import * as d3 from "d3";
import { VCDS } from "@/components/charts/engine/d3/core/chartVisualTokens";
import { prefersReducedMotion } from "@/components/charts/engine/d3/core/animate";
import { resolveDatumColor } from "@/components/charts/engine/d3/core/series";
import { createTooltip, tooltipHtml } from "@/components/charts/engine/d3/core/tooltip";
import type { D3Datum, D3RenderConfig } from "@/components/charts/engine/d3/types";
import { formatChartValue } from "@/lib/chartValueFormat";
import { computePieLayout, PIE_RADIUS_FRAC_DEFAULT } from "./pieLayout";

const PIE_PAD = VCDS.pie.padAngle;
const HOVER_EXPAND = VCDS.pie.hoverOffset;

function fractionRadius(value: unknown, base: number, fallback = PIE_RADIUS_FRAC_DEFAULT): number {
  if (typeof value === "number") return value * base;
  if (typeof value === "string" && value.endsWith("%")) {
    return (parseFloat(value) / 100) * base;
  }
  return fallback * base;
}

function resolveInnerFrac(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.endsWith("%")) {
    return parseFloat(value) / 100;
  }
  return 0;
}

export function renderD3PieChart(container: HTMLElement, config: D3RenderConfig): () => void {
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
    onPointClick,
    options,
  } = config;

  const data = (options.data as D3Datum[]) ?? [];
  const angleField = String(options.angleField ?? "value");
  const colorField = String(options.colorField ?? "type");
  const roseType = options.roseType as string | undefined;
  const isRose = roseType === "radius";

  if (width <= 0 || height <= 0 || data.length === 0) return () => undefined;

  const layout = computePieLayout(width, height, showLegend);
  const outerR = fractionRadius(options.radius, layout.maxR, PIE_RADIUS_FRAC_DEFAULT);
  const innerFrac = resolveInnerFrac(options.innerRadius);
  const innerR = outerR * innerFrac;
  const maxValue = d3.max(data, (d) => Number(d[angleField] ?? 0)) ?? 1;

  const createArc = () =>
    d3
      .arc<d3.PieArcDatum<D3Datum>>()
      .innerRadius(innerR)
      .outerRadius((d) => {
        if (!isRose) return outerR;
        const v = Number(d.data[angleField] ?? 0);
        return innerR + ((outerR - innerR) * v) / (maxValue || 1);
      });

  const labelArc = d3
    .arc<d3.PieArcDatum<D3Datum>>()
    .innerRadius((outerR + innerR) / 2)
    .outerRadius((outerR + innerR) / 2);

  const colorScale = d3
    .scaleOrdinal<string>()
    .domain(data.map((d) => String(d[colorField] ?? "")))
    .range(colors);

  const root = d3
    .select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("role", "img")
    .style("overflow", "visible");

  const g = root.append("g").attr("transform", `translate(${layout.cx},${layout.cy})`);

  const pie = d3
    .pie<D3Datum>()
    .value((d) => (isRose ? 1 : Number(d[angleField] ?? 0)))
    .sort(null)
    .padAngle(PIE_PAD);

  const arc = createArc();

  const tooltip = showTooltip ? createTooltip(container, theme) : null;
  const arcs = g.selectAll<SVGGElement, d3.PieArcDatum<D3Datum>>("g.slice").data(pie(data)).join("g").attr("class", "slice");

  arcs
    .append("path")
    .attr("fill", (d) => {
      const base = colorScale(String(d.data[colorField] ?? "")) ?? colors[0] ?? "#465fff";
      return resolveDatumColor(Number(d.data[angleField] ?? 0), base, conditionalRules);
    })
    .attr("stroke", "#fff")
    .attr("stroke-width", VCDS.pie.strokeWidth)
    .attr("cursor", onPointClick ? "pointer" : "default")
    .attr("d", arc)
    .each(function (d) {
      if (prefersReducedMotion()) return;
      const el = d3.select(this);
      const target = createArc()(d) ?? "";
      const collapsed =
        createArc()
          .startAngle(d.startAngle)
          .endAngle(d.startAngle)(d) ?? "";
      el.attr("d", collapsed).transition().duration(680).ease(d3.easeCubicOut).attr("d", target);
    })
    .on("mouseenter", function (_event, d) {
      d3.select(this).transition().duration(120).attr("transform", () => {
        const [cx, cy] = createArc().centroid(d);
        const len = Math.hypot(cx, cy) || 1;
        return `translate(${(cx / len) * HOVER_EXPAND},${(cy / len) * HOVER_EXPAND})`;
      });
      if (!tooltip) return;
      const base = colorScale(String(d.data[colorField] ?? "")) ?? colors[0] ?? "#465fff";
      const color = resolveDatumColor(Number(d.data[angleField] ?? 0), base, conditionalRules);
      tooltip
        .style("opacity", "1")
        .html(
          tooltipHtml(String(d.data[colorField] ?? ""), [
            { name: "", color, value: d.data[angleField] },
          ], valueFormat),
        );
    })
    .on("mousemove", (event) => {
      if (!tooltip) return;
      const rect = container.getBoundingClientRect();
      tooltip
        .style("left", `${Math.min(event.clientX - rect.left + 12, width - 160)}px`)
        .style("top", `${Math.max(event.clientY - rect.top - 48, 8)}px`);
    })
    .on("mouseleave", function () {
      d3.select(this).transition().duration(120).attr("transform", null);
      tooltip?.style("opacity", "0");
    })
    .on("click", (_event, d) => onPointClick?.(d.data));

  if (showLabel) {
    arcs
      .append("text")
      .attr("transform", (d) => `translate(${labelArc.centroid(d)})`)
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", theme.axisLabel)
      .style("font-size", `${labelFontSize}px`)
      .text((d) => formatChartValue(d.data[angleField], valueFormat));
  }

  if (showLegend) {
    const legend = root.append("g");
    if (layout.legendMode === "right" && layout.legendBox) {
      legend.attr("transform", `translate(${layout.legendBox.x},${layout.legendBox.y})`);
      let offsetY = 0;
      for (const row of data) {
        const label = String(row[colorField] ?? "");
        const color = colorScale(label) ?? colors[0] ?? "#465fff";
        const item = legend.append("g").attr("transform", `translate(0,${offsetY})`);
        item.append("rect").attr("width", 10).attr("height", 10).attr("rx", 2).attr("fill", color);
        item
          .append("text")
          .attr("x", 14)
          .attr("y", 9)
          .attr("fill", theme.legendText)
          .style("font-size", "11px")
          .text(label);
        offsetY += 18;
      }
    } else {
      legend.attr("transform", `translate(${layout.margin.left},${layout.margin.top - 16})`);
      let offsetX = 0;
      for (const row of data) {
        const label = String(row[colorField] ?? "");
        const color = colorScale(label) ?? colors[0] ?? "#465fff";
        const item = legend.append("g").attr("transform", `translate(${offsetX},0)`);
        item.append("rect").attr("width", 10).attr("height", 10).attr("rx", 2).attr("fill", color);
        item
          .append("text")
          .attr("x", 14)
          .attr("y", 9)
          .attr("fill", theme.legendText)
          .style("font-size", "11px")
          .text(label);
        offsetX += label.length * 7 + 28;
      }
    }
  }

  return () => container.replaceChildren();
}
