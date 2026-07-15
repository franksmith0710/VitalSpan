/**
 * StylePipeline — 看板样式 load / edit / preview / save 单一路径（HYD-05 最小落地）。
 * 所有消费方须通过 hydrate / resolveEffective，禁止直接读未 bootstrap 的 layout.styleConfig。
 */

import type { ColorScheme } from "./dashboardStyleConfig";
import {
  buildDashboardLayoutForSave,
  dashboardPersistFingerprint,
  pixelWidgetToLayoutWidget,
} from "./dashboardCanvasMode";
import { resolveComponentGapRuntime, type CanvasGapMode } from "./componentGapRuntime";
import type {
  DashboardLayout,
  DashboardLayoutV2,
  DashboardStyleConfig,
} from "./layoutUtils";
import {
  bootstrapDashboardStyleConfig,
  syncChartWidgetsForColorScheme,
} from "./dashboardThemeVariants";
import { compactPixelLayoutWhenZeroGap } from "./pixelCanvas/gapCompaction";

/** load / save / patch 后统一 hydrate（含 gap normalize + theme bundle） */
export function hydrateDashboardStyle(
  input?: DashboardStyleConfig | null,
): DashboardStyleConfig {
  return bootstrapDashboardStyleConfig(input ?? {});
}

/** 编辑态 liveStyle 优先；只读/预览可仅传 layout */
export function resolveEffectiveDashboardStyle(
  layout: DashboardLayout,
  liveStyle?: DashboardStyleConfig,
): DashboardStyleConfig {
  return hydrateDashboardStyle(liveStyle ?? layout.styleConfig);
}

export function resolveDashboardGapRuntimeFromLayout(
  layout: DashboardLayout,
  liveStyle?: DashboardStyleConfig,
) {
  const mode: CanvasGapMode = layout.version === 2 ? "pixel" : "grid";
  return resolveComponentGapRuntime(resolveEffectiveDashboardStyle(layout, liveStyle), mode);
}

/** 与 PUT /layout 及 dirty 指纹一致的持久化快照 */
export function persistDashboardLayout(
  layout: DashboardLayout,
  liveStyle: DashboardStyleConfig,
): DashboardLayout {
  const style = hydrateDashboardStyle(liveStyle);
  let layoutForSave = layout;
  if (layout.version === 2) {
    layoutForSave = compactPixelLayoutWhenZeroGap(layout, style).layout;
  }
  return buildDashboardLayoutForSave(layoutForSave, style);
}

/** 加载/预览前：无间隙时压实外框坐标缝（编辑/只读/分享单路径） */
export function preparePixelLayoutForDisplay(
  layout: DashboardLayoutV2,
  style?: DashboardStyleConfig | null,
): DashboardLayoutV2 {
  const gapConfig = hydrateDashboardStyle(style ?? layout.styleConfig);
  return compactPixelLayoutWhenZeroGap(layout, gapConfig).layout;
}

export function persistDashboardFingerprint(
  layout: DashboardLayout,
  liveStyle: DashboardStyleConfig,
  pixelEnabled: boolean,
): string {
  return dashboardPersistFingerprint(
    layout,
    hydrateDashboardStyle(liveStyle),
    pixelEnabled,
  );
}

/** 加载时一次性同步图表 deStyle，避免 resetLayout + setWidgets 双写几何 */
export function syncPixelLayoutChartStyles(
  layout: DashboardLayoutV2,
  scheme: ColorScheme,
): DashboardLayoutV2 {
  const synced = syncChartWidgetsForColorScheme(
    layout.widgets.map(pixelWidgetToLayoutWidget),
    scheme,
  );
  const syncedById = new Map(synced.map((widget) => [widget.id, widget]));
  return {
    ...layout,
    widgets: layout.widgets.map((pixelWidget) => {
      const syncedWidget = syncedById.get(pixelWidget.id);
      if (
        !syncedWidget ||
        syncedWidget.type !== "chart" ||
        !syncedWidget.chartConfig ||
        pixelWidget.type !== "chart"
      ) {
        return pixelWidget;
      }
      if (syncedWidget.chartConfig === pixelWidget.chartConfig) return pixelWidget;
      return { ...pixelWidget, chartConfig: syncedWidget.chartConfig };
    }),
  };
}

/** 加载/保存往返：layout + style → persist → hydrate 后指纹应一致 */
export function dashboardLayoutPersistRoundtrip(
  layout: DashboardLayout,
  liveStyle: DashboardStyleConfig,
  pixelEnabled: boolean,
): { saved: DashboardLayout; fingerprint: string } {
  const saved = persistDashboardLayout(layout, liveStyle);
  const fingerprint = persistDashboardFingerprint(saved, saved.styleConfig ?? {}, pixelEnabled);
  return { saved, fingerprint };
}
