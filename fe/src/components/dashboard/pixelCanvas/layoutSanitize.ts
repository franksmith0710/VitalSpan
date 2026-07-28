import { readSurfaceKind } from "@/lib/dataScreenLayout";
import { bootstrapDashboardStyleConfig } from "../dashboardThemeVariants";
import { normalizeDashboardGapConfig } from "../gapPolicy";
import type { DashboardLayoutV2, DashboardStyleConfig } from "../layoutUtils";
import {
  reconcileTabPaneChildIdsInPixelLayout,
  repairUnparkedTabChildren,
  syncParkedTabChildren,
} from "../layoutUtils";
import { compactPixelLayoutWhenZeroGap } from "./gapCompaction";
import { layoutsOverlap, packPixelLayoutSeamless } from "./collisionLayout";
import { clampPixelRectToCanvas } from "./geometry";
import { fitCanvasHeightToContent } from "./PixelCanvas";

/** 顶层组件收进画布边界；Tab 子组件随宿主同步 park 坐标 */
export function clampPixelLayoutToCanvasBounds(layout: DashboardLayoutV2): DashboardLayoutV2 {
  const canvas = layout.canvas;
  let changed = false;
  const widgets = layout.widgets.map((widget) => {
    if (widget.parentTabsId) return widget;
    const next = clampPixelRectToCanvas(widget, canvas);
    if (
      next.x === widget.x &&
      next.y === widget.y &&
      next.width === widget.width &&
      next.height === widget.height
    ) {
      return widget;
    }
    changed = true;
    return { ...widget, ...next };
  });
  if (!changed) return layout;
  return {
    ...layout,
    widgets: syncParkedTabChildren(widgets),
  };
}

/** 编辑态轻量修复：Tab park + 子组件折叠，不触发 pack（避免拖动中整版重排） */
export function repairPixelLayoutTabState(layout: DashboardLayoutV2): DashboardLayoutV2 {
  const reconciled = reconcileTabPaneChildIdsInPixelLayout(layout);
  const widgets = syncParkedTabChildren(repairUnparkedTabChildren(reconciled.widgets));
  const repaired = { ...reconciled, widgets };
  if (readSurfaceKind(layout) === "data-screen") {
    return repaired;
  }
  return fitCanvasHeightToContent(repaired);
}

/**
 * 加载 / 保存 / 展示前统一消毒：
 * 1. 间隙压实 2. Tab 归属对齐 3. 未 park 子组件折叠
 * 4. 可选：顶层重叠则 pack（默认关闭——保存/回显须原样，避免「保存后跳位」）
 */
export function sanitizePixelLayoutGeometry(
  layout: DashboardLayoutV2,
  style?: DashboardStyleConfig | null,
  options?: { packOverlaps?: boolean },
): DashboardLayoutV2 {
  const gapConfig = normalizeDashboardGapConfig(
    bootstrapDashboardStyleConfig(style ?? layout.styleConfig ?? {}),
  );
  const isDataScreen = readSurfaceKind(style ?? layout) === "data-screen";
  let prepared = compactPixelLayoutWhenZeroGap(layout, gapConfig).layout;
  prepared = repairPixelLayoutTabState(prepared);
  const shouldPack = options?.packOverlaps === true && !isDataScreen;
  if (shouldPack && layoutsOverlap(prepared, 0)) {
    prepared = packPixelLayoutSeamless(prepared);
  }
  if (isDataScreen) {
    return clampPixelLayoutToCanvasBounds(prepared);
  }
  return fitCanvasHeightToContent(prepared);
}
