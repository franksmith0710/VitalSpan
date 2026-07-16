import type { ChartViewConfig, ChartType } from "@/lib/chartViewConfig";
import { chartInspectorCapabilities } from "@/lib/chartInspectorCapabilities";
import { DEFAULT_CHART_LEGEND_STYLE, readChartDeStyle } from "@/lib/chartDeStyle";
import type { DashboardLayoutV2, LayoutWidget, PixelLayoutWidget } from "./dashboardLayoutContracts";
import type { WidgetStyleConfig } from "./dashboardStyleConfig";

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

export type MediaAlign = "center" | "top" | "bottom" | "left" | "right";

export type MediaWidgetConfig = {
  url: string;
  alt: string;
  fit: MediaFit;
  /** 图片在容器内的锚点（object-position） */
  align?: MediaAlign;
  /** 0–1，默认 1 */
  opacity?: number;
  borderRadius?: number;
  /** 留白区域底色（contain 时可见） */
  background?: string;
  linkUrl?: string;
  linkNewTab?: boolean;
};

export function mediaAlignToObjectPosition(align: MediaAlign = "center"): string {
  const map: Record<MediaAlign, string> = {
    center: "center center",
    top: "center top",
    bottom: "center bottom",
    left: "left center",
    right: "right center",
  };
  return map[align];
}

export function defaultMediaConfig(): MediaWidgetConfig {
  return {
    url: "",
    alt: "",
    fit: "contain",
    align: "center",
    opacity: 1,
    borderRadius: 0,
    background: "",
    linkUrl: "",
    linkNewTab: true,
  };
}

export function normalizeMediaConfig(raw?: Partial<MediaWidgetConfig>): MediaWidgetConfig {
  const defaults = defaultMediaConfig();
  if (!raw) return defaults;
  return {
    ...defaults,
    ...raw,
    url: raw.url ?? defaults.url,
    alt: raw.alt ?? defaults.alt,
    fit: raw.fit ?? defaults.fit,
    align: raw.align ?? defaults.align,
    opacity: raw.opacity ?? defaults.opacity,
    borderRadius: raw.borderRadius ?? defaults.borderRadius,
    background: raw.background ?? defaults.background,
    linkUrl: raw.linkUrl ?? defaults.linkUrl,
    linkNewTab: raw.linkNewTab ?? defaults.linkNewTab,
  };
}

export type TabPaneConfig = {
  id: string;
  title: string;
  childWidgetIds: string[];
};

export type TabsHeadStyleConfig = {
  fontSize?: number;
  activeColor?: string;
  inactiveColor?: string;
  barBackground?: string;
};

