import {
  createPaletteWidget,
  type PaletteInsertType,
} from "../createLayoutWidget";
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
  const viewport = visibleViewport ?? {
    x: 0,
    y: 0,
    width: canvas.width,
    height: Math.min(canvas.height, 900),
  };
  const size = defaultSize(legacy);
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
    ...base,
    x: Math.round(x),
    y: Math.round(y),
    width,
    height,
  };
}
