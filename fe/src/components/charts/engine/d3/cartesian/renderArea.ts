import * as d3 from "d3";
import { applyRotatedCategoryLabels, pickCategoryTicks, styleAxis } from "@/components/charts/engine/d3/core/axes";
import { animateBarHeight } from "@/components/charts/engine/d3/core/animate";
import { ensureGradientDef } from "@/components/charts/engine/d3/core/gradient";
import { cartesianMargin } from "@/components/charts/engine/d3/core/margin";
import { groupSeries, normalizeCartesianData, resolveDatumColor, resolveSeriesKeys, seriesDataKey } from "@/components/charts/engine/d3/core/series";
import { createTooltip, tooltipHtml } from "@/components/charts/engine/d3/core/tooltip";
import type { D3CartesianRenderConfig } from "@/components/charts/engine/d3/types";
import { formatChartValue } from "@/lib/chartValueFormat";

const BAR_RX = 4;

type WideRow = Record<string, string | number>;

function pickCategoryAtBand(mx: number, categories: string[], x: d3.ScaleBand<string>): string {
  let best = categories[0] ?? "";
  let bestDist = Infinity;
  for (const cat of categories) {
    const px = (x(cat) ?? 0) + x.bandwidth() / 2;
    const dist = Math.abs(px - mx);
    if (dist < bestDist) {
      bestDist = dist;
      best = cat;
    }
  }
  return best;
}

export function renderD3AreaChart(container: HTMLElement, config: D3CartesianRenderConfig): () => void {
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
    isStack = false,
    colors,
    theme,
    showTooltip,
    showLegend,
    valueFormat,
    onPointClick,
  } = config;

  const normalized = normalizeCartesianData(data, xField, yField, seriesField);
  const categories = [...new Set(normalized.map((d) => String(d.__category__ ?? "")))];
  const seriesGroups = groupSeries(normalized, seriesField);
  const seriesNames = seriesGroups.map((s) => s.name);
  const hasMultiSeries = seriesNames.length > 1 && Boolean(seriesField);
  const margin = cartesianMargin(showLegend && hasMultiSeries);
  const innerW = Math.max(0, width - margin.left - margin.right);
  const innerH = Math.max(0, height - margin.top - margin.bottom);

  const root = d3.select(container).append("svg").attr("width", width).attr("height", height).attr("role", "img");
  const defs = root.append("defs");
  const g = root.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const colorScale = d3.scaleOrdinal<string>().domain(seriesNames).range(colors);

  const x = d3.scalePoint<string>().domain(categories).range([0, innerW]).padding(0.5);
  const wideRows: WideRow[] = categories.map((cat) => {
    const row: WideRow = { __category__: cat };
    for (const s of seriesGroups) {
      const pt = s.points.find((p) => String(p.__category__) === cat);
      row[seriesDataKey(s.name)] = Number(pt?.__value__ ?? 0);
    }
    return row;
  });
  const keys = resolveSeriesKeys(seriesNames);
  const maxVal = isStack
    ? (d3.max(wideRows, (row) => keys.reduce((sum, k) => sum + Number(row[k] ?? 0), 0)) ?? 0)
    : (d3.max(normalized, (d) => Number(d.__value__)) ?? 0);
  const y = d3.scaleLinear().domain([0, maxVal]).nice().range([innerH, 0]);
  const curve = smooth ? d3.curveMonotoneX : d3.curveLinear;
  const xTicks = pickCategoryTicks(categories, innerW);
  const rotateX = xTicks.length >= 6 && innerW / xTicks.length < 72 ? -32 : 0;

  g.append("g")
    .call(d3.axisLeft(y).ticks(5).tickFormat((d) => formatChartValue(d, valueFormat)))
    .call(styleAxis, theme);
  g.append("g")
    .attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x).tickValues(xTicks))
    .call(styleAxis, theme)
    .call((sel) => applyRotatedCategoryLabels(sel, rotateX));

  const plot = g.append("g");
  const tooltip = showTooltip ? createTooltip(container, theme) : null;

  if (isStack && hasMultiSeries) {
    const stack = d3.stack<WideRow>().keys(keys);
    const layers = stack(wideRows);
    const areaGen = d3
      .area<d3.SeriesPoint<WideRow>>()
      .x((d) => x(String(d.data.__category__)) ?? 0)
      .y0((d) => y(d[0]))
      .y1((d) => y(d[1]))
      .curve(curve);

    layers.forEach((layer, i) => {
      const name = String(layer.key);
      const color = colorScale(name) ?? colors[i] ?? "#465fff";
      const gradId = ensureGradientDef(defs, `area-stack-${i}`, color, 0.45, 0.08);
      plot
        .append("path")
        .datum(layer)
        .attr("fill", `url(#${gradId})`)
        .attr("d", areaGen)
        .attr("stroke", color)
        .attr("stroke-width", 1)
        .style("cursor", onPointClick ? "pointer" : "default")
        .on("click", () => onPointClick?.({ __category__: name, __value__: 0 }));
    });
  } else {
    for (const [i, s] of seriesGroups.entries()) {
      const color = colorScale(s.name) ?? colors[i] ?? "#465fff";
      const gradId = ensureGradientDef(defs, `area-${i}`, color, 0.38, 0.04);
      const points = [...s.points].sort(
        (a, b) => categories.indexOf(String(a.__category__)) - categories.indexOf(String(b.__category__)),
      );
      const areaGen = d3
        .area<(typeof points)[0]>()
        .x((d) => x(String(d.__category__)) ?? 0)
        .y0(innerH)
        .y1((d) => y(Number(d.__value__)))
        .curve(curve);
      plot.append("path").datum(points).attr("fill", `url(#${gradId})`).attr("d", areaGen);
      plot
        .append("path")
        .datum(points)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 2)
        .attr("d", d3.line<typeof points[0]>().x((d) => x(String(d.__category__)) ?? 0).y((d) => y(Number(d.__value__))).curve(curve));
    }
  }

  if (showTooltip) {
    plot
      .append("rect")
      .attr("width", innerW)
      .attr("height", innerH)
      .attr("fill", "transparent")
      .style("cursor", "crosshair")
      .lower()
      .on("mousemove", (event) => {
        const [mx] = d3.pointer(event);
        let best = categories[0] ?? "";
        let bestDist = Infinity;
        for (const cat of categories) {
          const px = x(cat) ?? 0;
          const dist = Math.abs(px - mx);
          if (dist < bestDist) {
            bestDist = dist;
            best = cat;
          }
        }
        const rows = seriesGroups.map((s) => {
          const pt = s.points.find((p) => String(p.__category__) === best);
          return { name: s.name, color: colorScale(s.name) ?? colors[0], value: pt?.__value__ ?? 0 };
        });
        tooltip?.style("opacity", "1").html(tooltipHtml(best, rows, valueFormat));
        const rect = container.getBoundingClientRect();
        tooltip
          ?.style("left", `${Math.min(event.clientX - rect.left + 12, width - 160)}px`)
          .style("top", `${Math.max(event.clientY - rect.top - 48, 8)}px`);
      })
      .on("mouseleave", () => tooltip?.style("opacity", "0"));
  }

  return () => container.replaceChildren();
}
