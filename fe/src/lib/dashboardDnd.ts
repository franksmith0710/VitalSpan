import type { ChartType } from "@/lib/chartViewConfig";

/** HTML5 拖放 MIME；对齐 DataEase/Superset「组件面板 → 画布」 */
export const DASHBOARD_CHART_DND_TYPE = "application/vnd.vitalspan.chart-type";

/** 新组件默认占位（12 列栅格，约半宽 × 3 行） */
export const DEFAULT_WIDGET_COLSPAN = 6;
export const DEFAULT_WIDGET_ROWSPAN = 3;

export function setChartTypeDragData(dataTransfer: DataTransfer, chartType: ChartType): void {
  dataTransfer.setData(DASHBOARD_CHART_DND_TYPE, chartType);
  dataTransfer.effectAllowed = "copy";
}

export function readChartTypeFromDragEvent(event: Event): ChartType | null {
  const dt = (event as DragEvent).dataTransfer;
  if (!dt) return null;
  const raw = dt.getData(DASHBOARD_CHART_DND_TYPE);
  return raw ? (raw as ChartType) : null;
}

export function isChartTypeDragEvent(event: React.DragEvent): boolean {
  return event.dataTransfer.types.includes(DASHBOARD_CHART_DND_TYPE);
}
