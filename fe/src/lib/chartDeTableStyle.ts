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
  /** 斑马纹行背景色（有值即启用斑马纹，对标 DE 色块而非开关） */
  zebraBg?: string;
  /** @deprecated 使用 zebraBg；true 时回退默认斑马纹色 */
  zebraStriped?: boolean;
  /** 列背景（对标 DE「列背景」） */
  columnBg?: string;
  /** 表头左上角/冻结角背景（对标 DE「角背景」） */
  cornerBg?: string;
  /** 无数据提示文字色 */
  emptyHintFg?: string;
  /** 分页器文字/图标色 */
  paginationFg?: string;
  /** 分页器字号 */
  paginationFontSize?: number;
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
export const DEFAULT_TABLE_PAGINATION_FONT_SIZE = 14;
export const DEFAULT_TABLE_ZEBRA_BG = "rgba(148, 163, 184, 0.12)";

export function resolveTableZebraBg(style: ChartDeTableStyle): string | undefined {
  if (style.zebraBg?.trim()) return style.zebraBg;
  if (style.zebraStriped === true) return DEFAULT_TABLE_ZEBRA_BG;
  return undefined;
}

/** 组件 deTableStyle 覆盖看板默认表格配色 */
export function mergeChartTableStyle(
  chartStyle: ChartDeTableStyle,
  dashboardDefaults?: ChartDeTableStyle,
): ChartDeTableStyle {
  if (!dashboardDefaults || Object.keys(dashboardDefaults).length === 0) return chartStyle;
  return { ...dashboardDefaults, ...chartStyle };
}

export function readDashboardTableColorDefaults(
  styleConfig?: { tableColorStyle?: ChartDeTableStyle },
): ChartDeTableStyle {
  return styleConfig?.tableColorStyle ?? {};
}

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
