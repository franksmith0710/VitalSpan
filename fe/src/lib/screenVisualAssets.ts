import {
  defaultTextConfig,
  defaultMediaConfig,
  type LayoutWidget,
} from "@/components/dashboard/layoutUtils";
import { formatScreenWeekday } from "@/lib/screenTokens";
import type {
  ScreenBorderVariant,
  ScreenShapeKind,
} from "@/lib/screenVisualStyle";

/** 文本组件 content 魔术标记（无需后端 schema 扩展） */
export const SCREEN_CLOCK_MARKER = "__vs_screen_clock__";
export const SCREEN_BORDER_MARKER = "__vs_screen_border__";
export const SCREEN_TITLE_BAR_MARKER = "__vs_screen_title_bar__";
export const SCREEN_DATETIME_MARKER = "__vs_screen_datetime__";
export const SCREEN_SHAPE_MARKER = "__vs_screen_shape__";
export const SCREEN_ICON_MARKER = "__vs_screen_icon__";

export type ScreenVisualInsertType =
  | "screen-clock"
  | "screen-border"
  | "screen-title-bar"
  | "screen-datetime";

export type ScreenMaterialInsertType = ScreenVisualInsertType | "screen-webpage";

export function isScreenVisualInsertType(
  type: string,
): type is ScreenVisualInsertType {
  return (
    type === "screen-clock" ||
    type === "screen-border" ||
    type === "screen-title-bar" ||
    type === "screen-datetime"
  );
}

export function isScreenMaterialInsertType(
  type: string,
): type is ScreenMaterialInsertType {
  return isScreenVisualInsertType(type) || type === "screen-webpage";
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

export function isScreenDateTimeWidget(
  widget: Pick<LayoutWidget, "type" | "textConfig">,
): boolean {
  return (
    widget.type === "text" &&
    widget.textConfig?.content === SCREEN_DATETIME_MARKER
  );
}

export function isScreenShapeWidget(
  widget: Pick<LayoutWidget, "type" | "textConfig">,
): boolean {
  return (
    widget.type === "text" &&
    widget.textConfig?.content === SCREEN_SHAPE_MARKER
  );
}

export function isScreenIconWidget(
  widget: Pick<LayoutWidget, "type" | "textConfig">,
): boolean {
  return (
    widget.type === "text" &&
    widget.textConfig?.content === SCREEN_ICON_MARKER
  );
}

export function isScreenWebpageWidget(
  widget: Pick<LayoutWidget, "type" | "mediaConfig">,
): boolean {
  return widget.type === "media" && widget.mediaConfig?.kind === "webpage";
}

export function isScreenVisualWidget(
  widget: Pick<LayoutWidget, "type" | "textConfig">,
): boolean {
  return (
    isScreenClockWidget(widget) ||
    isScreenBorderWidget(widget) ||
    isScreenDateTimeWidget(widget) ||
    isScreenShapeWidget(widget) ||
    isScreenIconWidget(widget)
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
  widget: Pick<LayoutWidget, "type" | "title" | "textConfig" | "mediaConfig">,
): string {
  if (isScreenClockWidget(widget)) return "素材 · 时钟";
  if (isScreenBorderWidget(widget)) return "素材 · 边框";
  if (isScreenTitleBarWidget(widget)) return widget.title || "标题条";
  if (isScreenDateTimeWidget(widget)) return "素材 · 日期时间";
  if (isScreenShapeWidget(widget)) return "素材 · 图形";
  if (isScreenIconWidget(widget)) return "素材 · 图标";
  if (isScreenWebpageWidget(widget)) return "素材 · 网页";
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
  variant: string = "border-1",
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
      screenStyle: {
        border: { variant: variant as ScreenBorderVariant },
      },
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
    title: "标题条",
    colSpan: at?.colSpan ?? 12,
    rowSpan: at?.rowSpan ?? 1,
    order: maxOrder + 1,
    gridX: at?.gridX,
    gridY: at?.gridY,
    textConfig: {
      ...defaultTextConfig(),
      content: "",
      variant: "plain",
      widgetStyle: {
        backgroundShow: true,
        backgroundMode: "image",
        backgroundImage:
          "/template-assets/packs/borderless-decor-v1/items/decor-bow-deep-cyan.svg",
        backgroundImageOpacity: 1,
      },
    },
  };
}

export function createScreenDateTimeWidget(
  widgets: LayoutWidget[],
  at?: { gridX: number; gridY: number; colSpan?: number; rowSpan?: number },
): LayoutWidget {
  const widgetId = crypto.randomUUID();
  const maxOrder = widgets.reduce((m, w) => Math.max(m, w.order), -1);
  return {
    id: widgetId,
    type: "text",
    title: "日期时间",
    colSpan: at?.colSpan ?? 6,
    rowSpan: at?.rowSpan ?? 1,
    order: maxOrder + 1,
    gridX: at?.gridX,
    gridY: at?.gridY,
    textConfig: {
      ...defaultTextConfig(),
      content: SCREEN_DATETIME_MARKER,
      variant: "plain",
    },
  };
}

export function createScreenWebpageWidget(
  widgets: LayoutWidget[],
  at?: { gridX: number; gridY: number; colSpan?: number; rowSpan?: number },
): LayoutWidget {
  const widgetId = crypto.randomUUID();
  const maxOrder = widgets.reduce((m, w) => Math.max(m, w.order), -1);
  return {
    id: widgetId,
    type: "media",
    title: "网页",
    colSpan: at?.colSpan ?? 8,
    rowSpan: at?.rowSpan ?? 4,
    order: maxOrder + 1,
    gridX: at?.gridX,
    gridY: at?.gridY,
    mediaConfig: {
      ...defaultMediaConfig(),
      kind: "webpage",
      url: "",
      alt: "网页",
      fit: "fill",
    },
  };
}

export function createScreenShapeWidget(
  widgets: LayoutWidget[],
  at?: { gridX: number; gridY: number; colSpan?: number; rowSpan?: number },
  shape: string = "rect",
): LayoutWidget {
  const widgetId = crypto.randomUUID();
  const maxOrder = widgets.reduce((m, w) => Math.max(m, w.order), -1);
  const shapeKind = shape as ScreenShapeKind;
  const label = shapeKind === "rect" ? "矩形" : shapeKind === "triangle" ? "三角形" : "圆形";
  return {
    id: widgetId,
    type: "text",
    title: label,
    colSpan: at?.colSpan ?? 4,
    rowSpan: at?.rowSpan ?? 3,
    order: maxOrder + 1,
    gridX: at?.gridX,
    gridY: at?.gridY,
    textConfig: {
      ...defaultTextConfig(),
      content: SCREEN_SHAPE_MARKER,
      variant: "plain",
      screenStyle: {
        shape: { shape: shapeKind },
      },
    },
  };
}

export function createScreenIconWidget(
  widgets: LayoutWidget[],
  at?: { gridX: number; gridY: number; colSpan?: number; rowSpan?: number },
  icon: string = "star",
): LayoutWidget {
  const widgetId = crypto.randomUUID();
  const maxOrder = widgets.reduce((m, w) => Math.max(m, w.order), -1);
  return {
    id: widgetId,
    type: "text",
    title: "图标",
    colSpan: at?.colSpan ?? 2,
    rowSpan: at?.rowSpan ?? 2,
    order: maxOrder + 1,
    gridX: at?.gridX,
    gridY: at?.gridY,
    textConfig: {
      ...defaultTextConfig(),
      content: SCREEN_ICON_MARKER,
      variant: "plain",
      screenStyle: {
        icon: { icon },
      },
    },
  };
}
