import * as d3 from "d3";
import type { AntvThemeTokens } from "@/components/charts/engine/antv/theme";
import {
  animateStrokePath,
  buildAreaGenerator,
  buildLineGenerator,
  ensureGradientDef,
  nearestCategory,
  pickCategoryTicks,
  type D3LineDatum,
} from "@/components/charts/engine/d3/d3LineVisual";
import type { ChartConditionalRule, ChartMarkLine } from "@/lib/chartDeFeatures";
import { matchConditionalRule } from "@/lib/chartDeFeatures";
import { formatChartValue } from "@/lib/chartValueFormat";
import type { NumberFormatConfig } from "@/components/dashboard/dashboardStyleConfig";

export type { D3LineDatum } from "@/components/charts/engine/d3/d3LineVisual";

export type D3LineRenderConfig = {
  width: number;
  height: number;
  data: D3LineDatum[];
  xField: string;
  yField: string;
  seriesField?: string;
  smooth?: boolean;
  isHorizontal?: boolean;
  colors: string[];
  theme: AntvThemeTokens;
  showLabel: boolean;
  showTooltip: boolean;
  showLegend: boolean;
  labelFontSize: number;
  valueFormat?: NumberFormatConfig;
  markLines?: ChartMarkLine[];
  conditionalRules?: ChartConditionalRule[];
  onPointClick?: (datum: D3LineDatum) => void;
};

type SeriesGroup = { name: string; points: D3LineDatum[] };

const MARGIN = { top: 24, right: 20, bottom: 44, left: 52 };

function groupSeries(data: D3LineDatum[], seriesField?: string): SeriesGroup[] {
  if (!seriesField) return [{ name: "", points: data }];
  const map = d3.group(data, (d) => String(d[seriesField] ?? ""));
  return [...map.entries()].map(([name, points]) => ({ name, points }));
}

function resolvePointColor(value: number, baseColor: string, rules: ChartConditionalRule[]): string {
  const active = rules.filter((rule) => rule.enabled && Number.isFinite(rule.value));
  const matched = active.find((rule) => matchConditionalRule(value, rule));
  return matched?.color ?? baseColor;
}

function tooltipHtml(
  category: string,
  rows: { name: string; color: string; value: unknown }[],
  valueFormat?: NumberFormatConfig,
): string {
  const items = rows
    .map(
      (row) =>
        `<div style="display:flex;align-items:center;gap:6px;margin-top:4px">` +
        `<span style="width:8px;height:8px;border-radius:999px;background:${row.color};flex-shrink:0"></span>` +
        `<span style="opacity:0.78">${row.name ? `${row.name} · ` : ""}</span>` +
        `<strong>${formatChartValue(row.value, valueFormat)}</strong></div>`,
    )
    .join("");
  return `<div style="font-weight:600;margin-bottom:2px">${category}</div>${items}`;
}

