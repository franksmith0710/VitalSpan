import * as d3 from "d3";
import { VCDS, motionDuration } from "@/components/charts/engine/d3/core/chartVisualTokens";
import { chartTransition, prefersReducedMotion } from "@/components/charts/engine/d3/core/animate";
import { drawPieExtrude } from "@/components/charts/engine/d3/core/depthEngine";
import { renderConfiguredInlineLegend } from "@/components/charts/engine/d3/core/d3Legend";
import { emitSeriesFocus } from "@/components/charts/engine/d3/core/interactionBus";
import { wirePlotSeriesLegendDimming } from "@/components/charts/engine/d3/core/legendInteraction";
import { morphPath } from "@/components/charts/engine/d3/core/motionEngine";
import { resolveLabelFill } from "@/components/charts/engine/d3/core/presentation";
import { resolveDatumColor } from "@/components/charts/engine/d3/core/series";
import {
  createTooltipLayer,
  hideTooltip,
  showMergedTooltip,
} from "@/components/charts/engine/d3/core/tooltipLayer";
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

function sliceKey(d: d3.PieArcDatum<D3Datum>, colorField: string): string {
  return String(d.data[colorField] ?? "");
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
    legendLayout,
    labelFontSize,
    labelColor,
    tooltipPresentation,
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
  const outerPercent = Number(options.__outerRadiusPercent ?? 70);
  const outerR = fractionRadius(options.radius, layout.maxR, outerPercent / 100);
  const padAngle = Number(options.__padAngle ?? PIE_PAD);
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
    .padAngle(padAngle > 0 ? (padAngle * Math.PI) / 180 : PIE_PAD);

  const arc = createArc();
  const tooltip = showTooltip ? createTooltipLayer(container, theme, tooltipPresentation) : null;
  const pieData = pie(data);

  const arcs = g
    .selectAll<SVGGElement, d3.PieArcDatum<D3Datum>>("g.slice")
    .data(pieData, (d) => sliceKey(d, colorField))
    .join("g")
    .attr("class", "slice")
    .attr("data-series-key", (d) => sliceKey(d, colorField));

  arcs.each(function (d) {
    const base = colorScale(sliceKey(d, colorField)) ?? colors[0] ?? "#465fff";
    const color = resolveDatumColor(Number(d.data[angleField] ?? 0), base, conditionalRules);
    drawPieExtrude(d3.select(this), arc(d), color);
  });

  const paths = arcs
    .selectAll<SVGPathElement, d3.PieArcDatum<D3Datum>>("path.slice-path")
    .data((d) => [d], (d) => sliceKey(d, colorField))
    .join("path")
    .attr("class", "slice-path")
    .attr("fill", (d) => {
      const base = colorScale(sliceKey(d, colorField)) ?? colors[0] ?? "#465fff";
      return resolveDatumColor(Number(d.data[angleField] ?? 0), base, conditionalRules);
    })
    .attr("stroke", "#fff")
    .attr("stroke-width", VCDS.pie.strokeWidth)
    .attr("cursor", onPointClick ? "pointer" : "default");

  paths.each(function (d) {
    const el = d3.select(this);
    const target = createArc()(d) ?? "";
    const existing = el.attr("d");
    if (existing && existing.length > 8 && motionDuration("dataUpdate") > 0) {
      morphPath(el, target);
      return;
    }
    if (prefersReducedMotion() || motionDuration("enter") <= 0) {
      el.attr("d", target);
      return;
    }
    const collapsed =
      createArc()
        .startAngle(d.startAngle)
        .endAngle(d.startAngle)(d) ?? "";
    el.attr("d", collapsed);
    chartTransition(el)
      .duration(motionDuration("enter"))
      .ease(d3.easeCubicOut)
      .attrTween("d", () => {
        const interp = d3.interpolateString(collapsed, target);
        return (t) => interp(t);
      });
  });

  paths
    .on("mouseenter", function (event, d) {
      chartTransition(d3.select(this))
        .duration(motionDuration("hover"))
        .attr("transform", () => {
          const [cx, cy] = createArc().centroid(d);
          const len = Math.hypot(cx, cy) || 1;
          return `translate(${(cx / len) * HOVER_EXPAND},${(cy / len) * HOVER_EXPAND})`;
        });
      if (!tooltip) return;
      const base = colorScale(sliceKey(d, colorField)) ?? colors[0] ?? "#465fff";
      const color = resolveDatumColor(Number(d.data[angleField] ?? 0), base, conditionalRules);
      showMergedTooltip(
        tooltip,
        container,
        event as MouseEvent,
        sliceKey(d, colorField),
        [{ name: "", color, value: d.data[angleField] }],
        valueFormat,
        width,
      );
    })
    .on("mousemove", (event, d) => {
      if (!tooltip) return;
      const base = colorScale(sliceKey(d, colorField)) ?? colors[0] ?? "#465fff";
      const color = resolveDatumColor(Number(d.data[angleField] ?? 0), base, conditionalRules);
      showMergedTooltip(
        tooltip,
        container,
        event as MouseEvent,
        sliceKey(d, colorField),
        [{ name: "", color, value: d.data[angleField] }],
        valueFormat,
        width,
      );
    })
    .on("mouseleave", function () {
      chartTransition(d3.select(this)).duration(motionDuration("hover")).attr("transform", null);
      hideTooltip(tooltip);
    })
    .on("click", (event, d) => {
      event.stopPropagation();
      emitSeriesFocus(sliceKey(d, colorField));
      onPointClick?.(d.data);
    });

  if (showLabel) {
    arcs
      .selectAll<SVGTextElement, d3.PieArcDatum<D3Datum>>("text.slice-label")
      .data((d) => [d], (d) => sliceKey(d, colorField))
      .join("text")
      .attr("class", "slice-label")
      .attr("transform", (d) => `translate(${labelArc.centroid(d)})`)
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", resolveLabelFill(theme, labelColor))
      .style("font-size", `${labelFontSize}px`)
      .text((d) => formatChartValue(d.data[angleField], valueFormat));
  }

  const legendCleanup = renderConfiguredInlineLegend(
    root,
    showLegend,
    data.map((row) => {
      const label = String(row[colorField] ?? "");
      return {
        label,
        color: colorScale(label) ?? colors[0] ?? "#465fff",
        seriesKey: label,
      };
    }),
    {
      width,
      height,
      margin: layout.margin,
      theme,
      layout: { ...legendLayout, position: layout.legendMode === "right" ? "right" : "top", orient: "vertical" },
      fontSize: legendLayout?.fontSize,
    },
  );

  const dimCleanup = wirePlotSeriesLegendDimming(g);

  return () => {
    dimCleanup();
    legendCleanup();
    container.replaceChildren();
  };
}
