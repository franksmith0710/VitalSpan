import {
  createPaletteWidget,
  type PaletteInsertType,
} from "../createLayoutWidget";
import { cloneLayoutWidget } from "../cloneLayoutWidget";
import { pixelWidgetToLayoutWidget } from "../dashboardCanvasMode";
import type {
  DashboardCanvas,
  LayoutWidget,
  PixelLayoutWidget,
} from "../layoutUtils";
import type { PixelRect } from "./geometry";

const DEFAULT_CHART_SIZE = { width: 480, height: 320 };
const DEFAULT_FILTER_SIZE = { width: 360, height: 160 };

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function defaultSize(widget: LayoutWidget) {
  return widget.type === "filter" ? DEFAULT_FILTER_SIZE : DEFAULT_CHART_SIZE;
}

function placeAtViewport(
  size: { width: number; height: number },
  canvas: DashboardCanvas,
  visibleViewport?: PixelRect,
): Pick<PixelLayoutWidget, "x" | "y" | "width" | "height"> {
  const viewport = visibleViewport ?? {
    x: 0,
    y: 0,
    width: canvas.width,
    height: Math.min(canvas.height, 900),
  };
  const width = Math.min(size.width, canvas.width);
  const height = Math.min(size.height, canvas.height);
  const x = clamp(
    viewport.x + (viewport.width - width) / 2,
    0,
    Math.max(0, canvas.width - width),
  );
  const y = clamp(
    viewport.y + (viewport.height - height) / 2,
    0,
    Math.max(0, canvas.height - height),
  );
  return {
    x: Math.round(x),
    y: Math.round(y),
    width,
    height,
  };
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

export function createPixelPaletteWidget(
  type: PaletteInsertType,
  widgets: PixelLayoutWidget[],
  canvas: DashboardCanvas,
  visibleViewport?: PixelRect,
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
  const placement = placeAtViewport(defaultSize(legacy), canvas, visibleViewport);

  return {
    ...base,
    ...placement,
  };
}

export function placeClonedPixelWidget(
  widget: LayoutWidget,
  widgets: PixelLayoutWidget[],
  canvas: DashboardCanvas,
  visibleViewport?: PixelRect,
  sourcePixel?: PixelLayoutWidget,
): PixelLayoutWidget {
  const size = sourcePixel
    ? {
        width: Math.min(sourcePixel.width, canvas.width),
        height: Math.min(sourcePixel.height, canvas.height),
      }
    : defaultSize(widget);
  const placement = placeAtViewport(size, canvas, visibleViewport);
  const {
    colSpan: _colSpan,
    rowSpan: _rowSpan,
    gridX: _gridX,
    gridY: _gridY,
    ...base
  } = widget;
  return {
    ...base,
    ...placement,
  };
}
