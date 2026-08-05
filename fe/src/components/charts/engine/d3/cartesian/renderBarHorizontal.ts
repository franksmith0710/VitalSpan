import * as d3 from "d3";
import { appendChartSvg, drawCartesianHorizontalBandAxes, resolveHorizontalCategoryCartesianLayout } from "@/components/charts/engine/d3/core/sceneGraph";
import { paintHorizontalBar, resolveEffectiveDepth } from "@/components/charts/engine/d3/core/depthEngine";
import { attachCartesianDataZoom } from "@/components/charts/engine/d3/core/dataZoom";
import { renderConfiguredInlineLegend } from "@/components/charts/engine/d3/core/d3Legend";
import { drawVerticalMarkLines } from "@/components/charts/engine/d3/core/markLines";
import { resolveSeriesGradientFill } from "@/components/charts/engine/d3/core/gradient";
import { resolveLabelFill } from "@/components/charts/engine/d3/core/presentation";
import { groupSeries, normalizeCartesianData, resolveDatumColor, resolveSeriesKeys, seriesDataKey } from "@/components/charts/engine/d3/core/series";
import { createTooltip, tooltipHtml } from "@/components/charts/engine/d3/core/tooltip";
import type { D3CartesianRenderConfig } from "@/components/charts/engine/d3/types";
import { normalizeCategoryAxisDomain } from "@/components/charts/engine/buildDatasetEncoding";
import { resolveBarBandPadding } from "@/lib/applyChartDeStyleBlocks";

const BAR_RX = 4;

type WideRow = Record<string, string | number>;

function paintHBarCell(
  cell: d3.Selection<SVGGElement, unknown, null, undefined>,
  opts: { x: number; w: number; h: number; front: string; solid: string; rx?: number },
): void {
  cell.selectAll("*").remove();
  const depthOn = resolveEffectiveDepth() !== "off";
  paintHorizontalBar({
    plot: cell,
    x: opts.x,
    y: 0,
    width: opts.w,
    height: opts.h,
    color: depthOn ? opts.solid : opts.front,
    rx: opts.rx ?? BAR_RX,
  });
  if (depthOn && opts.front !== opts.solid) cell.select(".vs-hbar-front").attr("fill", opts.front);
}

function pickCategoryAtBand(my: number, categories: string[], y: d3.ScaleBand<string>): string {
  let best = categories[0] ?? "";
  let bestDist = Infinity;
  for (const cat of categories) {
    const py = (y(cat) ?? 0) + y.bandwidth() / 2;
    const dist = Math.abs(py - my);
    if (dist < bestDist) {
      bestDist = dist;
      best = cat;
    }
  }
  return best;
}

