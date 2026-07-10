import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type WorkspacePanelProps = {
  title: string;
  hint?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
};

function WorkspacePanel({
  title,
  hint,
  badge,
  children,
  className,
  bodyClassName,
}: WorkspacePanelProps) {
  return (
    <section
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]",
        className,
      )}
    >
      <header className="flex shrink-0 items-start justify-between gap-2 border-b border-gray-100 px-4 py-3 dark:border-white/[0.06]">
        <div className="min-w-0">
          <h2 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">{title}</h2>
          {hint ? (
            <p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">{hint}</p>
          ) : null}
        </div>
        {badge}
      </header>
      <div className={cn("min-h-0 flex-1 overflow-y-auto", bodyClassName)}>{children}</div>
    </section>
  );
}

export type DashboardEditWorkspaceProps = {
  palette: ReactNode;
  canvas: ReactNode;
  inspector: ReactNode;
  widgetCount?: number;
  /** 画布标题栏右侧：未保存时显示保存按钮 */
  canvasActions?: ReactNode;
  className?: string;
};

export function DashboardEditWorkspace({
  palette,
  canvas,
  inspector,
  widgetCount = 0,
  canvasActions,
  className,
}: DashboardEditWorkspaceProps) {
  return (
    <div
      className={cn(
        "grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(200px,220px)_minmax(0,1fr)_minmax(260px,300px)] lg:items-stretch",
        className,
      )}
    >
      <WorkspacePanel title="图表组件" hint="拖拽到画布，或点击追加到末尾" bodyClassName="p-3">
        {palette}
      </WorkspacePanel>

      <WorkspacePanel
        title="画布"
        hint={
          widgetCount > 0
            ? `${widgetCount} 个组件 · 拖拽或点击左侧添加 · 拖标题栏移动`
            : "拖拽左侧组件到此处，或点击类型追加"
        }
        badge={
          canvasActions ?? (
            <span className="shrink-0 rounded-md bg-gray-100 px-2 py-1 text-theme-xs font-medium text-gray-600 dark:bg-white/[0.06] dark:text-gray-400">
              12 列
            </span>
          )
        }
        bodyClassName="dashboard-canvas-surface min-h-[480px] overflow-y-auto p-3 lg:min-h-0"
      >
        {canvas}
      </WorkspacePanel>

      <WorkspacePanel title="数据配置" hint="选中组件后分步配置" bodyClassName="flex min-h-0 flex-col p-0">
        {inspector}
      </WorkspacePanel>
    </div>
  );
}
