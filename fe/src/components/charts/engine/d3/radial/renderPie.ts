import * as d3 from "d3";
import { VCDS } from "@/components/charts/engine/d3/core/chartVisualTokens";
import { prefersReducedMotion } from "@/components/charts/engine/d3/core/animate";
import { drawPieExtrude } from "@/components/charts/engine/d3/core/depthEngine";
import { resolveDatumColor } from "@/components/charts/engine/d3/core/series";
import { resolveLabelFill } from "@/components/charts/engine/d3/core/presentation";
import { createTooltip, tooltipHtml } from "@/components/charts/engine/d3/core/tooltip";
import type { D3Datum, D3RenderConfig } from "@/components/charts/engine/d3/types";
import { DEFAULT_PIE_OUTER_RADIUS_PERCENT } from "@/lib/chartDeStyleBlocks";
import { renderConfiguredInlineLegend, type D3LegendItem } from "@/components/charts/engine/d3/core/d3Legend";
import { computePieLayout, PIE_RADIUS_FRAC_DEFAULT } from "./pieLayout";
import {
  formatPieSliceLabel,
  formatPieTooltipValue,
  layoutPieOutsideLabels,
  pieArcLayoutKey,
  pieOutsideLabelBounds,
  resolvePieLabelRenderOptions,
  type PieLabelRenderOptions,
} from "./pieLabels";

const HOVER_EXPAND = VCDS.pie.hoverOffset;

function resolveOutsideLabelHalo(theme: D3RenderConfig["theme"]): string {
  const label = theme.axisLabel.toLowerCase();
  if (label.startsWith("#") && label.length >= 7) {
    const r = parseInt(label.slice(1, 3), 16);
    const g = parseInt(label.slice(3, 5), 16);
    const b = parseInt(label.slice(5, 7), 16);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.62 ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.88)";
  }
  return "rgba(255,255,255,0.88)";
}

function resolvePiePadAngleRad(padAngleDeg: number | undefined): number {
  if (padAngleDeg == null || padAngleDeg <= 0) return 0;
  return (padAngleDeg * Math.PI) / 180;
}

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

