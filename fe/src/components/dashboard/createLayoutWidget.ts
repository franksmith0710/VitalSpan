import type { ChartType } from "@/lib/chartViewConfig";
import {
  DEFAULT_WIDGET_COLSPAN,
  DEFAULT_WIDGET_ROWSPAN,
} from "@/lib/dashboardDnd";
import {
  defaultChartConfig,
  defaultFilterConfig,
  type LayoutWidget,
} from "./layoutUtils";
import { WIDGET_CHART_LABELS } from "./widgetIcons";

export type PaletteInsertType = ChartType | "filter";

export function createLayoutWidget(
  type: ChartType,
  widgets: LayoutWidget[],
  at?: { gridX: number; gridY: number; colSpan?: number; rowSpan?: number },
): LayoutWidget {
  const widgetId = crypto.randomUUID();
  const maxOrder = widgets.reduce((m, w) => Math.max(m, w.order), -1);
  return {
    id: widgetId,
    type: "chart",
    title: WIDGET_CHART_LABELS[type] ?? type,
    colSpan: at?.colSpan ?? DEFAULT_WIDGET_COLSPAN,
    rowSpan: at?.rowSpan ?? DEFAULT_WIDGET_ROWSPAN,
    order: maxOrder + 1,
    gridX: at?.gridX,
    gridY: at?.gridY,
    chartConfig: { ...defaultChartConfig(type), chartId: widgetId },
  };
}

export function createFilterWidget(
  widgets: LayoutWidget[],
  at?: { gridX: number; gridY: number; colSpan?: number; rowSpan?: number },
): LayoutWidget {
  const widgetId = crypto.randomUUID();
  const maxOrder = widgets.reduce((m, w) => Math.max(m, w.order), -1);
  return {
    id: widgetId,
    type: "filter",
    title: "筛选器",
    colSpan: at?.colSpan ?? 4,
    rowSpan: at?.rowSpan ?? 2,
    order: maxOrder + 1,
    gridX: at?.gridX,
    gridY: at?.gridY,
    filterConfig: defaultFilterConfig(widgetId),
  };
}

export function createPaletteWidget(
  type: PaletteInsertType,
  widgets: LayoutWidget[],
  at?: { gridX: number; gridY: number; colSpan?: number; rowSpan?: number },
): LayoutWidget {
  if (type === "filter") return createFilterWidget(widgets, at);
  return createLayoutWidget(type, widgets, at);
}

export function isWidgetConfigReady(chartConfig: LayoutWidget["chartConfig"]): boolean {
  if (!chartConfig?.dataSourceId) return false;
  if (chartConfig.mode === "dataset") {
    return Boolean(chartConfig.configId || chartConfig.datasetId);
  }
  return Boolean(chartConfig.sql?.trim());
}
