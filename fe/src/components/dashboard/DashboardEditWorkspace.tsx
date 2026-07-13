import type { ReactNode } from "react";
import { CanvasEditToolbar } from "@/components/dashboard/CanvasEditToolbar";
import type { PaletteInsertType } from "@/components/dashboard/createLayoutWidget";
import { cn } from "@/lib/utils";

function CanvasShell({
  hint,
  leading,
  actions,
  children,
}: {
  hint?: ReactNode;
  leading?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.02]">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-100 px-2 py-1.5 dark:border-white/[0.06]">
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          {leading}
          <p
            className="hidden min-w-0 flex-1 truncate text-theme-xs text-gray-500 sm:block dark:text-gray-400"
            data-testid={
              typeof hint === "string" && hint.includes("已选中")
                ? "canvas-multi-select-hint"
                : undefined
            }
          >
            {hint}
          </p>
        </div>
        {actions}
      </div>
      <div className="dashboard-canvas-surface min-h-0 flex-1 overflow-hidden p-2">{children}</div>
    </section>
  );
}

export type DashboardEditWorkspaceProps = {
  onPaletteInsert: (type: PaletteInsertType) => void;
  onOpenReuse?: () => void;
  onOpenDashboardStyle?: () => void;
  onOpenLinkage?: () => void;
  canvas: ReactNode;
  /** 右侧图表编辑轨（配置 + 字段库，~400px） */
  chartRail: ReactNode;
  widgetCount?: number;
  multiSelectCount?: number;
  canvasActions?: ReactNode;
  className?: string;
};

export function DashboardEditWorkspace({
  onPaletteInsert,
  onOpenReuse,
  onOpenDashboardStyle,
  onOpenLinkage,
  canvas,
  chartRail,
  widgetCount = 0,
  multiSelectCount = 0,
  canvasActions,
  className,
}: DashboardEditWorkspaceProps) {
  return (
    <div
      className={cn(
        "grid min-h-0 flex-1 gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(360px,428px)] lg:items-stretch",
        className,
      )}
    >
      <CanvasShell
        leading={
          <CanvasEditToolbar
            onInsert={onPaletteInsert}
            onOpenReuse={onOpenReuse}
            onOpenDashboardStyle={onOpenDashboardStyle}
            onOpenLinkage={onOpenLinkage}
          />
        }
        hint={
          multiSelectCount >= 2
            ? `已选中 ${multiSelectCount} 个组件`
            : widgetCount > 0
              ? `${widgetCount} 个组件 · 拖标题栏移动`
              : "拖拽组件到画布"
        }
        actions={canvasActions}
      >
        {canvas}
      </CanvasShell>

      <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.02]">
        {chartRail}
      </div>
    </div>
  );
}
