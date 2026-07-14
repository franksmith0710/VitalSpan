import type { ChartViewConfig, ChartType } from "@/lib/chartViewConfig";
import type { LayoutWidget } from "./dashboardLayoutContracts";

export type {
  DashboardCanvas,
  DashboardLayout,
  DashboardLayoutV1,
  DashboardLayoutV2,
  DashboardWidgetBase,
  LayoutWidget,
  PixelLayoutWidget,
} from "./dashboardLayoutContracts";

export type FilterControlType = "text" | "select" | "date" | "multiselect";

export const FILTER_CONTROL_META: Record<FilterControlType, { label: string }> = {
  text: { label: "文本" },
  select: { label: "下拉" },
  date: { label: "日期" },
  multiselect: { label: "多选" },
};

export const FILTER_CONTROL_TYPES = Object.keys(FILTER_CONTROL_META) as FilterControlType[];

export type FilterOption = {
  label: string;
  value: string;
};

export type FilterWidgetConfig = {
  filterId: string;
  dimensionRef: string;
  controlType: FilterControlType;
  defaultValue?: string | null;
  options?: FilterOption[];
  parameterKey?: string;
};

export type TextVariant = "markdown" | "plain" | "html";

export type TextWidgetConfig = {
  content: string;
  variant: TextVariant;
  datasetId?: string;
  dimensionField?: string;
  metricField?: string;
};

export type MediaFit = "contain" | "cover" | "fill";

export type MediaWidgetConfig = {
  url: string;
  alt: string;
  fit: MediaFit;
};

export type TabPaneConfig = {
  id: string;
  title: string;
  childWidgetIds: string[];
};

export type TabsWidgetConfig = {
  tabsId: string;
  panes: TabPaneConfig[];
  activePaneId: string;
};

export type {
  DashboardStyleConfig,
  GapPreset,
  ScaleMode,
  WidgetStyleConfig,
  TitleStyleConfig,
  FilterChromeStyleConfig,
  FilterControlStyleConfig,
  NumberFormatConfig,
} from "./dashboardStyleConfig";
export {
  GAP_PRESET_PX,
  resolveWidgetGap,
  resolvePixelGutter,
  resolveQueryLimit,
  styleConfigHasPersistedFields,
  CANVAS_BG_SWATCHES,
} from "./dashboardStyleConfig";

export type WidgetType = "chart" | "filter" | "text" | "media" | "tabs";

export function defaultTextConfig(): TextWidgetConfig {
  return { content: "", variant: "html" };
}

export function defaultMediaConfig(): MediaWidgetConfig {
  return { url: "", alt: "", fit: "contain" };
}

export function defaultTabsConfig(tabsId: string): TabsWidgetConfig {
  const paneA = crypto.randomUUID();
  const paneB = crypto.randomUUID();
  return {
    tabsId,
    panes: [
      { id: paneA, title: "Tab 1", childWidgetIds: [] },
      { id: paneB, title: "Tab 2", childWidgetIds: [] },
    ],
    activePaneId: paneA,
  };
}

export function defaultFilterConfig(filterId: string): FilterWidgetConfig {
  return {
    filterId,
    dimensionRef: "region",
    controlType: "text",
    defaultValue: "",
    options: [],
    parameterKey: "region",
  };
}

/** 旧 layout 缺 type / 非法 type → chart；按 type 补齐 config */
export function coerceLayoutWidget(raw: Partial<LayoutWidget> & { id: string }): LayoutWidget {
  const type: WidgetType =
    raw.type === "filter" ||
    raw.type === "text" ||
    raw.type === "media" ||
    raw.type === "tabs"
      ? raw.type
      : "chart";
  const defaultTitle =
    type === "filter"
      ? "筛选器"
      : type === "text"
        ? "富文本"
        : type === "media"
          ? "媒体"
          : type === "tabs"
            ? "Tab"
            : "图表";
  const base = {
    id: raw.id,
    title: raw.title?.trim() || defaultTitle,
    colSpan: raw.colSpan ?? 6,
    rowSpan: raw.rowSpan ?? (type === "text" ? 2 : type === "media" ? 3 : 1),
    order: raw.order ?? 0,
    gridX: raw.gridX,
    gridY: raw.gridY,
    parentTabsId: raw.parentTabsId,
    tabPaneId: raw.tabPaneId,
  };
  if (type === "filter") {
    return {
      ...base,
      type: "filter",
      filterConfig: raw.filterConfig ?? defaultFilterConfig(raw.id),
    };
  }
  if (type === "text") {
    return {
      ...base,
      type: "text",
      textConfig: raw.textConfig ?? defaultTextConfig(),
    };
  }
  if (type === "media") {
    return {
      ...base,
      type: "media",
      mediaConfig: raw.mediaConfig ?? defaultMediaConfig(),
    };
  }
  if (type === "tabs") {
    return {
      ...base,
      type: "tabs",
      tabsConfig: raw.tabsConfig ?? defaultTabsConfig(raw.id),
    };
  }
  return {
    ...base,
    type: "chart",
    chartConfig: raw.chartConfig ?? defaultChartConfig("bar"),
  };
}

