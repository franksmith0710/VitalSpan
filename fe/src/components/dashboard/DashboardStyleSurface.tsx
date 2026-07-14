import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import type { DashboardStyleConfig } from "./layoutUtils";
import { canvasSurfaceStyle } from "./dashboardStyleConfig";

type DashboardStyleSurfaceProps = {
  styleConfig?: DashboardStyleConfig;
  className?: string;
  children: ReactNode;
};

export function DashboardStyleSurface({
  styleConfig,
  className,
  children,
}: DashboardStyleSurfaceProps) {
  const scheme = styleConfig?.colorScheme ?? "light";
  const surfaceStyle = styleConfig ? canvasSurfaceStyle(styleConfig) : undefined;

  return (
    <div
      className={cn("min-h-0 w-full", scheme === "dark" && "dark", className)}
      style={surfaceStyle}
      data-dashboard-color-scheme={scheme}
    >
      {children}
    </div>
  );
}
