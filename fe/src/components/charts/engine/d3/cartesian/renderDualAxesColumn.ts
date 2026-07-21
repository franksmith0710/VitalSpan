import * as d3 from "d3";
import { chartTransition } from "@/components/charts/engine/d3/core/animate";
import { VCDS } from "@/components/charts/engine/d3/core/chartVisualTokens";
import { resolveSeriesGradientFill } from "@/components/charts/engine/d3/core/gradient";
import {
  groupSeries,
  normalizeCartesianData,
  resolveDatumColor,
  resolveSeriesKeys,
  seriesDataKey,
} from "@/components/charts/engine/d3/core/series";
import type { AntvThemeTokens } from "@/components/charts/engine/antv/theme";
import type { ChartConditionalRule } from "@/lib/chartDeFeatures";
import type { D3CartesianDatum } from "@/components/charts/engine/d3/types";

const BAR_RX = VCDS.bar.rx;
const STACK_GAP = VCDS.bar.stackGap;

type WideRow = Record<string, string | number>;

type ColumnOpts = { isGroup?: boolean; isStack?: boolean };

export type DualAxesColumnLegendItem = { label: string; color: string; w: number; h: number };

export function resolveDualAxesColumnMax(
  columnData: D3CartesianDatum[],
  xField: string,
  columnYField: string,
  columnSeriesField: string | undefined,
  columnOpts: ColumnOpts,
): number {
  const normalized = normalizeCartesianData(columnData, xField, columnYField, columnSeriesField);
  const seriesGroups = groupSeries(normalized, columnSeriesField);
  const seriesNames = seriesGroups.map((s) => s.name);
  const hasMultiSeries = seriesNames.length > 1 && Boolean(columnSeriesField);
  if (columnOpts.isStack && hasMultiSeries) {
    const keys = resolveSeriesKeys(seriesNames);
    const categories = [...new Set(normalized.map((d) => String(d.__category__ ?? "")))];
    const wideRows: WideRow[] = categories.map((cat) => {
      const row: WideRow = { __category__: cat };
      for (const s of seriesGroups) {
        const pt = s.points.find((p) => String(p.__category__) === cat);
        row[seriesDataKey(s.name)] = Number(pt?.__value__ ?? 0);
      }
      return row;
    });
    return d3.max(wideRows, (row) => keys.reduce((sum, k) => sum + Number(row[k] ?? 0), 0)) ?? 0;
  }
  return d3.max(normalized, (d) => Number(d.__value__)) ?? 0;
}