export function renderD3LineChart(container: HTMLElement, config: D3LineRenderConfig): () => void {
  container.replaceChildren();
  if (config.width <= 0 || config.height <= 0 || config.data.length === 0) return () => undefined;

  const {
    width,
    height,
    data,
    xField,
    yField,
    seriesField,
    smooth = false,
    isHorizontal = false,
    colors,
    theme,
    showLabel,
    showTooltip,
    showLegend,
    labelFontSize,
    valueFormat,
    markLines = [],
    conditionalRules = [],
    onPointClick,
  } = config;

  const normalized = data.map((row) => ({
    ...row,
    __category__: row[xField],
    __value__: Number(row[yField] ?? 0),
    __series__: seriesField ? String(row[seriesField] ?? "") : "",
  }));

  const categories = [...new Set(normalized.map((d) => String(d.__category__ ?? "")))];
  const seriesGroups = groupSeries(normalized, seriesField);
  const colorScale = d3.scaleOrdinal<string>().domain(seriesGroups.map((s) => s.name)).range(colors);
  const singleSeries = seriesGroups.length === 1;

  const legendRows = showLegend && seriesField ? seriesGroups.length : 0;
  const margin = { ...MARGIN, top: MARGIN.top + (legendRows > 0 ? 20 : 0) };
  const innerW = Math.max(0, width - margin.left - margin.right);
  const innerH = Math.max(0, height - margin.top - margin.bottom);

  const root = d3
    .select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("role", "img")
    .style("overflow", "visible");

  const defs = root.append("defs");
  const g = root.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  g.append("clipPath")
    .attr("id", "d3-line-clip")
    .append("rect")
    .attr("width", innerW)
    .attr("height", innerH)
    .attr("rx", 4);

  let xScale: d3.ScalePoint<string> | d3.ScaleLinear<number, number>;
  let yScale: d3.ScaleLinear<number, number> | d3.ScalePoint<string>;

  if (isHorizontal) {
    xScale = d3.scalePoint<string>().domain(categories).range([0, innerH]).padding(0.5);
    const maxVal = d3.max(normalized, (d) => Number(d.__value__)) ?? 0;
    yScale = d3.scaleLinear().domain([0, maxVal]).nice().range([0, innerW]);
  } else {
    xScale = d3.scalePoint<string>().domain(categories).range([0, innerW]).padding(0.5);
    const maxVal = d3.max(normalized, (d) => Number(d.__value__)) ?? 0;
    yScale = d3.scaleLinear().domain([0, maxVal]).nice().range([innerH, 0]);
  }

  const lineGen = buildLineGenerator(isHorizontal, smooth, xScale, yScale);
  const areaGen = buildAreaGenerator(isHorizontal, smooth, innerH, xScale, yScale);
  const xTicks = pickCategoryTicks(categories, innerW);
  const rotateX = xTicks.length >= 6 && innerW / xTicks.length < 72 ? -32 : 0;

  const plot = g.append("g").attr("clip-path", "url(#d3-line-clip)");

  if (!isHorizontal) {
    plot
      .append("g")
      .attr("class", "grid")
      .call(
        d3
          .axisLeft(yScale as d3.ScaleLinear<number, number>)
          .ticks(5)
          .tickSize(-innerW)
          .tickFormat(() => ""),
      )
      .call((sel) => sel.select(".domain").remove())
      .call((sel) => sel.selectAll(".tick line").attr("stroke", theme.gridLine).attr("stroke-opacity", 0.9));
  }

  const xAxisG = g.append("g").attr("transform", `translate(0,${innerH})`);
  const yAxisG = g.append("g");

  if (isHorizontal) {
    xAxisG.call(d3.axisLeft(xScale as d3.ScalePoint<string>)).call(styleAxis, theme);
    yAxisG.call(d3.axisBottom(yScale as d3.ScaleLinear<number, number>)).call(styleAxis, theme);
  } else {
    xAxisG
      .call(d3.axisBottom(xScale as d3.ScalePoint<string>).tickValues(xTicks))
      .call(styleAxis, theme)
      .call((sel) => {
        sel
          .selectAll("text")
          .attr("transform", rotateX ? `rotate(${rotateX})` : null)
          .style("text-anchor", rotateX ? "end" : "middle")
          .attr("dx", rotateX ? "-0.4em" : null)
          .attr("dy", rotateX ? "0.15em" : "0.71em");
      });
    yAxisG
      .call(
        d3
          .axisLeft(yScale as d3.ScaleLinear<number, number>)
          .ticks(5)
          .tickFormat((d) => formatChartValue(d, valueFormat)),
      )
      .call(styleAxis, theme);
  }

  const markLineLayer = plot.append("g").attr("class", "mark-lines");
  for (const line of markLines.filter((m) => m.enabled && Number.isFinite(m.value))) {
    const y = (yScale as d3.ScaleLinear<number, number>)(line.value);
    markLineLayer
      .append("line")
      .attr("x1", 0)
      .attr("x2", innerW)
      .attr("y1", y)
      .attr("y2", y)
      .attr("stroke", line.color ?? "#465fff")
      .attr("stroke-opacity", 0.85)
      .attr("stroke-dasharray", line.lineStyle === "solid" ? undefined : "5 4");
  }

  const tooltip = showTooltip ? createTooltip(container, theme) : null;
  const focusLayer = plot.append("g").attr("class", "focus").style("opacity", 0);
  const crossV = focusLayer
    .append("line")
    .attr("y1", 0)
    .attr("y2", innerH)
    .attr("stroke", theme.axisLine)
    .attr("stroke-dasharray", "4 4")
    .attr("stroke-opacity", 0.85);
  const crossDot = focusLayer.append("circle").attr("r", 5).attr("stroke", "#fff").attr("stroke-width", 2);

  const dotLayers: d3.Selection<SVGCircleElement, D3LineDatum, SVGGElement, unknown>[] = [];

  seriesGroups.forEach((series, seriesIndex) => {
    const color = colorScale(series.name) ?? colors[0] ?? "#465fff";
    const gradId = `d3-line-grad-${seriesIndex}`;
    ensureGradientDef(defs, gradId, color, singleSeries ? 0.32 : 0.16, 0.01);

    const points = [...series.points].sort(
      (a, b) => categories.indexOf(String(a.__category__)) - categories.indexOf(String(b.__category__)),
    );

    if (!isHorizontal) {
      plot
        .append("path")
        .datum(points)
        .attr("fill", `url(#${gradId})`)
        .attr("d", areaGen)
        .attr("opacity", 0.95);
    }

    const linePath = plot
      .append("path")
      .datum(points)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 2.5)
      .attr("stroke-linecap", "round")
      .attr("stroke-linejoin", "round")
      .attr("d", lineGen);
    if (!isHorizontal) animateStrokePath(linePath);

    const dots = plot
      .selectAll<SVGCircleElement, D3LineDatum>(`circle.series-${seriesIndex}`)
      .data(points)
      .join("circle")
      .attr("class", `series-${seriesIndex}`)
      .attr("r", 3)
      .attr("fill", (d) => resolvePointColor(Number(d.__value__), color, conditionalRules))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .attr("opacity", 0.92)
      .attr("cursor", onPointClick ? "pointer" : "default")
      .attr("cx", (d) => (xScale as d3.ScalePoint<string>)(String(d.__category__)) ?? 0)
      .attr("cy", (d) => (yScale as d3.ScaleLinear<number, number>)(Number(d.__value__)));

    dotLayers.push(dots);

    if (onPointClick) dots.on("click", (_event, datum) => onPointClick(datum));

    if (showLabel && !isHorizontal) {
      plot
        .selectAll<SVGTextElement, D3LineDatum>(`text.label-${seriesIndex}`)
        .data(points)
        .join("text")
        .attr("class", `label-${seriesIndex}`)
        .attr("x", (d) => (xScale as d3.ScalePoint<string>)(String(d.__category__)) ?? 0)
        .attr("y", (d) => (yScale as d3.ScaleLinear<number, number>)(Number(d.__value__)) - 8)
        .attr("text-anchor", "middle")
        .attr("fill", theme.axisLabel)
        .style("font-size", `${labelFontSize}px`)
        .text((d) => formatChartValue(d.__value__, valueFormat));
    }
  });

  function setActiveCategory(category: string | null) {
    dotLayers.forEach((dots) => {
      dots
        .transition()
        .duration(120)
        .attr("r", (d) => (category && String(d.__category__) === category ? 5.5 : 3))
        .attr("opacity", (d) => (category && String(d.__category__) === category ? 1 : 0.85));
    });
  }

  if (!isHorizontal) {
    plot
      .append("rect")
      .attr("width", innerW)
      .attr("height", innerH)
      .attr("fill", "transparent")
      .style("cursor", "crosshair")
      .on("mousemove", (event) => {
        const [mx, my] = d3.pointer(event);
        const category = nearestCategory(mx, categories, xScale as d3.ScalePoint<string>);
        const cx = (xScale as d3.ScalePoint<string>)(category) ?? 0;
        const rows = seriesGroups.map((series) => {
          const point = series.points.find((p) => String(p.__category__) === category);
          const color = colorScale(series.name) ?? colors[0] ?? "#465fff";
          return { name: series.name, color, value: point?.__value__ ?? 0 };
        });
        const anchor = rows[0];
        const cy = anchor
          ? (yScale as d3.ScaleLinear<number, number>)(Number(anchor.value))
          : my;

        focusLayer.style("opacity", 1);
        crossV.attr("x1", cx).attr("x2", cx);
        crossDot.attr("cx", cx).attr("cy", cy).attr("fill", colorScale(seriesGroups[0]?.name ?? "") ?? colors[0]);
        setActiveCategory(category);

        if (tooltip) {
          tooltip
            .style("opacity", "1")
            .html(tooltipHtml(category, rows, valueFormat));
          const rect = container.getBoundingClientRect();
          tooltip
            .style("left", `${Math.min(event.clientX - rect.left + 12, width - 160)}px`)
            .style("top", `${Math.max(event.clientY - rect.top - 48, 8)}px`);
        }
      })
      .on("mouseleave", () => {
        focusLayer.style("opacity", 0);
        setActiveCategory(null);
        tooltip?.style("opacity", "0");
      });
  }

  if (showLegend && seriesField) {
    const legend = root.append("g").attr("transform", `translate(${margin.left},10)`);
    let offsetX = 0;
    seriesGroups.forEach((series) => {
      const color = colorScale(series.name) ?? colors[0] ?? "#465fff";
      const label = series.name || "系列";
      const item = legend.append("g").attr("transform", `translate(${offsetX},0)`);
      item
        .append("rect")
        .attr("width", 14)
        .attr("height", 6)
        .attr("y", 2)
        .attr("rx", 3)
        .attr("fill", color)
        .attr("opacity", 0.9);
      item
        .append("text")
        .attr("x", 18)
        .attr("y", 10)
        .attr("fill", theme.legendText)
        .style("font-size", "11px")
        .text(label);
      offsetX += label.length * 7 + 36;
    });
  }

  return () => container.replaceChildren();
}

function styleAxis(
  sel: d3.Selection<SVGGElement, unknown, null, undefined>,
  theme: AntvThemeTokens,
) {
  sel
    .selectAll("text")
    .attr("fill", theme.axisLabel)
    .style("font-size", "11px")
    .style("font-family", "inherit");
  sel.select(".domain").attr("stroke", theme.axisLine);
  sel.selectAll(".tick line").attr("stroke", theme.axisLine);
}

function createTooltip(container: HTMLElement, theme: AntvThemeTokens) {
  return d3
    .select(container)
    .append("div")
    .style("position", "absolute")
    .style("pointer-events", "none")
    .style("opacity", "0")
    .style("padding", "8px 10px")
    .style("border-radius", "8px")
    .style("font-size", "12px")
    .style("line-height", "1.35")
    .style("background", theme.tooltipBg)
    .style("color", theme.tooltipText)
    .style("border", `1px solid ${theme.axisLine}`)
    .style("box-shadow", "0 8px 24px rgba(16,24,40,0.14)")
    .style("backdrop-filter", "blur(6px)")
    .style("transition", "opacity 120ms ease");
}