export type TabsWidgetConfig = {
  tabsId: string;
  panes: TabPaneConfig[];
  activePaneId: string;
  /** 单组件外框样式（覆盖看板默认 widgetStyle） */
  widgetStyle?: WidgetStyleConfig;
  /** 页签栏外观 */
  headStyle?: TabsHeadStyleConfig;
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

export function defaultTabsConfig(tabsId: string): TabsWidgetConfig {
  const paneA = crypto.randomUUID();
  const paneB = crypto.randomUUID();
  const paneC = crypto.randomUUID();
  return {
    tabsId,
    panes: [
      { id: paneA, title: "页签 1", childWidgetIds: [] },
      { id: paneB, title: "页签 2", childWidgetIds: [] },
      { id: paneC, title: "页签 3", childWidgetIds: [] },
    ],
    activePaneId: paneA,
    headStyle: { fontSize: 14 },
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
            ? "页签"
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
      mediaConfig: normalizeMediaConfig(raw.mediaConfig),
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

/** 像素画布仅渲染顶层 shape；Tab 内子组件在 TabsWidget 内嵌展示 */
export function getTopLevelPixelWidgets(widgets: PixelLayoutWidget[]): PixelLayoutWidget[] {
  return widgets.filter((w) => !w.parentTabsId);
}

export function pointInPixelWidget(
  point: { x: number; y: number },
  widget: Pick<PixelLayoutWidget, "x" | "y" | "width" | "height">,
): boolean {
  return (
    point.x >= widget.x &&
    point.x <= widget.x + widget.width &&
    point.y >= widget.y &&
    point.y <= widget.y + widget.height
  );
}

/** 落点落在组件外扩缓冲区内（对标碰撞轻触区，用于 Tab 投放命中） */
export function pointInPixelWidgetWithBuffer(
  point: { x: number; y: number },
  widget: Pick<PixelLayoutWidget, "x" | "y" | "width" | "height">,
  bufferPx: number,
): boolean {
  const buffer = Math.max(0, bufferPx);
  if (buffer <= 0) return pointInPixelWidget(point, widget);
  return (
    point.x >= widget.x - buffer &&
    point.x <= widget.x + widget.width + buffer &&
    point.y >= widget.y - buffer &&
    point.y <= widget.y + widget.height + buffer
  );
}

/** 拖放落点处的 Tab 容器（多重重叠时取面积最小者，视为最上层） */
export function findTabsHostAtPoint(
  widgets: PixelLayoutWidget[],
  point: { x: number; y: number },
  dropBufferPx = 0,
): PixelLayoutWidget | undefined {
  const hosts = getTopLevelPixelWidgets(widgets).filter(
    (w) =>
      w.type === "tabs" &&
      w.tabsConfig &&
      w.width > 0 &&
      w.height > 0 &&
      pointInPixelWidgetWithBuffer(point, w, dropBufferPx),
  );
  if (hosts.length === 0) return undefined;
  return hosts.reduce((best, w) =>
    w.width * w.height < best.width * best.height ? w : best,
  );
}

/** 插入子组件时解析目标 Tab 宿主：DOM/落点（含缓冲）优先，否则已选中 Tab */
export function resolvePixelTabsHost(
  layout: DashboardLayoutV2,
  selectedWidgetId: string | null | undefined,
  point?: { x: number; y: number },
  tabsWidgetIdFromDom?: string | null,
  dropBufferPx = 0,
): PixelLayoutWidget | undefined {
  if (tabsWidgetIdFromDom) {
    const fromDom = layout.widgets.find((w) => w.id === tabsWidgetIdFromDom);
    if (fromDom?.type === "tabs" && fromDom.tabsConfig) return fromDom;
  }
  if (point) {
    const atPoint = findTabsHostAtPoint(layout.widgets, point, dropBufferPx);
    if (atPoint) return atPoint;
  }
  if (selectedWidgetId) {
    const selected = layout.widgets.find((w) => w.id === selectedWidgetId);
    if (selected?.type === "tabs" && selected.tabsConfig) return selected;
  }
  return undefined;
}

/** Tab 子组件不参与画布占位与碰撞，坐标折叠到容器内 */
export function parkPixelWidgetInTab(
  child: PixelLayoutWidget,
  host: PixelLayoutWidget,
  tabPaneId: string,
): PixelLayoutWidget {
  return {
    ...child,
    parentTabsId: host.id,
    tabPaneId,
    x: host.x,
    y: host.y,
    width: 0,
    height: 0,
  };
}

/** Tab 宿主移动后，同步折叠子组件画布坐标 */
export function syncParkedTabChildren(widgets: PixelLayoutWidget[]): PixelLayoutWidget[] {
  const byId = new Map(widgets.map((w) => [w.id, w]));
  return widgets.map((w) => {
    if (!w.parentTabsId || !w.tabPaneId) return w;
    const host = byId.get(w.parentTabsId);
    if (!host || host.type !== "tabs") return w;
    return parkPixelWidgetInTab(w, host, w.tabPaneId);
  });
}

/** 将已写入 layout 的组件归入 Tab 页签（折叠占位 + 更新 childWidgetIds） */
export function insertPixelWidgetIntoTab(
  layout: DashboardLayoutV2,
  draft: PixelLayoutWidget,
  host: PixelLayoutWidget,
  tabPaneId: string,
): DashboardLayoutV2 {
  if (host.type !== "tabs" || !host.tabsConfig || draft.type === "tabs") {
    return layout;
  }
  const parked = parkPixelWidgetInTab(draft, host, tabPaneId);
  const widgets = layout.widgets.map((w) => {
    if (w.id === draft.id) return parked;
    if (w.id !== host.id || w.type !== "tabs" || !w.tabsConfig) return w;
    const panes = w.tabsConfig.panes.map((pane) =>
      pane.id === tabPaneId && !pane.childWidgetIds.includes(draft.id)
        ? { ...pane, childWidgetIds: [...pane.childWidgetIds, draft.id] }
        : pane,
    );
    return { ...w, tabsConfig: { ...w.tabsConfig, panes } };
  });
  return { ...layout, widgets: syncParkedTabChildren(widgets) };
}

function removeWidgetIdFromTabPanes(
  widgets: PixelLayoutWidget[],
  widgetId: string,
): PixelLayoutWidget[] {
  return widgets.map((w) => {
    if (w.type !== "tabs" || !w.tabsConfig) return w;
    const panes = w.tabsConfig.panes.map((pane) => ({
      ...pane,
      childWidgetIds: pane.childWidgetIds.filter((id) => id !== widgetId),
    }));
    return { ...w, tabsConfig: { ...w.tabsConfig, panes } };
  });
}

/** 将画布顶层已有组件拖入 Tab 页签（先从旧页签摘除，再 park） */
export function movePixelWidgetIntoTab(
  layout: DashboardLayoutV2,
  widgetId: string,
  host: PixelLayoutWidget,
  tabPaneId: string,
): DashboardLayoutV2 {
  const widget = layout.widgets.find((w) => w.id === widgetId);
  if (!widget || widget.type === "tabs" || widget.id === host.id) return layout;
  if (host.type !== "tabs" || !host.tabsConfig) return layout;

  const cleaned: DashboardLayoutV2 = {
    ...layout,
    widgets: removeWidgetIdFromTabPanes(layout.widgets, widgetId),
  };
  const draft = cleaned.widgets.find((w) => w.id === widgetId);
  if (!draft) return layout;
  return insertPixelWidgetIntoTab(cleaned, draft, host, tabPaneId);
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
  const withLegendDefault = (cfg: ChartViewConfig): ChartViewConfig => {
    if (!chartInspectorCapabilities(type).legend) return cfg;
    return {
      ...cfg,
      nativeBody: {
        ...cfg.nativeBody,
        deStyle: {
          ...readChartDeStyle(cfg),
          legend: { ...DEFAULT_CHART_LEGEND_STYLE },
        },
      },
    };
  };
  if (type === "table") {
    return { chartType: "table", ...base, dimensions: [], metrics: [] };
  }
  if (type === "kpi") {
    return withLegendDefault({
      chartType: "kpi",
      ...base,
      dimensions: [],
      metrics: [],
    });
  }
  return withLegendDefault({
    chartType: type,
    ...base,
    dimensions: [],
    metrics: [],
  });
}
