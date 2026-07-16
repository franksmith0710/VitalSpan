import type { ChartViewConfig } from "@/lib/chartViewConfig";

export type TablePaginationMode = "page" | "scroll";
export type TablePaginationVariant = "compact" | "normal";
export type TableColumnWidthMode = "auto" | "fixed" | "custom";

export type ChartDeTableStyle = {
  /** 0–100，组件整体不透明度 */
  opacity?: number;
  /** 表头背景（对标 DE 表格配色） */
  headerBg?: string;
  /** 表头文字色 */
  headerFg?: string;
  /** 单元格背景 */
  bodyBg?: string;
  /** 单元格文字色 */
  bodyFg?: string;
  /** 汇总行背景 */
  summaryBg?: string;
  /** 汇总行文字色 */
  summaryFg?: string;
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
  /** 是否显示底部汇总行；undefined 时在存在可汇总列时自动显示 */
  showSummary?: boolean;
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

function isNumericCell(value: unknown): boolean {
  if (value == null || value === "") return false;
  const n = Number(value);
  return Number.isFinite(n);
}

/** 确定参与汇总的列：指标列优先，否则自动识别数值列 */
export function resolveTableSummaryColumns(
  columns: string[],
  displayCols: string[],
  rows: unknown[][],
  options: { metricFields?: string[]; showSummary?: boolean },
): string[] {
  if (options.showSummary === false) return [];
  const metricCols = (options.metricFields ?? []).filter((field) => displayCols.includes(field));
  if (metricCols.length > 0) return metricCols;
  if (options.showSummary === true) {
    return displayCols.filter((col) => {
      const idx = columns.indexOf(col);
      if (idx < 0) return false;
      return rows.some((row) => isNumericCell(row[idx]));
    });
  }
  return [];
}

export function computeTableSummaryValues(
  columns: string[],
  displayCols: string[],
  rows: unknown[][],
  summaryCols: string[],
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const col of displayCols) {
    if (!summaryCols.includes(col)) {
      values[col] = null;
      continue;
    }
    const idx = columns.indexOf(col);
    let sum = 0;
    let any = false;
    for (const row of rows) {
      const raw = idx >= 0 ? row[idx] : undefined;
      if (!isNumericCell(raw)) continue;
      sum += Number(raw);
      any = true;
    }
    values[col] = any ? sum : null;
  }
  return values;
}
