import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import type { DashboardStyleConfig } from "./layoutUtils";
import { hasUserCanvasBackground } from "./dashboardStyleConfig";

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
  const userCanvasBackground = styleConfig ? hasUserCanvasBackground(styleConfig) : false;

  return (
    <div
      className={cn("dashboard-theme-scope min-h-0 w-full", scheme === "dark" && "dark", className)}
      data-dashboard-color-scheme={scheme}
      data-canvas-user-bg={userCanvasBackground ? "true" : undefined}
    >
      {children}
    </div>
  );
}
