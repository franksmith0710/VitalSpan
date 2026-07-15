import type { NumberFormatConfig } from "@/components/dashboard/dashboardStyleConfig";
import { formatMetricValue } from "@/components/dashboard/dashboardStyleConfig";
import type { ChartLabelStyle } from "@/lib/chartDeStyle";

/** 组件 deStyle.label 优先于看板 numberFormat */
export function resolveChartValueFormat(
  deLabel: ChartLabelStyle | undefined,
  dashboardFormat: NumberFormatConfig | undefined,
): NumberFormatConfig {
  if (!deLabel?.formatType && deLabel?.thousandSeparator === undefined && !dashboardFormat) {
    return { type: "auto", thousandSeparator: true };
  }
  return {
    type: deLabel?.formatType ?? dashboardFormat?.type ?? "auto",
    decimals: dashboardFormat?.decimals,
    unit: dashboardFormat?.unit,
    thousandSeparator:
      deLabel?.thousandSeparator !== undefined
        ? deLabel.thousandSeparator
        : dashboardFormat?.thousandSeparator,
  };
}

export function formatChartValue(
  raw: unknown,
  format: NumberFormatConfig | undefined,
): string {
  return formatMetricValue(raw, format);
}

export function echartsTooltipValueFormatter(format: NumberFormatConfig | undefined) {
  return (params: unknown) => {
    if (params == null) return "";
    if (typeof params === "object" && params !== null && "value" in params) {
      const v = (params as { value: unknown }).value;
      if (Array.isArray(v)) return formatChartValue(v[v.length - 1], format);
      return formatChartValue(v, format);
    }
    return formatChartValue(params, format);
  };
}

export function isNumericCell(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return false;
  const n = Number(value);
  return Number.isFinite(n) && String(value).trim() !== "";
}

export function formatTableCellValue(
  raw: unknown,
  format: NumberFormatConfig | undefined,
): string {
  if (!isNumericCell(raw)) return String(raw ?? "");
  return formatChartValue(raw, format);
}
