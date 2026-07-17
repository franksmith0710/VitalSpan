import {
  isScreenBorderWidget,
  isScreenClockWidget,
} from "@/lib/screenVisualAssets";
import {
  createPaletteWidget,
  type PaletteInsertType,
} from "../createLayoutWidget";
import { cloneLayoutWidget } from "../cloneLayoutWidget";
import { findNextOpenSlot, resolvePixelCollisions } from "./collisionLayout";
import { pixelWidgetToLayoutWidget } from "../dashboardCanvasMode";
import type { DashboardLayoutV2, LayoutWidget, PixelLayoutWidget } from "../layoutUtils";
import { getTopLevelPixelWidgets, insertPixelWidgetIntoTab } from "../layoutUtils";
import type { PixelPoint, PixelRect } from "./geometry";

/** 1440 基准画布上的默认插入尺寸（约 1/3 宽 × 适中高，编辑态更易辨认） */
export const PIXEL_DEFAULT_CHART_SIZE = { width: 480, height: 300 };
export const PIXEL_DEFAULT_FILTER_SIZE = { width: 320, height: 140 };
export const PIXEL_DEFAULT_TEXT_SIZE = { width: 480, height: 180 };
export const PIXEL_DEFAULT_MEDIA_SIZE = { width: 480, height: 300 };
export const PIXEL_DEFAULT_TABS_SIZE = { width: 720, height: 320 };
export const PIXEL_DEFAULT_SCREEN_CLOCK_SIZE = { width: 420, height: 72 };
export const PIXEL_DEFAULT_SCREEN_BORDER_SIZE = { width: 560, height: 360 };

export function defaultPixelSizeForWidget(
  widget: Pick<LayoutWidget, "type">,
): { width: number; height: number } {
  return defaultSize({ type: widget.type } as LayoutWidget);
}

