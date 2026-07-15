import type { ChartViewConfig } from "@/lib/chartViewConfig";

export type TablePaginationMode = "page" | "scroll";
export type TablePaginationVariant = "compact" | "normal";
export type TableColumnWidthMode = "auto" | "fixed" | "custom";

export type ChartDeTableStyle = {
  /** 0–100，组件整体不透明度 */
  opacity?: number;
  scrollbarColor?: string;
  borderColor?: string;
  paginationMode?: TablePaginationMode;
  pageSize?: 20 | 50 | 100;
  paginationVariant?: TablePaginationVariant;
  columnWidthMode?: TableColumnWidthMode;
  /** 自定义列宽：列名 → 百分比 */
  columnWidths?: Record<string, number>;
  wordWrap?: boolean;
  rowHover?: boolean;
};

export const DEFAULT_TABLE_PAGE_SIZE = 20;

export function readChartDeTableStyle(cfg: ChartViewConfig): ChartDeTableStyle {
  const raw = cfg.nativeBody?.deTableStyle;
  if (!raw || typeof raw !== "object") return {};
  return raw as ChartDeTableStyle;
}

export function patchChartDeTableStyle(
  cfg: ChartViewConfig,
  patch: Partial<ChartDeTableStyle>,
): ChartViewConfig {
  const prev = readChartDeTableStyle(cfg);
  return {
    ...cfg,
    nativeBody: {
      ...cfg.nativeBody,
      deTableStyle: { ...prev, ...patch },
    },
  };
}

export function resolveTablePageSize(cfg: ChartViewConfig): number {
  return readChartDeTableStyle(cfg).pageSize ?? DEFAULT_TABLE_PAGE_SIZE;
}
