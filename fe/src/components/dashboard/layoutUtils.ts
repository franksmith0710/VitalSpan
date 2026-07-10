import type { ChartViewConfig, ChartType } from "@/lib/chartViewConfig";

export type FilterControlType = "text" | "select" | "date" | "multiselect";

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

export type LayoutWidget = {
  id: string;
  type: "chart" | "filter";
  title: string;
  /** 12 列栅格占位（1–12），与 Superset/DataEase 一致 */
  colSpan: number;
  rowSpan: number;
  order: number;
  /** react-grid-layout 列坐标（0–11），拖拽后持久化 */
  gridX?: number;
  /** react-grid-layout 行坐标 */
  gridY?: number;
  /** 图表组件必填；筛选器可缺省 */
  chartConfig?: ChartViewConfig;
  /** 筛选器组件配置 */
  filterConfig?: FilterWidgetConfig;
};

export type DashboardLayout = {
  version: 1;
  widgets: LayoutWidget[];
  globalFilters: unknown[];
};

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

/** 旧 layout 缺 type / 非法 type → chart；保证 filter 有 filterConfig */
export function coerceLayoutWidget(raw: Partial<LayoutWidget> & { id: string }): LayoutWidget {
  const type: LayoutWidget["type"] = raw.type === "filter" ? "filter" : "chart";
  const base = {
    id: raw.id,
    title: raw.title?.trim() || (type === "filter" ? "筛选器" : "图表"),
    colSpan: raw.colSpan ?? 6,
    rowSpan: raw.rowSpan ?? 1,
    order: raw.order ?? 0,
    gridX: raw.gridX,
    gridY: raw.gridY,
  };
  if (type === "filter") {
    return {
      ...base,
      type: "filter",
      filterConfig: raw.filterConfig ?? defaultFilterConfig(raw.id),
      chartConfig: raw.chartConfig,
    };
  }
  return {
    ...base,
    type: "chart",
    chartConfig: raw.chartConfig ?? defaultChartConfig("bar"),
    filterConfig: raw.filterConfig,
  };
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
    if (w.type === "filter" || !w.chartConfig) return w;
    return {
      ...w,
      chartConfig: { ...w.chartConfig, chartId: w.id },
    };
  });
}

export function isChartWidget(widget: LayoutWidget): widget is LayoutWidget & { chartConfig: ChartViewConfig } {
  return widget.type !== "filter" && Boolean(widget.chartConfig);
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
