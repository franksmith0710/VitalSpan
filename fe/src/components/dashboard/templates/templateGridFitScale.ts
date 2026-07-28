import type { LayoutWidget } from "@/components/dashboard/layoutUtils";
import { getTopLevelWidgets } from "@/components/dashboard/layoutUtils";
import {
  GRID_MARGIN_Y,
  GRID_ROW_HEIGHT,
} from "@/components/dashboard/gridLayoutAdapter";

/** 估算 v1 栅格画布自然高度（px），供 Hub 卡片 scale-to-fit */
export function estimateV1GridCanvasHeight(widgets: LayoutWidget[]): number {
  const topLevel = getTopLevelWidgets(widgets);
  if (topLevel.length === 0) return 120;

  let maxBottom = 0;
  for (const widget of topLevel) {
    const y = widget.gridY ?? 0;
    const h = widget.rowSpan ?? 2;
    maxBottom = Math.max(maxBottom, y + h);
  }
  if (maxBottom <= 0) return 120;
  return maxBottom * GRID_ROW_HEIGHT + Math.max(0, maxBottom - 1) * GRID_MARGIN_Y;
}

export function resolveTemplateGridFitScale(
  availableHeight: number,
  contentHeight: number,
): number {
  if (availableHeight <= 0 || contentHeight <= 0) return 1;
  return Math.min(1, availableHeight / contentHeight);
}
