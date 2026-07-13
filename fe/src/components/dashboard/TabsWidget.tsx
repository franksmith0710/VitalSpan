import type { ReactNode } from "react";
import { GripVertical, PanelsTopLeft, Trash2 } from "lucide-react";
import { IconButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { LayoutWidget, TabsWidgetConfig } from "./layoutUtils";
import { getTabChildWidgets } from "./layoutUtils";

type TabsWidgetProps = {
  widget: LayoutWidget & { tabsConfig: TabsWidgetConfig };
  allWidgets: LayoutWidget[];
  mode: "edit" | "view";
  selected?: boolean;
  onSelect?: () => void;
  onDelete?: (id: string) => void;
  onTitleChange?: (id: string, title: string) => void;
  onTabsConfigChange?: (tabsConfig: TabsWidgetConfig) => void;
  renderChild: (child: LayoutWidget) => ReactNode;
};

export function TabsWidget({
  widget,
  allWidgets,
  mode,
  selected = false,
  onSelect,
  onDelete,
  onTitleChange,
  onTabsConfigChange,
  renderChild,
}: TabsWidgetProps) {
  const cfg = widget.tabsConfig;
  const activePane = cfg.panes.find((p) => p.id === cfg.activePaneId) ?? cfg.panes[0];
  const children = activePane ? getTabChildWidgets(allWidgets, widget.id, activePane.id) : [];

  const setActivePane = (paneId: string) => {
    onTabsConfigChange?.({ ...cfg, activePaneId: paneId });
  };

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-xl border bg-white shadow-theme-xs dark:bg-white/[0.03]",
        selected && "dashboard-widget-selected",
        selected
          ? "border-gray-400 shadow-theme-sm ring-1 ring-gray-300/70 dark:border-gray-600 dark:ring-gray-600/40"
          : "border-gray-200 dark:border-gray-800",
      )}
    >
      {mode === "edit" ? (
        <div
          className={cn(
            "dashboard-drag-handle flex shrink-0 cursor-grab items-center gap-2 border-b border-gray-100 bg-gray-50/90 px-2 py-1.5 active:cursor-grabbing dark:border-gray-800 dark:bg-white/[0.04]",
            selected && "bg-gray-100/90 dark:bg-white/[0.06]",
          )}
          role="group"
          aria-label="拖动以移动组件"
        >
          <GripVertical className="size-3.5 shrink-0 text-gray-300 dark:text-gray-600" aria-hidden />
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-white text-gray-500 shadow-theme-xs dark:bg-white/5">
            <PanelsTopLeft className="size-3.5" aria-hidden />
          </span>
          <Input
            value={widget.title}
            onChange={(e) => onTitleChange?.(widget.id, e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            className="dashboard-no-drag h-7 min-w-0 flex-1 border-transparent bg-transparent px-1 text-theme-sm font-medium shadow-none"
            aria-label="Tab 标题"
          />
          {onDelete ? (
            <IconButton
              type="button"
              variant="ghost"
              size="sm"
              className="dashboard-no-drag size-7 shrink-0 text-gray-400 hover:text-error-600"
              aria-label="删除组件"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(widget.id);
              }}
            >
              <Trash2 className="size-3.5" />
            </IconButton>
          ) : null}
        </div>
      ) : null}

      <div
        className="dashboard-no-drag flex min-h-0 flex-1 flex-col"
        onClick={mode === "edit" ? () => onSelect?.() : undefined}
        role={mode === "edit" ? "button" : undefined}
      >
        <div className="flex shrink-0 gap-1 border-b border-gray-100 px-2 pt-2 dark:border-gray-800">
          {cfg.panes.map((pane) => (
            <button
              key={pane.id}
              type="button"
              className={cn(
                "rounded-t-lg px-3 py-1.5 text-theme-xs font-medium transition-colors",
                pane.id === cfg.activePaneId
                  ? "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
                  : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5",
              )}
              onClick={(e) => {
                e.stopPropagation();
                setActivePane(pane.id);
              }}
            >
              {pane.title}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-auto p-2">
          {children.length === 0 ? (
            <p className="py-6 text-center text-theme-xs text-gray-400">
              {mode === "edit" ? "选中此 Tab 后从工具栏插入组件" : "此页签暂无内容"}
            </p>
          ) : (
            children.map((child) => (
              <div key={child.id} className="min-h-[80px]">
                {renderChild(child)}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