export function renderDualAxesColumnBars(params: {
  plot: d3.Selection<SVGGElement, unknown, null, undefined>;
  defs?: d3.Selection<SVGDefsElement, unknown, null, undefined>;
  columnData: D3CartesianDatum[];
  xField: string;
  columnYField: string;
  columnSeriesField?: string;
  categories: string[];
  x: d3.ScalePoint<string>;
  yRight: d3.ScaleLinear<number, number>;
  innerH: number;
  innerW: number;
  columnOpts: ColumnOpts;
  colors: string[];
  fallbackColor: string;
  theme: AntvThemeTokens;
  seriesGradient?: boolean;
  conditionalRules?: ChartConditionalRule[];
  onPointClick?: (datum: D3CartesianDatum) => void;
}): { columnMax: number; legendItems: DualAxesColumnLegendItem[] } {
  const {
    plot,
    defs,
    columnData,
    xField,
    columnYField,
    columnSeriesField,
    categories,
    x,
    yRight,
    innerH,
    innerW,
    columnOpts,
    colors,
    fallbackColor,
    theme,
    seriesGradient = false,
    conditionalRules = [],
    onPointClick,
  } = params;

  const normalized = normalizeCartesianData(columnData, xField, columnYField, columnSeriesField);
  const seriesGroups = groupSeries(normalized, columnSeriesField);
  const seriesNames = seriesGroups.map((s) => s.name);
  const hasMultiSeries = seriesNames.length > 1 && Boolean(columnSeriesField);
  const useGrouped = hasMultiSeries && (columnOpts.isGroup || !columnOpts.isStack);
  const keys = resolveSeriesKeys(seriesNames);
  const colorScale = d3.scaleOrdinal<string>().domain(seriesNames).range(colors.slice(1).concat(colors));

  const wideRows: WideRow[] = categories.map((cat) => {
    const row: WideRow = { __category__: cat };
    for (const s of seriesGroups) {
      const pt = s.points.find((p) => String(p.__category__) === cat);
      row[seriesDataKey(s.name)] = Number(pt?.__value__ ?? 0);
    }
    return row;
  });

  const columnMax =
    columnOpts.isStack && hasMultiSeries
      ? (d3.max(wideRows, (row) => keys.reduce((sum, k) => sum + Number(row[k] ?? 0), 0)) ?? 0)
      : (d3.max(normalized, (d) => Number(d.__value__)) ?? 0);

  const barWidth = Math.min(28, (innerW / Math.max(categories.length, 1)) * 0.55);
  const legendItems: DualAxesColumnLegendItem[] = [];

  const animateBar = (sel: d3.Selection<SVGRectElement, unknown, null, undefined>, y1: number, h: number) => {
    if (h <= 0) {
      sel.attr("y", y1).attr("height", 0);
      return;
    }
    chartTransition(sel.attr("y", innerH).attr("height", 0))
      .duration(600)
      .ease(d3.easeCubicOut)
      .attr("y", y1)
      .attr("height", h);
  };

  if (columnOpts.isStack && hasMultiSeries) {
    const stack = d3.stack<WideRow>().keys(keys);
    for (const layer of stack(wideRows)) {
      const name = String(layer.key);
      const color = colorScale(name) ?? fallbackColor;
      legendItems.push({ label: name, color, w: 10, h: 10 });
      plot
        .selectAll(`rect.dual-stack-${name}`)
        .data(layer)
        .join("rect")
        .attr("class", `dual-stack-${name}`)
        .attr("x", (d) => (x(String(d.data.__category__)) ?? 0) - barWidth / 2)
        .attr("width", barWidth)
        .attr("rx", BAR_RX)
        .attr("fill", (d) => {
          const base = resolveSeriesGradientFill(defs, `dual-stack-${name}`, color, seriesGradient);
          if (base.startsWith("url(")) return base;
          return resolveDatumColor(Number(d[1]) - Number(d[0]), color, conditionalRules);
        })
        .attr("cursor", onPointClick ? "pointer" : "default")
        .each(function (d) {
          const y1 = yRight(Number(d[1]));
          const rawH = Math.max(0, yRight(Number(d[0])) - y1);
          const h = rawH > STACK_GAP ? rawH - STACK_GAP : rawH;
          animateBar(d3.select(this), y1, h);
        })
        .on("click", (_event, d) =>
          onPointClick?.({
            __category__: d.data.__category__,
            __value__: Number(d[1]) - Number(d[0]),
            __series__: name,
          }),
        );
    }
  } else if (useGrouped && hasMultiSeries) {
    const groupWidth = barWidth / seriesNames.length;
    seriesGroups.forEach((s, i) => {
      const name = s.name || "value";
      const color = colorScale(name) ?? fallbackColor;
      legendItems.push({ label: name, color, w: 10, h: 10 });
      plot
        .selectAll(`rect.dual-group-${name}`)
        .data(s.points)
        .join("rect")
        .attr("class", `dual-group-${name}`)
        .attr("x", (d) => {
          const cx = x(String(d.__category__)) ?? 0;
          return cx - barWidth / 2 + i * groupWidth;
        })
        .attr("width", Math.max(2, groupWidth * 0.9))
        .attr("rx", BAR_RX)
        .attr("fill", (d) => {
          const base = resolveSeriesGradientFill(defs, `dual-group-${name}`, color, seriesGradient);
          if (base.startsWith("url(")) return base;
          return resolveDatumColor(Number(d.__value__), color, conditionalRules);
        })
        .attr("cursor", onPointClick ? "pointer" : "default")
        .each(function (d) {
          const y1 = yRight(Number(d.__value__));
          animateBar(d3.select(this), y1, innerH - y1);
        })
        .on("click", (_event, d) => onPointClick?.(d));
    });
  } else {
    legendItems.push({ label: "", color: fallbackColor, w: 10, h: 10 });
    plot
      .selectAll("rect.dual-col")
      .data(normalized)
      .join("rect")
      .attr("class", "dual-col")
      .attr("x", (d) => (x(String(d.__category__)) ?? 0) - barWidth / 2)
      .attr("width", barWidth)
      .attr("rx", BAR_RX)
      .attr("fill", (d) => {
        const base = resolveSeriesGradientFill(defs, "dual-col", fallbackColor, seriesGradient);
        if (base.startsWith("url(")) return base;
        return resolveDatumColor(Number(d.__value__), fallbackColor, conditionalRules);
      })
      .attr("cursor", onPointClick ? "pointer" : "default")
      .each(function (d) {
        const y1 = yRight(Number(d.__value__));
        animateBar(d3.select(this), y1, innerH - y1);
      })
      .on("click", (_event, d) => onPointClick?.(d));
  }

  return { columnMax, legendItems };
}

export function columnTooltipRows(
  columnData: D3CartesianDatum[],
  xField: string,
  columnYField: string,
  columnSeriesField: string | undefined,
  category: string,
  colors: string[],
  fallbackColor: string,
): Array<{ name: string; color: string; value: number }> {
  const normalized = normalizeCartesianData(columnData, xField, columnYField, columnSeriesField);
  const groups = groupSeries(normalized, columnSeriesField);
  if (groups.length > 1 && columnSeriesField) {
    const colorScale = d3.scaleOrdinal<string>().domain(groups.map((g) => g.name)).range(colors.slice(1).concat(colors));
    return groups.map((s) => {
      const pt = s.points.find((p) => String(p.__category__) === category);
      return {
        name: s.name || "柱",
        color: colorScale(s.name) ?? fallbackColor,
        value: Number(pt?.__value__ ?? 0),
      };
    });
  }
  const pt = normalized.find((p) => String(p.__category__) === category);
  return [{ name: "柱", color: fallbackColor, value: Number(pt?.__value__ ?? 0) }];
}
