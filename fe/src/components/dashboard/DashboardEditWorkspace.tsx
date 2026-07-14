import type { ReactNode } from "react";
import { CanvasEditToolbar } from "@/components/dashboard/CanvasEditToolbar";
import type { PaletteInsertType } from "@/components/dashboard/createLayoutWidget";
import { CollapsedRailTab, RailFoldHeader } from "@/components/dashboard/RailFoldTab";
import { DASHBOARD_EDIT_RAIL_SHELL_CLASS } from "@/components/dashboard/dashboardEditRailLayout";
import { cn } from "@/lib/utils";

function CanvasShell({
  hint,
  leading,
  actions,
  children,
  className,
  canvasEngine = "grid",
}: {
  hint?: ReactNode;
  leading?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  canvasEngine?: "grid" | "pixel";
}) {
  return (
    <section
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.02]",
        className,
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-100 px-2 py-1 dark:border-white/[0.06]">
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
      <div
        className={cn(
          "dashboard-canvas-surface min-h-0 flex-1 overflow-hidden",
          canvasEngine === "pixel" ? "p-0" : "p-1",
        )}
      >
        {children}
      </div>
    </section>
  );
}

export type DashboardEditWorkspaceProps = {
  onPaletteInsert: (type: PaletteInsertType) => void;
  onOpenReuse?: () => void;
  onOpenDashboardStyle?: () => void;
  onOpenLinkage?: () => void;
  canvas: ReactNode;
  chartRail: ReactNode;
  widgetCount?: number;
  multiSelectCount?: number;
  canvasEngine?: "grid" | "pixel";
  canvasActions?: ReactNode;
  /** 右侧配置轨展开（未选中时建议 false，画布占满） */
  chartRailOpen?: boolean;
  onChartRailOpenChange?: (open: boolean) => void;
  chartRailLabel?: string;
  /** 未选中看板上下文时显示外层「收回」顶栏 */
  showRailFoldHeader?: boolean;
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
  canvasEngine = "grid",
  canvasActions,
  chartRailOpen = true,
  onChartRailOpenChange,
  chartRailLabel = "仪表板配置",
  showRailFoldHeader = true,
  className,
}: DashboardEditWorkspaceProps) {
  return (
    <div
      className={cn(
        "grid min-h-0 flex-1 gap-1.5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-stretch",
        className,
      )}
    >
      <CanvasShell
        className="min-h-0 min-w-0"
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
              ? canvasEngine === "pixel"
                ? `${widgetCount} 个组件 · 选中后拖顶部手柄移动`
                : `${widgetCount} 个组件 · 拖标题栏移动`
              : "拖拽组件到画布"
        }
        actions={canvasActions}
        canvasEngine={canvasEngine}
      >
        {canvas}
      </CanvasShell>

      {chartRailOpen ? (
        <div
          className={cn(
            "flex min-h-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.02]",
            DASHBOARD_EDIT_RAIL_SHELL_CLASS,
          )}
        >
          {showRailFoldHeader && onChartRailOpenChange ? (
            <RailFoldHeader
              label={chartRailLabel}
              onCollapse={() => onChartRailOpenChange(false)}
            />
          ) : null}
          <div className="min-h-0 flex-1 overflow-hidden">{chartRail}</div>
        </div>
      ) : (
        <CollapsedRailTab
          label={chartRailLabel}
          onExpand={() => onChartRailOpenChange?.(true)}
        />
      )}
    </div>
  );
}
