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
import { fitCanvasHeightToContent } from "./PixelCanvas";

/** 编辑态轻量修复：Tab park + 子组件折叠，不触发 pack（避免拖动中整版重排） */
export function repairPixelLayoutTabState(layout: DashboardLayoutV2): DashboardLayoutV2 {
  const reconciled = reconcileTabPaneChildIdsInPixelLayout(layout);
  const widgets = syncParkedTabChildren(repairUnparkedTabChildren(reconciled.widgets));
  return fitCanvasHeightToContent({ ...reconciled, widgets });
}

/**
 * 加载 / 保存 / 展示前统一消毒：
 * 1. 间隙压实 2. Tab 归属对齐 3. 未 park 子组件折叠 4. 顶层重叠则 pack
 */
export function sanitizePixelLayoutGeometry(
  layout: DashboardLayoutV2,
  style?: DashboardStyleConfig | null,
): DashboardLayoutV2 {
  const gapConfig = normalizeDashboardGapConfig(
    bootstrapDashboardStyleConfig(style ?? layout.styleConfig ?? {}),
  );
  let prepared = compactPixelLayoutWhenZeroGap(layout, gapConfig).layout;
  prepared = repairPixelLayoutTabState(prepared);
  if (layoutsOverlap(prepared, 0)) {
    prepared = packPixelLayoutSeamless(prepared);
  }
  return fitCanvasHeightToContent(prepared);
}
