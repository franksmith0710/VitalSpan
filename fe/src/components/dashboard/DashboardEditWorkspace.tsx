import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type DashboardEditWorkspaceProps = {
  palette: ReactNode;
  canvas: ReactNode;
  inspector: ReactNode;
  className?: string;
};

export function DashboardEditWorkspace({
  palette,
  canvas,
  inspector,
  className,
}: DashboardEditWorkspaceProps) {
  return (
    <div
      className={cn(
        "grid min-h-0 flex-1 gap-4 lg:grid-cols-[240px_minmax(0,1fr)_300px] lg:items-start",
        className,
      )}
    >
      <div className="lg:sticky lg:top-0 lg:max-h-[calc(100dvh-11rem)] lg:overflow-y-auto">
        {palette}
      </div>
      <div className="min-w-0">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-gray-50/80 px-4 py-3 dark:border-gray-800 dark:bg-white/[0.02]">
            <div>
              <p className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">画布</p>
              <p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
                拖动手柄移动 · 右下角或边缘拉伸调整大小
              </p>
            </div>
            <span className="rounded-full bg-brand-50 px-2.5 py-1 text-theme-xs font-medium text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
              12 列栅格
            </span>
          </div>
          <div className="dashboard-canvas-surface p-4">{canvas}</div>
        </div>
      </div>
      <div className="lg:sticky lg:top-0 lg:max-h-[calc(100dvh-11rem)] lg:overflow-y-auto">
        {inspector}
      </div>
    </div>
  );
}