/** 横向柱状图（isHorizontal=true 时由 renderD3BarChart 委托） */
export function renderD3HorizontalBarChart(container: HTMLElement, config: D3CartesianRenderConfig): () => void {
  container.replaceChildren();
  if (config.width <= 0 || config.height <= 0 || config.data.length === 0) return () => undefined;

  const {
    width,
    height,
    data,
    xField,
    yField,
    seriesField,
    isStack = false,
    isGroup = false,
    isPercent = false,
    colors,
    theme,
    showLabel,
    showTooltip,
    showLegend,
    labelFontSize,
    valueFormat,
    markLines = [],
    conditionalRules = [],
    labelColor,
    seriesGradient = false,
    tooltipPresentation,
    dataZoom = false,
    onPointClick,
    legendLayout,
    barWidthRatio,
    barRadius,
    axisStyle,
    categoryLevelCount,
  } = config;

  const barRx = barRadius ?? BAR_RX;

  const normalized = normalizeCartesianData(data, xField, yField, seriesField);
  const { categories } = normalizeCategoryAxisDomain(
    normalized.map((d) => String(d.__category__ ?? "")),
    categoryLevelCount,
  );
  const seriesGroups = groupSeries(normalized, seriesField);
  const seriesNames = seriesGroups.map((s) => s.name);
  const hasMultiSeries = seriesNames.length > 1 && Boolean(seriesField);
  const useGrouped = hasMultiSeries && (isGroup || !isStack);
  const colorScale = d3.scaleOrdinal<string>().domain(seriesNames).range(colors);
  const legendItems = hasMultiSeries
    ? seriesNames.map((name) => ({
        label: name || "系列",
        color: colorScale(name) ?? colors[0] ?? theme.accent,
      }))
    : undefined;
  const { margin, innerW, innerH } = resolveHorizontalCategoryCartesianLayout(width, height, categories, {
    showLegend: Boolean(showLegend && hasMultiSeries),
    legendLayout,
    legendItems,
  });
  const root = appendChartSvg(container, width, height);
  const defs = root.append("defs");
  const g = root.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const keys = resolveSeriesKeys(seriesNames);

  const wideRows: WideRow[] = categories.map((cat) => {
    const row: WideRow = { __category__: cat };
    for (const s of seriesGroups) {
      const pt = s.points.find((p) => String(p.__category__) === cat);
      row[seriesDataKey(s.name)] = Number(pt?.__value__ ?? 0);
    }
    if (isPercent) {
      const sum = keys.reduce((acc, name) => acc + Number(row[name] ?? 0), 0);
      if (sum > 0) for (const name of keys) row[name] = Number(row[name] ?? 0) / sum;
    }
    return row;
  });

  const maxVal =
    isStack || isPercent
      ? (d3.max(wideRows, (row) => keys.reduce((sum, k) => sum + Number(row[k] ?? 0), 0)) ?? 0)
      : (d3.max(normalized, (d) => Number(d.__value__)) ?? 0);

  const y = d3.scaleBand<string>().domain(categories).range([0, innerH]).padding(resolveBarBandPadding(barWidthRatio));
  const x = d3.scaleLinear().domain([0, maxVal]).nice().range([0, innerW]);
  const ySub = useGrouped ? d3.scaleBand<string>().domain(keys).range([0, y.bandwidth()]).padding(0.12) : null;
  const plot = g.append("g");
  drawVerticalMarkLines(plot, markLines, x, innerH);
  const tooltip = showTooltip ? createTooltip(container, theme, tooltipPresentation) : null;

  drawCartesianHorizontalBandAxes({ g, xScale: x, yScale: y, innerW, innerH, theme, valueFormat, axisStyle });

  if (isStack) {
    const stack = d3.stack<WideRow>().keys(keys);
    for (const layer of stack(wideRows)) {
      const name = String(layer.key);
      const color = colorScale(name) ?? colors[0] ?? "#465fff";
      const gradientFill = resolveSeriesGradientFill(defs, `hbar-stack-${name}`, color, seriesGradient, "horizontal");
      plot
        .selectAll(`g.hbar-stack-${name}`)
        .data(layer)
        .join("g")
        .attr("class", `hbar-stack-${name}`)
        .attr("transform", (d) => `translate(0,${y(String(d.data.__category__)) ?? 0})`)
        .attr("cursor", onPointClick ? "pointer" : "default")
        .each(function (d) {
          const x0 = x(Number(d[0]));
          const w = Math.max(0, x(Number(d[1])) - x0);
          const val = Number(d[1]) - Number(d[0]);
          const solid = gradientFill.startsWith("url(") ? color : resolveDatumColor(val, color, conditionalRules);
          const front = gradientFill.startsWith("url(") ? gradientFill : solid;
          paintHBarCell(d3.select(this), { x: x0, w, h: y.bandwidth(), front, solid, rx: barRx });
        })
        .on("click", (_e, d) =>
          onPointClick?.({
            __category__: d.data.__category__,
            __value__: Number(d[1]) - Number(d[0]),
            __series__: name,
          }),
        );
    }
  } else {
    for (const s of seriesGroups) {
      const name = s.name || "value";
      const color = colorScale(name) ?? colors[0] ?? "#465fff";
      const barH = useGrouped && ySub ? ySub.bandwidth() : y.bandwidth();
      const gradientFill = resolveSeriesGradientFill(defs, `hbar-${name}`, color, seriesGradient, "horizontal");
      plot
        .selectAll(`g.hbar-${name}`)
        .data(s.points)
        .join("g")
        .attr("class", `hbar-${name}`)
        .attr("transform", (d) => {
          const base = y(String(d.__category__)) ?? 0;
          const by = useGrouped && ySub ? base + (ySub(name) ?? 0) : base;
          return `translate(0,${by})`;
        })
        .attr("cursor", onPointClick ? "pointer" : "default")
        .each(function (d) {
          const w = x(Number(d.__value__));
          const solid = gradientFill.startsWith("url(")
            ? color
            : resolveDatumColor(Number(d.__value__), color, conditionalRules);
          const front = gradientFill.startsWith("url(") ? gradientFill : solid;
          paintHBarCell(d3.select(this), { x: 0, w, h: barH, front, solid, rx: barRx });
        })
        .on("click", (_e, d) => onPointClick?.(d));
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
        const [, my] = d3.pointer(event);
        const cat = pickCategoryAtBand(my, categories, y);
        const rows = seriesGroups.map((s) => {
          const pt = s.points.find((p) => String(p.__category__) === cat);
          return { name: s.name, color: colorScale(s.name) ?? colors[0], value: pt?.__value__ ?? 0 };
        });
        tooltip?.style("opacity", "1").html(tooltipHtml(cat, rows, valueFormat));
        const rect = container.getBoundingClientRect();
        tooltip
          ?.style("left", `${Math.min(event.clientX - rect.left + 12, width - 160)}px`)
          .style("top", `${Math.max(event.clientY - rect.top - 48, 8)}px`);
      })
      .on("mouseleave", () => tooltip?.style("opacity", "0"));
  }

  if (showLabel) {
    plot
      .selectAll("text.hbar-label")
      .data(normalized)
      .join("text")
      .attr("class", "hbar-label")
      .attr("x", (d) => x(Number(d.__value__)) + 4)
      .attr("y", (d) => (y(String(d.__category__)) ?? 0) + y.bandwidth() / 2)
      .attr("dy", "0.32em")
      .attr("fill", resolveLabelFill(theme, labelColor))
      .style("font-size", `${labelFontSize}px`)
      .text((d) => formatChartValue(d.__value__, valueFormat));
  }

  if (showLegend && hasMultiSeries) {
    renderConfiguredInlineLegend(
      root,
      true,
      seriesNames.map((name) => ({
        label: name || "系列",
        color: colorScale(name) ?? colors[0] ?? theme.accent,
      })),
      { width, height, margin, theme, layout: legendLayout, fontSize: legendLayout?.fontSize },
    );
  }

  const detachZoom = dataZoom ? attachCartesianDataZoom(root, plot, innerW, innerH, { theme }) : () => undefined;

  return () => {
    detachZoom();
    container.replaceChildren();
  };
}
