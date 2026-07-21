import * as d3 from "d3";
import type { D3CartesianDatum } from "@/components/charts/engine/d3/types";
import type { ChartConditionalRule } from "@/lib/chartDeFeatures";
import { matchConditionalRule } from "@/lib/chartDeFeatures";

export type SeriesGroup = { name: string; points: D3CartesianDatum[] };

/** 宽表/stack 用列名；无系列字段时与 row[s.name||"value"] 对齐 */
export function seriesDataKey(name: string): string {
  return name || "value";
}

export function resolveSeriesKeys(seriesNames: string[]): string[] {
  if (seriesNames.length === 0) return ["value"];
  return seriesNames.map(seriesDataKey);
}

export function groupSeries(data: D3CartesianDatum[], seriesField?: string): SeriesGroup[] {
  if (!seriesField) return [{ name: "value", points: data }];
  const map = d3.group(data, (d) => String(d[seriesField] ?? ""));
  return [...map.entries()].map(([name, points]) => ({ name, points }));
}

export function normalizeCartesianData(
  data: D3CartesianDatum[],
  xField: string,
  yField: string,
  seriesField?: string,
): D3CartesianDatum[] {
  return data.map((row) => ({
    ...row,
    __category__: row[xField],
    __value__: Number(row[yField] ?? 0),
    __series__: seriesField ? String(row[seriesField] ?? "") : "",
  }));
}

export function resolveDatumColor(
  value: number,
  baseColor: string,
  rules: ChartConditionalRule[],
): string {
  const active = rules.filter((rule) => rule.enabled && Number.isFinite(rule.value));
  const matched = active.find((rule) => matchConditionalRule(value, rule));
  return matched?.color ?? baseColor;
}