function defaultSize(widget: LayoutWidget) {
  switch (widget.type) {
    case "filter":
      return PIXEL_DEFAULT_FILTER_SIZE;
    case "text":
      if (isScreenClockWidget(widget)) return PIXEL_DEFAULT_SCREEN_CLOCK_SIZE;
      if (isScreenBorderWidget(widget)) return PIXEL_DEFAULT_SCREEN_BORDER_SIZE;
      return PIXEL_DEFAULT_TEXT_SIZE;
    case "media":
      return PIXEL_DEFAULT_MEDIA_SIZE;
    case "tabs":
      return PIXEL_DEFAULT_TABS_SIZE;
    default:
      return PIXEL_DEFAULT_CHART_SIZE;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function placeInNextOpenSlot(
  size: { width: number; height: number },
  widgets: PixelLayoutWidget[],
  canvas: DashboardCanvas,
): Pick<PixelLayoutWidget, "x" | "y" | "width" | "height"> {
  const width = Math.min(size.width, canvas.width);
  const height = Math.min(size.height, canvas.height);
  const slot = findNextOpenSlot(
    { width, height },
    widgets.map((widget) => ({
      x: widget.x,
      y: widget.y,
      width: widget.width,
      height: widget.height,
    })),
    canvas,
  );
  return {
    x: Math.round(slot.x),
    y: Math.round(slot.y),
    width,
    height,
  };
}

function placeAtPoint(
  size: { width: number; height: number },
  canvas: DashboardCanvas,
  point: PixelPoint,
): Pick<PixelLayoutWidget, "x" | "y" | "width" | "height"> {
  const width = Math.min(size.width, canvas.width);
  const height = Math.min(size.height, canvas.height);
  const x = clamp(Math.round(point.x - width / 2), 0, Math.max(0, canvas.width - width));
  const y = clamp(Math.round(point.y - height / 2), 0, Math.max(0, canvas.height - height));
  return { x, y, width, height };
}

function buildDraftWidget(
  type: PaletteInsertType,
  widgets: PixelLayoutWidget[],
  placement: Pick<PixelLayoutWidget, "x" | "y" | "width" | "height">,
): PixelLayoutWidget {
  const legacy = createPaletteWidget(
    type,
    widgets.map((widget) => ({
      ...widget,
      colSpan: 1,
      rowSpan: 1,
      gridX: undefined,
      gridY: undefined,
    })),
  );
  const { colSpan: _colSpan, rowSpan: _rowSpan, gridX: _gridX, gridY: _gridY, ...base } =
    legacy;
  return { ...base, ...placement };
}

function resolveInsert(
  layout: DashboardLayoutV2,
  draft: PixelLayoutWidget,
): DashboardLayoutV2 {
  return resolvePixelCollisions(
    { ...layout, widgets: [...layout.widgets, draft] },
    draft.id,
    {
      x: draft.x,
      y: draft.y,
      width: draft.width,
      height: draft.height,
    },
  );
}

export function clonePixelLayoutWidget(
  source: PixelLayoutWidget,
  widgets: PixelLayoutWidget[],
): PixelLayoutWidget {
  const legacyWidgets = widgets.map(pixelWidgetToLayoutWidget);
  const cloned = cloneLayoutWidget(pixelWidgetToLayoutWidget(source), legacyWidgets);
  const {
    colSpan: _colSpan,
    rowSpan: _rowSpan,
    gridX: _gridX,
    gridY: _gridY,
    ...base
  } = cloned;
  return {
    ...base,
    x: source.x,
    y: source.y,
    width: source.width,
    height: source.height,
  };
}

export function insertPixelPaletteWidget(
  type: PaletteInsertType,
  layout: DashboardLayoutV2,
  visibleViewport?: PixelRect,
): DashboardLayoutV2 {
  const legacyWidgets = layout.widgets.map((widget) => ({
    ...widget,
    colSpan: 1,
    rowSpan: 1,
    gridX: undefined,
    gridY: undefined,
  }));
  const legacy = createPaletteWidget(type, legacyWidgets);
  const placement = placeInNextOpenSlot(defaultSize(legacy), getTopLevelPixelWidgets(layout.widgets), layout.canvas);
  const draft = buildDraftWidget(type, layout.widgets, placement);
  return resolveInsert(layout, draft);
}

export function insertPixelPaletteWidgetAt(
  type: PaletteInsertType,
  layout: DashboardLayoutV2,
  point: PixelPoint,
): DashboardLayoutV2 {
  const legacyWidgets = layout.widgets.map((widget) => ({
    ...widget,
    colSpan: 1,
    rowSpan: 1,
    gridX: undefined,
    gridY: undefined,
  }));
  const legacy = createPaletteWidget(type, legacyWidgets);
  const placement = placeAtPoint(defaultSize(legacy), layout.canvas, point);
  const draft = buildDraftWidget(type, layout.widgets, placement);
  return resolveInsert(layout, draft);
}

/** 直接向 Tab 页签插入（折叠占位，不经画布开放槽位） */
export function insertPaletteWidgetIntoTabHost(
  type: PaletteInsertType,
  layout: DashboardLayoutV2,
  host: PixelLayoutWidget,
  tabPaneId: string,
): DashboardLayoutV2 {
  const draft = buildDraftWidget(type, layout.widgets, {
    x: host.x,
    y: host.y,
    width: 0,
    height: 0,
  });
  return insertPixelWidgetIntoTab(
    { ...layout, widgets: [...layout.widgets, draft] },
    draft,
    host,
    tabPaneId,
  );
}

export function createPixelPaletteWidget(
  type: PaletteInsertType,
  widgets: PixelLayoutWidget[],
  canvas: DashboardCanvas,
  visibleViewport?: PixelRect,
): PixelLayoutWidget {
  const layout: DashboardLayoutV2 = {
    version: 2,
    canvas,
    widgets,
    globalFilters: [],
  };
  const beforeIds = new Set(widgets.map((widget) => widget.id));
  const resolved = insertPixelPaletteWidget(type, layout, visibleViewport);
  return resolved.widgets.find((item) => !beforeIds.has(item.id))!;
}

export function insertClonedPixelWidget(
  widget: LayoutWidget,
  layout: DashboardLayoutV2,
  visibleViewport?: PixelRect,
  sourcePixel?: PixelLayoutWidget,
): DashboardLayoutV2 {
  const size = sourcePixel
    ? {
        width: Math.min(sourcePixel.width, layout.canvas.width),
        height: Math.min(sourcePixel.height, layout.canvas.height),
      }
    : defaultSize(widget);
  const placement = placeInNextOpenSlot(size, getTopLevelPixelWidgets(layout.widgets), layout.canvas);
  const {
    colSpan: _colSpan,
    rowSpan: _rowSpan,
    gridX: _gridX,
    gridY: _gridY,
    ...base
  } = widget;
  const draft: PixelLayoutWidget = { ...base, ...placement };
  return resolveInsert(layout, draft);
}

export function placeClonedPixelWidget(
  widget: LayoutWidget,
  widgets: PixelLayoutWidget[],
  canvas: DashboardCanvas,
  visibleViewport?: PixelRect,
  sourcePixel?: PixelLayoutWidget,
): PixelLayoutWidget {
  const resolved = insertClonedPixelWidget(
    widget,
    { version: 2, canvas, widgets, globalFilters: [] },
    visibleViewport,
    sourcePixel,
  );
  return resolved.widgets.find((item) => item.id === widget.id)!;
}
