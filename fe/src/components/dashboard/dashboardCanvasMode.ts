import type {
  DashboardStyleConfig,
  DashboardLayout,
  DashboardLayoutV1,
  DashboardLayoutV2,
  LayoutWidget,
  PixelLayoutWidget,
} from "./layoutUtils";
import {
  normalizeWidgetIds,
  sortWidgets,
} from "./layoutUtils";
import { normalizeWidgetLayout } from "./gridLayoutAdapter";

const CANVAS_WIDTH = 1440 as const;
const MIN_CANVAS_HEIGHT = 900;
const PIXEL_COLUMN_WIDTH = 120;
const PIXEL_ROW_HEIGHT = 32;
const PIXEL_ROW_MARGIN = 12;

export type DashboardCanvasEditor = "grid" | "pixel" | "pixel-readonly";

/** grid = RGL 卡片壳（顶栏拖动手柄）；shape = 像素画布 shape-inner 内容区（对标 DE） */
export type DashboardWidgetShell = "grid" | "shape";

export type PreparedDashboardLayout = {
  editor: DashboardCanvasEditor;
  canSave: boolean;
  layout: DashboardLayout;
};

export function isPixelCanvasEnabled(value: string | undefined): boolean {
  return value !== "false";
}

export function migrateDashboardLayoutV1(layout: DashboardLayoutV1): DashboardLayoutV2 {
  let height = MIN_CANVAS_HEIGHT;
  const widgets = layout.widgets.map((widget) => {
    const { colSpan, rowSpan, gridX, gridY, ...base } = widget;
    const y = (gridY ?? widget.order) * (PIXEL_ROW_HEIGHT + PIXEL_ROW_MARGIN);
    const pixelHeight = rowSpan * PIXEL_ROW_HEIGHT + (rowSpan - 1) * PIXEL_ROW_MARGIN;
    height = Math.max(height, y + pixelHeight);
    return {
      ...base,
      x: (gridX ?? 0) * PIXEL_COLUMN_WIDTH,
      y,
      width: colSpan * PIXEL_COLUMN_WIDTH,
      height: pixelHeight,
    };
  });
  return {
    version: 2,
    canvas: { width: CANVAS_WIDTH, height },
    widgets,
    globalFilters: structuredClone(layout.globalFilters),
    styleConfig: layout.styleConfig ? { ...layout.styleConfig } : undefined,
  };
}

export function prepareDashboardLayout(
  layout: DashboardLayout,
  pixelEnabled: boolean,
): PreparedDashboardLayout {
  if (layout.version === 2) {
    return {
      editor: pixelEnabled ? "pixel" : "pixel-readonly",
      canSave: pixelEnabled,
      layout,
    };
  }
  if (pixelEnabled) {
    return { editor: "pixel", canSave: true, layout: migrateDashboardLayoutV1(layout) };
  }
  return { editor: "grid", canSave: true, layout };
}

/** DashboardWidget 仍消费栅格 shape；此适配只提供内容渲染所需的显式兼容字段。 */
export function pixelWidgetToLayoutWidget(widget: PixelLayoutWidget): LayoutWidget {
  return {
    ...widget,
    colSpan: Math.max(1, Math.min(12, Math.round(widget.width / PIXEL_COLUMN_WIDTH))),
    rowSpan: Math.max(
      1,
      Math.round((widget.height + PIXEL_ROW_MARGIN) / (PIXEL_ROW_HEIGHT + PIXEL_ROW_MARGIN)),
    ),
    gridX: Math.max(0, Math.min(11, Math.round(widget.x / PIXEL_COLUMN_WIDTH))),
    gridY: Math.max(0, Math.round(widget.y / (PIXEL_ROW_HEIGHT + PIXEL_ROW_MARGIN))),
  };
}

export function mergeLayoutWidgetIntoPixel(
  previous: PixelLayoutWidget,
  edited: LayoutWidget,
): PixelLayoutWidget {
  const {
    colSpan: _colSpan,
    rowSpan: _rowSpan,
    gridX: _gridX,
    gridY: _gridY,
    ...content
  } = edited;
  return {
    ...previous,
    ...content,
    x: previous.x,
    y: previous.y,
    width: previous.width,
    height: previous.height,
  };
}

function persistedStyle(styleConfig: DashboardStyleConfig): DashboardStyleConfig | undefined {
  return styleConfig.widgetGap || styleConfig.canvasBackground ? styleConfig : undefined;
}

/** v1 可规范化栅格；v2 只补公共 ID，严格保留数组顺序、order 与像素几何。 */
export function buildDashboardLayoutForSave(
  layout: DashboardLayout,
  styleConfig: DashboardStyleConfig,
): DashboardLayout {
  if (layout.version === 1) {
    return {
      ...layout,
      widgets: normalizeWidgetIds(normalizeWidgetLayout(sortWidgets(layout.widgets))),
      styleConfig: persistedStyle(styleConfig),
    };
  }
  return {
    ...layout,
    widgets: layout.widgets.map((widget) =>
      widget.type === "chart" && widget.chartConfig
        ? {
            ...widget,
            chartConfig: { ...widget.chartConfig, chartId: widget.id },
          }
        : widget,
    ),
    styleConfig: persistedStyle(styleConfig),
  };
}
