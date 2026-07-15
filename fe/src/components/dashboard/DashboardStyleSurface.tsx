import { cn } from "@/lib/utils";
import type { CSSProperties, ReactNode } from "react";
import type { DashboardStyleConfig } from "./layoutUtils";
import { hasUserCanvasBackground, effectiveCanvasBackground, effectiveWidgetShellBackground } from "./dashboardStyleConfig";
import { getDashboardThemeTokens, themeTokensToScopeVars } from "./dashboardThemeTokens";
import { themeAccentToScopeVars } from "./dashboardAccentScope";
import { resolveDialogScopeStyle } from "./dashboardChromeConfig";

type DashboardStyleSurfaceProps = {
  styleConfig?: DashboardStyleConfig;
  className?: string;
  children: ReactNode;
};

/**
 * 仪表板主题作用域（DE §5.1）：仅传播 colorScheme，不绘制画布背景。
 * 画布背景由 artboard/backdrop 层的 resolveArtboardStyle 负责（DE §5.3）。
 */
export function DashboardStyleSurface({
  styleConfig,
  className,
  children,
}: DashboardStyleSurfaceProps) {
  const scheme = styleConfig?.colorScheme ?? "light";
  const tokens = getDashboardThemeTokens(scheme);
  const userCanvasBackground = styleConfig ? hasUserCanvasBackground(styleConfig) : false;
  const scopeStyle: CSSProperties = { colorScheme: scheme };
  if (styleConfig?.fontFamily) scopeStyle.fontFamily = styleConfig.fontFamily;
  if (styleConfig?.themeAccent) {
    Object.assign(scopeStyle, themeAccentToScopeVars(styleConfig.themeAccent));
  }
  if (styleConfig?.actionIconColor) {
    (scopeStyle as Record<string, string>)["--dashboard-action-icon"] = styleConfig.actionIconColor;
    (scopeStyle as Record<string, string>)["--dashboard-action-icon-hover"] =
      styleConfig.actionIconColor;
  }
  Object.assign(scopeStyle, resolveDialogScopeStyle(styleConfig));
  const artboardBg =
    effectiveCanvasBackground(styleConfig) ?? tokens.canvas;
  const widgetSurfaceBg =
    effectiveWidgetShellBackground(styleConfig) ?? tokens.widgetShell;
  Object.assign(scopeStyle, themeTokensToScopeVars({ ...tokens, canvas: artboardBg, widgetShell: widgetSurfaceBg }));

  return (
    <div
      className={cn("dashboard-theme-scope min-h-0 w-full", scheme === "dark" && "dark", className)}
      data-dashboard-color-scheme={scheme}
      data-canvas-user-bg={userCanvasBackground ? "true" : undefined}
      style={scopeStyle}
    >
      {children}
    </div>
  );
}
