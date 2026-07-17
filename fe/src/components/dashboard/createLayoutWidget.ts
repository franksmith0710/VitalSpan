import type { ChartType } from "@/lib/chartViewConfig";
import { isWidgetConfigReady } from "@/lib/chartConfigState";
import {
  DEFAULT_WIDGET_COLSPAN,
  DEFAULT_WIDGET_ROWSPAN,
} from "@/lib/dashboardDnd";
import {
  createScreenBorderWidget,
  createScreenClockWidget,
  type ScreenVisualInsertType,
} from "@/lib/screenVisualAssets";
import {
  defaultChartConfig,
  defaultFilterConfig,
  defaultMediaConfig,
  defaultTabsConfig,
  defaultTextConfig,
  FILTER_CONTROL_META,
  type FilterControlType,
  type LayoutWidget,
} from "./layoutUtils";
import { WIDGET_CHART_LABELS } from "./widgetIcons";

export type FilterInsertPayload = {
  type: "filter";
  controlType: FilterControlType;
};

export type PaletteInsertType =
  | ChartType
  | "filter"
  | FilterInsertPayload
  | "text"
  | "media"
  | "tabs"
  | ScreenVisualInsertType;

const FILTER_WIDGET_TITLES: Record<FilterControlType, string> = {
  text: "文本筛选",
  select: "下拉筛选",
  date: "日期筛选",
  multiselect: "多选筛选",
};

function resolveFilterControlType(type: PaletteInsertType): FilterControlType | null {
  if (type === "filter") return "text";
  if (typeof type === "object" && type.type === "filter") return type.controlType;
  return null;
}

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
  controlType: FilterControlType = "text",
): LayoutWidget {
  const widgetId = crypto.randomUUID();
  const maxOrder = widgets.reduce((m, w) => Math.max(m, w.order), -1);
  const baseConfig = defaultFilterConfig(widgetId);
  return {
    id: widgetId,
    type: "filter",
    title: FILTER_WIDGET_TITLES[controlType] ?? FILTER_CONTROL_META[controlType].label,
    colSpan: at?.colSpan ?? 4,
    rowSpan: at?.rowSpan ?? 2,
    order: maxOrder + 1,
    gridX: at?.gridX,
    gridY: at?.gridY,
    filterConfig: {
      ...baseConfig,
      controlType,
      options: controlType === "select" || controlType === "multiselect" ? baseConfig.options : [],
    },
  };
}

export function createTextWidget(
  widgets: LayoutWidget[],
  at?: { gridX: number; gridY: number; colSpan?: number; rowSpan?: number },
): LayoutWidget {
  const widgetId = crypto.randomUUID();
  const maxOrder = widgets.reduce((m, w) => Math.max(m, w.order), -1);
  return {
    id: widgetId,
    type: "text",
    title: "富文本",
    colSpan: at?.colSpan ?? 6,
    rowSpan: at?.rowSpan ?? 2,
    order: maxOrder + 1,
    gridX: at?.gridX,
    gridY: at?.gridY,
    textConfig: defaultTextConfig(),
  };
}

export function createMediaWidget(
  widgets: LayoutWidget[],
  at?: { gridX: number; gridY: number; colSpan?: number; rowSpan?: number },
): LayoutWidget {
  const widgetId = crypto.randomUUID();
  const maxOrder = widgets.reduce((m, w) => Math.max(m, w.order), -1);
  return {
    id: widgetId,
    type: "media",
    title: "媒体",
    colSpan: at?.colSpan ?? 6,
    rowSpan: at?.rowSpan ?? 3,
    order: maxOrder + 1,
    gridX: at?.gridX,
    gridY: at?.gridY,
    mediaConfig: defaultMediaConfig(),
  };
}

export function createTabsWidget(
  widgets: LayoutWidget[],
  at?: { gridX: number; gridY: number; colSpan?: number; rowSpan?: number },
): LayoutWidget {
  const widgetId = crypto.randomUUID();
  const maxOrder = widgets.reduce((m, w) => Math.max(m, w.order), -1);
  return {
    id: widgetId,
    type: "tabs",
    title: "页签",
    colSpan: at?.colSpan ?? 12,
    rowSpan: at?.rowSpan ?? 4,
    order: maxOrder + 1,
    gridX: at?.gridX,
    gridY: at?.gridY,
    tabsConfig: defaultTabsConfig(widgetId),
  };
}

export function createPaletteWidget(
  type: PaletteInsertType,
  widgets: LayoutWidget[],
  at?: { gridX: number; gridY: number; colSpan?: number; rowSpan?: number },
): LayoutWidget {
  const filterControlType = resolveFilterControlType(type);
  if (filterControlType != null) return createFilterWidget(widgets, at, filterControlType);
  if (type === "text") return createTextWidget(widgets, at);
  if (type === "media") return createMediaWidget(widgets, at);
  if (type === "tabs") return createTabsWidget(widgets, at);
  if (type === "screen-clock") return createScreenClockWidget(widgets, at);
  if (type === "screen-border") return createScreenBorderWidget(widgets, at);
  return createLayoutWidget(type as ChartType, widgets, at);
}

export { isWidgetConfigReady } from "@/lib/chartConfigState";
