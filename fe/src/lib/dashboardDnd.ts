import type { ChartType } from "@/lib/chartViewConfig";

/** HTML5 拖放 MIME；对齐 DataEase/Superset「组件面板 → 画布」 */
export const DASHBOARD_CHART_DND_TYPE = "application/vnd.vitalspan.chart-type";
export const DASHBOARD_FILTER_DND_TYPE = "application/vnd.vitalspan.filter-widget";

/** 新组件默认占位（12 列栅格，约半宽 × 3 行） */
export const DEFAULT_WIDGET_COLSPAN = 6;
export const DEFAULT_WIDGET_ROWSPAN = 3;

export type PaletteDragPayload = ChartType | "filter";

export function setChartTypeDragData(dataTransfer: DataTransfer, chartType: ChartType): void {
  dataTransfer.setData(DASHBOARD_CHART_DND_TYPE, chartType);
  dataTransfer.effectAllowed = "copy";
}

export function setFilterWidgetDragData(dataTransfer: DataTransfer): void {
  dataTransfer.setData(DASHBOARD_FILTER_DND_TYPE, "filter");
  dataTransfer.effectAllowed = "copy";
}

export function setPaletteDragData(dataTransfer: DataTransfer, payload: PaletteDragPayload): void {
  if (payload === "filter") {
    setFilterWidgetDragData(dataTransfer);
    return;
  }
  setChartTypeDragData(dataTransfer, payload);
}

export function readChartTypeFromDragEvent(event: Event): ChartType | null {
  const dt = (event as DragEvent).dataTransfer;
  if (!dt) return null;
  const raw = dt.getData(DASHBOARD_CHART_DND_TYPE);
  return raw ? (raw as ChartType) : null;
}

export function readPaletteDragPayload(event: Event): PaletteDragPayload | null {
  const dt = (event as DragEvent).dataTransfer;
  if (!dt) return null;
  if (dt.getData(DASHBOARD_FILTER_DND_TYPE) === "filter") return "filter";
  return readChartTypeFromDragEvent(event);
}

export function isChartTypeDragEvent(event: React.DragEvent): boolean {
  return event.dataTransfer.types.includes(DASHBOARD_CHART_DND_TYPE);
}

export const FILTER_WIDGET_COLSPAN = 4;
export const FILTER_WIDGET_ROWSPAN = 2;

export function paletteDropSize(payload: PaletteDragPayload): { w: number; h: number } {
  if (payload === "filter") {
    return { w: FILTER_WIDGET_COLSPAN, h: FILTER_WIDGET_ROWSPAN };
  }
  return { w: DEFAULT_WIDGET_COLSPAN, h: DEFAULT_WIDGET_ROWSPAN };
}

export function isPaletteDragEvent(event: React.DragEvent): boolean {
  const types = event.dataTransfer.types;
  return types.includes(DASHBOARD_CHART_DND_TYPE) || types.includes(DASHBOARD_FILTER_DND_TYPE);
}

export function isNativePaletteDragEvent(event: DragEvent): boolean {
  const types = event.dataTransfer?.types;
  if (!types) return false;
  const list = Array.from(types);
  return list.includes(DASHBOARD_CHART_DND_TYPE) || list.includes(DASHBOARD_FILTER_DND_TYPE);
}
