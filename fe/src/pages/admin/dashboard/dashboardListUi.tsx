import { LayoutGrid, LayoutList } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DashboardSurfaceViewMode } from "@/lib/dashboardSurfaceListPrefs";

export type { DashboardSurfaceViewMode };

export function formatDashboardListUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("zh-CN");
}

export function DashboardSurfaceViewModeToggle({
  viewMode,
  onChange,
  ariaLabel = "看板视图切换",
}: {
  viewMode: DashboardSurfaceViewMode;
  onChange: (mode: DashboardSurfaceViewMode) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      className="inline-flex rounded-lg border border-gray-200 bg-gray-100/80 p-0.5 dark:border-gray-800 dark:bg-white/[0.04]"
      role="group"
      aria-label={ariaLabel}
    >
      <Button
        type="button"
        variant={viewMode === "grid" ? "primary" : "ghost"}
        size="sm"
        aria-pressed={viewMode === "grid"}
        onClick={() => onChange("grid")}
      >
        <LayoutGrid className="size-4" aria-hidden />
        卡片
      </Button>
      <Button
        type="button"
        variant={viewMode === "list" ? "primary" : "ghost"}
        size="sm"
        aria-pressed={viewMode === "list"}
        onClick={() => onChange("list")}
      >
        <LayoutList className="size-4" aria-hidden />
        列表
      </Button>
    </div>
  );
}
