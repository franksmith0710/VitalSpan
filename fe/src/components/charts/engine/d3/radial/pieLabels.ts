import type { NumberFormatConfig } from "@/components/dashboard/dashboardStyleConfig";
import type { ChartLabelStyle } from "@/lib/chartDeStyle";
import { formatChartValue } from "@/lib/chartValueFormat";

export type PieLabelRenderOptions = {
  position: "inside" | "outside";
  showDimension: boolean;
  showIndicator: boolean;
  showPercent: boolean;
  percentDecimals: number;
};

export function resolvePieLabelRenderOptions(
  label: ChartLabelStyle | undefined,
): PieLabelRenderOptions {
  return {
    position: label?.position === "outside" ? "outside" : "inside",
    showDimension: label?.showDimension === true,
    showIndicator: label?.showIndicator !== false,
    showPercent: label?.showPercent === true,
    percentDecimals: label?.percentDecimals ?? label?.ratioDecimals ?? 2,
  };
}

export function formatPieSliceLabel(
  row: Record<string, unknown>,
  colorField: string,
  angleField: string,
  total: number,
  opts: PieLabelRenderOptions,
  valueFormat: NumberFormatConfig | undefined,
): string {
  const parts: string[] = [];
  if (opts.showDimension) {
    const dim = String(row[colorField] ?? "").trim();
    if (dim) parts.push(dim);
  }
  if (opts.showIndicator) {
    parts.push(formatChartValue(row[angleField], valueFormat));
  }
  if (opts.showPercent) {
    const v = Number(row[angleField] ?? 0);
    const pct = total > 0 ? (v / total) * 100 : 0;
    parts.push(`${pct.toFixed(opts.percentDecimals)}%`);
  }
  return parts.join(opts.position === "outside" ? " " : "\n");
}
