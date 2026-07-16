import type { CSSProperties } from "react";
import type { DashboardChromeConfig, DashboardStyleConfig, DialogStyleConfig } from "./dashboardStyleConfig";

export const DEFAULT_DASHBOARD_CHROME: Required<DashboardChromeConfig> = {
  showChartLoadingHint: true,
  showFloatingActions: true,
  showChartActionButtons: true,
  showAuxiliaryGrid: true,
};

export const DEFAULT_DRILL_LEVEL_COLORS = ["#465fff", "#0ba5ec", "#12b76a"] as const;

/** 辅助对齐网格步长（像素画布 overlay，仅视觉） */
export const AUXILIARY_GRID_CELL_PX = 20;

/** 配置面板 / 工具栏开关说明（对标 DataEase「辅助设计网格」） */
export function auxiliaryGridToggleDescription(options: {
  pixel: boolean;
  hasGap: boolean;
}): string {
  if (options.pixel) {
    return `显示 ${AUXILIARY_GRID_CELL_PX}px 参考网格；开启时拖近邻组件边/中心（约 10px）会出现对齐参考线并吸附，关闭后可自由落位`;
  }
  return "显示参考网格线，辅助 12 列矩阵布局对齐";
}

export function resolveDashboardChrome(
  config: DashboardStyleConfig | undefined,
): Required<DashboardChromeConfig> {
  const chrome = config?.chrome ?? {};
  return {
    showChartLoadingHint: chrome.showChartLoadingHint !== false,
    showFloatingActions: chrome.showFloatingActions !== false,
    showChartActionButtons: chrome.showChartActionButtons !== false,
    showAuxiliaryGrid: chrome.showAuxiliaryGrid !== false,
  };
}

export function resolveDrillLevelColors(config: DashboardStyleConfig | undefined): string[] {
  const custom = config?.drillLevelColors?.filter(Boolean);
  if (custom && custom.length > 0) return custom;
  return [...DEFAULT_DRILL_LEVEL_COLORS];
}

export function resolveDialogScopeStyle(
  config: DashboardStyleConfig | undefined,
): CSSProperties {
  const style: CSSProperties = {};
  const dialogStyle = config?.dialogStyle;
  if (dialogStyle?.background) {
    (style as Record<string, string>)["--dashboard-dialog-bg"] = dialogStyle.background;
  }
  if (dialogStyle?.fontColor) {
    (style as Record<string, string>)["--dashboard-dialog-fg"] = dialogStyle.fontColor;
  }
  resolveDrillLevelColors(config).forEach((color, index) => {
    (style as Record<string, string>)[`--dashboard-drill-level-${index}`] = color;
  });
  return style;
}

/** 编辑态辅助网格（步长与像素画布吸附一致） */
export function auxiliaryGridPatternStyle(scheme: "light" | "dark" = "light"): CSSProperties {
  const stroke = scheme === "dark" ? "%23cbd5e1" : "%23475569";
  const svg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${AUXILIARY_GRID_CELL_PX}" height="${AUXILIARY_GRID_CELL_PX}"><path fill="none" stroke="${stroke}" stroke-width="1.5" d="M${AUXILIARY_GRID_CELL_PX} 0H0v${AUXILIARY_GRID_CELL_PX}"/></svg>`,
  );
  return {
    backgroundImage: `url("data:image/svg+xml,${svg}")`,
    backgroundSize: `${AUXILIARY_GRID_CELL_PX}px ${AUXILIARY_GRID_CELL_PX}px`,
    backgroundRepeat: "repeat",
  };
}

/** @deprecated 使用 mergeAuxiliaryGridIntoSurface */
export function auxiliaryGridOverlayStyle(scheme: "light" | "dark" = "light"): CSSProperties {
  return auxiliaryGridPatternStyle(scheme);
}

/** 将辅助网格叠在现有画布底色/装饰之上（仅编辑态） */
export function mergeAuxiliaryGridIntoSurface(
  base: CSSProperties,
  scheme: "light" | "dark",
  enabled: boolean,
): CSSProperties {
  if (!enabled) return base;
  const pattern = auxiliaryGridPatternStyle(scheme);
  const layers = [pattern.backgroundImage, base.backgroundImage].filter(Boolean);
  const sizes = [pattern.backgroundSize, base.backgroundSize].filter(Boolean);
  if (layers.length === 0) return base;
  return {
    ...base,
    backgroundImage: layers.join(", "),
    backgroundSize: sizes.join(", "),
    backgroundRepeat: base.backgroundRepeat ?? "repeat",
  };
}