export function getTopLevelWidgets(widgets: LayoutWidget[]): LayoutWidget[] {
  return widgets.filter((w) => !w.parentTabsId);
}

export function getTabChildWidgets(widgets: LayoutWidget[], tabsWidgetId: string, paneId: string): LayoutWidget[] {
  const tabs = widgets.find((w) => w.id === tabsWidgetId && w.type === "tabs" && w.tabsConfig);
  if (!tabs?.tabsConfig) return [];
  const pane = tabs.tabsConfig.panes.find((p) => p.id === paneId);
  if (!pane) return [];
  const idSet = new Set(pane.childWidgetIds);
  return widgets.filter((w) => idSet.has(w.id));
}

export function appendWidgetToTabPane(
  widgets: LayoutWidget[],
  tabsWidgetId: string,
  paneId: string,
  childId: string,
): LayoutWidget[] {
  return widgets.map((w) => {
    if (w.id !== tabsWidgetId || w.type !== "tabs" || !w.tabsConfig) return w;
    const panes = w.tabsConfig.panes.map((pane) =>
      pane.id === paneId ? { ...pane, childWidgetIds: [...pane.childWidgetIds, childId] } : pane,
    );
    return { ...w, tabsConfig: { ...w.tabsConfig, panes } };
  });
}

export function coerceLayoutWidgets(widgets: Array<Partial<LayoutWidget> & { id: string }>): LayoutWidget[] {
  return widgets.map(coerceLayoutWidget);
}

export function sortWidgets(widgets: LayoutWidget[]): LayoutWidget[] {
  return [...widgets].sort((a, b) => a.order - b.order);
}

export function moveWidget(widgets: LayoutWidget[], id: string, direction: "up" | "down"): LayoutWidget[] {
  const sorted = sortWidgets(widgets);
  const idx = sorted.findIndex((w) => w.id === id);
  if (idx < 0) return widgets;
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= sorted.length) return widgets;
  const next = [...sorted];
  const aOrder = next[idx].order;
  next[idx] = { ...next[idx], order: next[swapIdx].order };
  next[swapIdx] = { ...next[swapIdx], order: aOrder };
  return next;
}

export function resizeWidget(
  widgets: LayoutWidget[],
  id: string,
  patch: Partial<Pick<LayoutWidget, "colSpan" | "rowSpan" | "title">>,
): LayoutWidget[] {
  return widgets.map((w) => (w.id === id ? { ...w, ...patch } : w));
}

export function normalizeWidgetIds(widgets: LayoutWidget[]): LayoutWidget[] {
  return widgets.map((w) => {
    if (w.type !== "chart" || !w.chartConfig) return w;
    return {
      ...w,
      chartConfig: { ...w.chartConfig, chartId: w.id },
    };
  });
}

export function isChartWidget(widget: LayoutWidget): widget is LayoutWidget & { chartConfig: ChartViewConfig } {
  return widget.type === "chart" && Boolean(widget.chartConfig);
}

export function isFilterWidget(
  widget: LayoutWidget,
): widget is LayoutWidget & { type: "filter"; filterConfig: FilterWidgetConfig } {
  return widget.type === "filter" && Boolean(widget.filterConfig);
}

export function defaultChartConfig(type: ChartType): ChartViewConfig {
  const base = {
    dataSourceId: "",
    mode: "dataset" as const,
  };
  if (type === "table") {
    return { chartType: "table", ...base, dimensions: [], metrics: [] };
  }
  if (type === "map") {
    return {
      chartType: "map",
      ...base,
      dimensions: [{ field: "region" }],
      metrics: [{ field: "value" }],
    };
  }
  if (type === "heatmap") {
    return {
      chartType: "heatmap",
      ...base,
      dimensions: [{ field: "x" }, { field: "y" }],
      metrics: [{ field: "v" }],
    };
  }
  if (type === "kpi") {
    return {
      chartType: "kpi",
      ...base,
      dimensions: [],
      metrics: [{ field: "total" }, { field: "rate" }],
    };
  }
  if (type === "timeline") {
    return {
      chartType: "timeline",
      ...base,
      dimensions: [{ field: "t" }],
      metrics: [{ field: "v" }],
    };
  }
  return {
    chartType: type,
    ...base,
    dimensions: [{ field: "x" }],
    metrics: [{ field: "y" }],
  };
}