function drawPieLabels(
  arcs: d3.Selection<SVGGElement, d3.PieArcDatum<D3Datum>, SVGGElement, unknown>,
  opts: {
    labelArc: d3.Arc<d3.PieArcDatum<D3Datum>, d3.PieArcDatum<D3Datum>>;
    outerR: number;
    colorField: string;
    angleField: string;
    labelOpts: PieLabelRenderOptions;
    total: number;
    valueFormat: D3RenderConfig["valueFormat"];
    labelFontSize: number;
    labelColor: string | undefined;
    theme: D3RenderConfig["theme"];
    sliceColor: (row: D3Datum) => string;
  },
): void {
  const fill = resolveLabelFill(opts.theme, opts.labelColor);
  const labelHalo = resolveOutsideLabelHalo(opts.theme);

  if (opts.labelOpts.position === "outside") {
    const candidates = arcs
      .data()
      .map((d) => {
        const text = formatPieSliceLabel(
          d.data as Record<string, unknown>,
          opts.colorField,
          opts.angleField,
          opts.total,
          opts.labelOpts,
          opts.valueFormat,
        );
        if (!text) return null;
        const midAngle = d.startAngle + (d.endAngle - d.startAngle) / 2;
        return {
          key: pieArcLayoutKey(d.startAngle, d.endAngle),
          midAngle,
          sliceAngle: d.endAngle - d.startAngle,
          text,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row != null);

    const placed = layoutPieOutsideLabels(
      candidates,
      opts.outerR,
      opts.labelFontSize,
      pieOutsideLabelBounds(opts.outerR),
    );

    arcs.each(function (d) {
      const layout = placed.get(pieArcLayoutKey(d.startAngle, d.endAngle));
      if (!layout?.visible) return;

      const group = d3.select(this);
      const sliceFill = opts.sliceColor(d.data);
      group
        .append("polyline")
        .attr("points", layout.points)
        .attr("fill", "none")
        .attr("stroke", sliceFill)
        .attr("stroke-width", 1)
        .attr("opacity", 0.9);
      group
        .append("text")
        .attr("x", layout.textX)
        .attr("y", layout.textY)
        .attr("text-anchor", layout.anchor)
        .attr("dy", "0")
        .style("dominant-baseline", "central")
        .attr("fill", fill)
        .style("font-size", `${opts.labelFontSize}px`)
        .style("paint-order", "stroke fill")
        .style("stroke", labelHalo)
        .style("stroke-width", "3px")
        .style("stroke-linejoin", "round")
        .text(layout.text);
    });
    return;
  }

  arcs.each(function (d) {
    const text = formatPieSliceLabel(
      d.data as Record<string, unknown>,
      opts.colorField,
      opts.angleField,
      opts.total,
      opts.labelOpts,
      opts.valueFormat,
    );
    if (!text) return;

    const group = d3.select(this);
    group
      .append("text")
      .attr("transform", `translate(${opts.labelArc.centroid(d)})`)
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", fill)
      .style("font-size", `${opts.labelFontSize}px`)
      .text(text);
  });
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

  const colorScale = d3
    .scaleOrdinal<string>()
    .domain(data.map((d) => String(d[colorField] ?? "")))
    .range(colors);
  const legendItems: D3LegendItem[] = data.map((row) => ({
    label: String(row[colorField] ?? ""),
    color: colorScale(String(row[colorField] ?? "")) ?? colors[0] ?? "#465fff",
  }));

  const layout = computePieLayout(
    width,
    height,
    showLegend,
    legendLayout,
    legendItems,
    options.__pieLabelPosition === "outside",
  );
  const legendFontSize = legendLayout?.fontSize ?? 11;
  const outerPercent = Number(options.__outerRadiusPercent ?? DEFAULT_PIE_OUTER_RADIUS_PERCENT);
  const outerR =
    options.__outerRadiusPercent != null
      ? layout.maxR * (outerPercent / 100)
      : fractionRadius(options.radius, layout.maxR, outerPercent / 100);
  const padAngleRad = resolvePiePadAngleRad(
    options.__padAngle != null ? Number(options.__padAngle) : undefined,
  );
  const sliceStroke = padAngleRad > 0;
  const fillOpacity = Math.min(1, Math.max(0, Number(options.__fillOpacity ?? 1)));
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
    .padAngle(padAngleRad);

  const arc = createArc();
  const total = d3.sum(data, (row) => Number(row[angleField] ?? 0));
  const labelOpts: PieLabelRenderOptions = resolvePieLabelRenderOptions({
    position: options.__pieLabelPosition === "outside" ? "outside" : "inside",
    showDimension: options.__pieShowDimension,
    showIndicator: options.__pieShowIndicator,
    showPercent: options.__pieShowPercent,
    percentDecimals: Number(options.__piePercentDecimals ?? 2),
  });

  const tooltip = showTooltip ? createTooltip(container, theme, tooltipPresentation) : null;
  const arcs = g.selectAll<SVGGElement, d3.PieArcDatum<D3Datum>>("g.slice").data(pie(data)).join("g").attr("class", "slice");

  arcs.each(function (d) {
    const base = colorScale(String(d.data[colorField] ?? "")) ?? colors[0] ?? "#465fff";
    const color = resolveDatumColor(Number(d.data[angleField] ?? 0), base, conditionalRules);
    drawPieExtrude(d3.select(this), arc(d), color);
  });

  arcs
    .append("path")
    .attr("fill", (d) => {
      const base = colorScale(String(d.data[colorField] ?? "")) ?? colors[0] ?? "#465fff";
      return resolveDatumColor(Number(d.data[angleField] ?? 0), base, conditionalRules);
    })
    .attr("fill-opacity", fillOpacity)
    .attr("stroke", sliceStroke ? "#fff" : "none")
    .attr("stroke-width", sliceStroke ? VCDS.pie.strokeWidth : 0)
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
            {
              name: angleField,
              color,
              value: formatPieTooltipValue(
                d.data[angleField],
                total,
                valueFormat,
                labelOpts.percentDecimals,
              ),
            },
          ]),
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
    drawPieLabels(arcs, {
      labelArc,
      outerR,
      colorField,
      angleField,
      labelOpts,
      total,
      valueFormat,
      labelFontSize,
      labelColor,
      theme,
      sliceColor: (row) =>
        colorScale(String(row[colorField] ?? "")) ?? colors[0] ?? "#465fff",
    });
  }

  if (showLegend) {
    if (layout.legendMode === "right" && layout.legendBox) {
      const legend = root.append("g").attr("transform", `translate(${layout.legendBox.x},${layout.legendBox.y})`);
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
          .style("font-size", `${legendFontSize}px`)
          .text(label);
        offsetY += 18;
      }
    } else {
      renderConfiguredInlineLegend(root, true, legendItems, {
        width,
        height,
        margin: layout.margin,
        theme,
        layout: legendLayout,
        fontSize: legendFontSize,
      });
    }
  }

  return () => container.replaceChildren();
}
