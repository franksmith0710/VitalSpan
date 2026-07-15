import type { CSSProperties } from "react";
import type { DashboardChromeConfig, DashboardStyleConfig, DialogStyleConfig } from "./dashboardStyleConfig";

export const DEFAULT_DASHBOARD_CHROME: Required<DashboardChromeConfig> = {
  showChartLoadingHint: true,
  showFloatingActions: true,
  showChartActionButtons: true,
  showAuxiliaryGrid: true,
};

export const DEFAULT_DRILL_LEVEL_COLORS = ["#465fff", "#0ba5ec", "#12b76a"] as const;

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

/** 编辑态辅助对齐网格 */
export function auxiliaryGridOverlayStyle(scheme: "light" | "dark" = "light"): CSSProperties {
  const stroke = scheme === "dark" ? "%2394a3b8" : "%23cbd5e1";
  const svg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><path fill="none" stroke="${stroke}" stroke-width="0.5" d="M20 0H0v20"/></svg>`,
  );
  return {
    backgroundColor: scheme === "dark" ? "rgba(15,23,42,0.35)" : "rgba(248,250,252,0.5)",
    backgroundImage: `url("data:image/svg+xml,${svg}")`,
    backgroundSize: "20px 20px",
    backgroundRepeat: "repeat",
    opacity: 0.85,
  };
}
