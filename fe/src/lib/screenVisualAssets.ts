import {
  defaultTextConfig,
  type LayoutWidget,
} from "@/components/dashboard/layoutUtils";
import { formatScreenWeekday } from "@/lib/screenTokens";

/** 文本组件 content 魔术标记（无需后端 schema 扩展） */
export const SCREEN_CLOCK_MARKER = "__vs_screen_clock__";
export const SCREEN_BORDER_MARKER = "__vs_screen_border__";
export const SCREEN_TITLE_BAR_MARKER = "__vs_screen_title_bar__";

export type ScreenVisualInsertType = "screen-clock" | "screen-border" | "screen-title-bar";

export function isScreenVisualInsertType(
  type: string,
): type is ScreenVisualInsertType {
  return type === "screen-clock" || type === "screen-border" || type === "screen-title-bar";
}

export function isScreenClockWidget(
  widget: Pick<LayoutWidget, "type" | "textConfig">,
): boolean {
  return (
    widget.type === "text" &&
    widget.textConfig?.content === SCREEN_CLOCK_MARKER
  );
}

export function isScreenBorderWidget(
  widget: Pick<LayoutWidget, "type" | "textConfig">,
): boolean {
  return (
    widget.type === "text" &&
    widget.textConfig?.content === SCREEN_BORDER_MARKER
  );
}

export function isScreenTitleBarWidget(
  widget: Pick<LayoutWidget, "type" | "textConfig">,
): boolean {
  return (
    widget.type === "text" &&
    widget.textConfig?.content === SCREEN_TITLE_BAR_MARKER
  );
}

export function isScreenVisualWidget(
  widget: Pick<LayoutWidget, "type" | "textConfig">,
): boolean {
  return (
    isScreenClockWidget(widget) ||
    isScreenBorderWidget(widget) ||
    isScreenTitleBarWidget(widget)
  );
}

export function formatScreenClock(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function formatScreenClockWithWeekday(date: Date): { time: string; weekday: string } {
  return {
    time: formatScreenClock(date),
    weekday: formatScreenWeekday(date),
  };
}

export function resolveScreenWidgetLayerLabel(
  widget: Pick<LayoutWidget, "type" | "title" | "textConfig">,
): string {
  if (isScreenClockWidget(widget)) return "素材 · 时钟";
  if (isScreenBorderWidget(widget)) return "素材 · 边框";
  if (isScreenTitleBarWidget(widget)) return "素材 · 标题装饰";
  if (widget.type === "chart") return widget.title || "图表";
  return widget.title || widgetTypeFallback(widget.type);
}

function widgetTypeFallback(type: LayoutWidget["type"]): string {
  switch (type) {
    case "filter":
      return "筛选";
    case "text":
      return "文本";
    case "media":
      return "媒体";
    case "tabs":
      return "页签";
    default:
      return type;
  }
}

export function createScreenClockWidget(
  widgets: LayoutWidget[],
  at?: { gridX: number; gridY: number; colSpan?: number; rowSpan?: number },
): LayoutWidget {
  const widgetId = crypto.randomUUID();
  const maxOrder = widgets.reduce((m, w) => Math.max(m, w.order), -1);
  return {
    id: widgetId,
    type: "text",
    title: "时钟",
    colSpan: at?.colSpan ?? 6,
    rowSpan: at?.rowSpan ?? 1,
    order: maxOrder + 1,
    gridX: at?.gridX,
    gridY: at?.gridY,
    textConfig: {
      ...defaultTextConfig(),
      content: SCREEN_CLOCK_MARKER,
      variant: "plain",
    },
  };
}

export function createScreenBorderWidget(
  widgets: LayoutWidget[],
  at?: { gridX: number; gridY: number; colSpan?: number; rowSpan?: number },
): LayoutWidget {
  const widgetId = crypto.randomUUID();
  const maxOrder = widgets.reduce((m, w) => Math.max(m, w.order), -1);
  return {
    id: widgetId,
    type: "text",
    title: "边框装饰",
    colSpan: at?.colSpan ?? 8,
    rowSpan: at?.rowSpan ?? 4,
    order: maxOrder + 1,
    gridX: at?.gridX,
    gridY: at?.gridY,
    textConfig: {
      ...defaultTextConfig(),
      content: SCREEN_BORDER_MARKER,
      variant: "plain",
    },
  };
}

export function createScreenTitleBarWidget(
  widgets: LayoutWidget[],
  at?: { gridX: number; gridY: number; colSpan?: number; rowSpan?: number },
): LayoutWidget {
  const widgetId = crypto.randomUUID();
  const maxOrder = widgets.reduce((m, w) => Math.max(m, w.order), -1);
  return {
    id: widgetId,
    type: "text",
    title: "标题装饰",
    colSpan: at?.colSpan ?? 12,
    rowSpan: at?.rowSpan ?? 1,
    order: maxOrder + 1,
    gridX: at?.gridX,
    gridY: at?.gridY,
    textConfig: {
      ...defaultTextConfig(),
      content: SCREEN_TITLE_BAR_MARKER,
      variant: "plain",
    },
  };
}
