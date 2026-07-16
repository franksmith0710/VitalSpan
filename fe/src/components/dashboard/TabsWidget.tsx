import { useState, type DragEvent, type ReactNode } from "react";
import { GripVertical, LayoutGrid, PanelsTopLeft, Plus, Trash2 } from "lucide-react";
import { IconButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isPaletteDragEvent, readPaletteDragPayload, type PaletteDragPayload } from "@/lib/dashboardDnd";
import type { DashboardWidgetShell } from "./dashboardCanvasMode";
import { WidgetInlineTitle } from "./WidgetInlineTitle";
import type { LayoutWidget, TabsWidgetConfig } from "./layoutUtils";
import { getTabChildWidgets } from "./layoutUtils";

const MAX_PANES = 8;

type TabsWidgetProps = {
  widget: LayoutWidget & { tabsConfig: TabsWidgetConfig };
  allWidgets: LayoutWidget[];
  mode: "edit" | "view";
  shell?: DashboardWidgetShell;
  selected?: boolean;
  onSelect?: () => void;
  onDelete?: (id: string) => void;
  onTitleChange?: (id: string, title: string) => void;
  onTabsConfigChange?: (tabsConfig: TabsWidgetConfig) => void;
  onPaletteDrop?: (payload: PaletteDragPayload) => void;
  renderChild: (child: LayoutWidget) => ReactNode;
};

function TabsPaneEmptyState({ mode }: { mode: "edit" | "view" }) {
  if (mode === "view") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
        <p className="text-theme-xs text-gray-400 dark:text-gray-500">此页签暂无内容</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-3">
      <div className="flex w-full flex-col items-center gap-3 rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-3 py-5 dark:border-gray-700 dark:bg-white/[0.02]">
        <span className="flex size-10 items-center justify-center rounded-lg bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
          <LayoutGrid className="size-5" aria-hidden />
        </span>
        <div className="space-y-1 text-center">
          <p className="text-theme-xs font-medium text-gray-700 dark:text-gray-200">拖入或插入组件</p>
          <p className="text-[10px] leading-relaxed text-gray-400 dark:text-gray-500">
            先点选目标页签，再从左侧工具栏添加图表、筛选器等
          </p>
        </div>
      </div>
    </div>
  );
}

export function TabsWidget({
  widget,
  allWidgets,
  mode,
  shell = "grid",
  selected = false,
  onSelect,
  onDelete,
  onTitleChange,
  onTabsConfigChange,
  onPaletteDrop,
  renderChild,
}: TabsWidgetProps) {
  const cfg = widget.tabsConfig;
  const head = cfg.headStyle ?? {};
  const tabFontSize = head.fontSize ?? 12;
  const isShape = shell === "shape";
  const [paletteOver, setPaletteOver] = useState(false);
  const activePane = cfg.panes.find((p) => p.id === cfg.activePaneId) ?? cfg.panes[0];
  const children = activePane ? getTabChildWidgets(allWidgets, widget.id, activePane.id) : [];

  const setActivePane = (paneId: string) => {
    onTabsConfigChange?.({ ...cfg, activePaneId: paneId });
  };

  const addPane = () => {
    if (cfg.panes.length >= MAX_PANES) return;
    const id = crypto.randomUUID();
    onTabsConfigChange?.({
      ...cfg,
      panes: [...cfg.panes, { id, title: `页签 ${cfg.panes.length + 1}`, childWidgetIds: [] }],
      activePaneId: id,
    });
  };

  const handlePaletteDragOver = (event: DragEvent) => {
    if (mode !== "edit" || !onPaletteDrop || !isPaletteDragEvent(event)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
    setPaletteOver(true);
  };

  const handlePaletteDragLeave = (event: DragEvent) => {
    if (event.currentTarget.contains(event.relatedTarget as Node)) return;
    setPaletteOver(false);
  };

  const handlePaletteDrop = (event: DragEvent) => {
    if (mode !== "edit" || !onPaletteDrop) return;
    const payload = readPaletteDragPayload(event);
    if (!payload) return;
    event.preventDefault();
    event.stopPropagation();
    setPaletteOver(false);
    onPaletteDrop(payload);
  };

  return (
    <div
      data-tabs-widget-id={widget.id}
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden",
        !isShape &&
          "rounded-xl border bg-white shadow-theme-xs dark:bg-white/[0.03]",
        !isShape &&
          (selected
            ? "dashboard-widget-selected border-gray-400 shadow-theme-sm ring-1 ring-gray-300/70 dark:border-gray-600 dark:ring-gray-600/40"
            : "border-gray-200 dark:border-gray-800"),
      )}
    >
      {mode === "edit" && !isShape ? (
        <div className="flex shrink-0 items-center gap-2 border-b border-gray-100 bg-gray-50/90 px-2 py-1.5 dark:border-gray-800 dark:bg-white/[0.04]">
          <div
            className="dashboard-drag-handle flex shrink-0 cursor-grab items-center active:cursor-grabbing"
            role="group"
            aria-label="拖动以移动组件"
          >
            <GripVertical className="size-3.5 shrink-0 text-gray-300 dark:text-gray-600" aria-hidden />
          </div>
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-white text-gray-500 shadow-theme-xs dark:bg-white/5">
            <PanelsTopLeft className="size-3.5" aria-hidden />
          </span>
          <WidgetInlineTitle
            value={widget.title}
            editable={Boolean(onTitleChange)}
            onChange={onTitleChange ? (next) => onTitleChange(widget.id, next) : undefined}
            ariaLabel="Tab 容器标题"
            testId={`widget-inline-title-${widget.id}`}
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
        className={cn(
          "dashboard-no-drag relative flex min-h-0 flex-1 flex-col",
          mode === "edit" && paletteOver && "ring-2 ring-inset ring-brand-400/50 dark:ring-brand-500/40",
        )}
        onClick={mode === "edit" ? () => onSelect?.() : undefined}
        role={mode === "edit" ? "button" : undefined}
        onDragEnter={handlePaletteDragOver}
        onDragOver={handlePaletteDragOver}
        onDragLeave={handlePaletteDragLeave}
        onDrop={handlePaletteDrop}
      >
        <div
          className={cn(
            "relative flex shrink-0 items-start gap-1 border-b border-gray-100 px-2 dark:border-gray-800",
            isShape ? "pt-1.5" : "pt-2",
          )}
          style={head.barBackground ? { backgroundColor: head.barBackground } : undefined}
        >
          <div className="flex min-w-0 flex-1 items-end gap-1 overflow-x-auto" role="tablist" aria-label="页签">
            {cfg.panes.map((pane) => {
              const active = pane.id === cfg.activePaneId;
              const childCount = pane.childWidgetIds.length;
              return (
                <button
                  key={pane.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={cn(
                    "relative max-w-[7.5rem] shrink-0 truncate rounded-t-lg px-2.5 py-1.5 font-medium transition-colors",
                    "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500/30",
                    active
                      ? "bg-brand-50 text-brand-600 after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-brand-500 dark:bg-brand-500/15 dark:text-brand-400 dark:after:bg-brand-400"
                      : "text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200",
                  )}
                  style={{
                    fontSize: tabFontSize,
                    ...(active && head.activeColor
                      ? { color: head.activeColor }
                      : !active && head.inactiveColor
                        ? { color: head.inactiveColor }
                        : undefined),
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePane(pane.id);
                  }}
                >
                  <span className="truncate">{pane.title}</span>
                  {childCount > 0 ? (
                    <span className="ml-1 tabular-nums text-[10px] opacity-70">({childCount})</span>
                  ) : null}
                </button>
              );
            })}
          </div>
          {mode === "edit" && cfg.panes.length < MAX_PANES ? (
            <button
              type="button"
              className="mb-0.5 ml-auto inline-flex size-7 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-brand-500 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500/30 dark:hover:bg-white/5 dark:hover:text-brand-400"
              aria-label="添加页签"
              onClick={(e) => {
                e.stopPropagation();
                addPane();
              }}
            >
              <Plus className="size-3.5" aria-hidden />
            </button>
          ) : null}
        </div>

        <div
          className="dashboard-scroll pointer-events-auto min-h-0 flex-1 overflow-auto p-2"
          role="tabpanel"
          aria-label={activePane?.title ?? "页签内容"}
        >
          {children.length === 0 ? (
            <TabsPaneEmptyState mode={mode} />
          ) : (
            <div className="flex min-h-0 flex-col gap-2">
              {children.map((child) => (
                <div key={child.id} className="min-h-[72px] shrink-0">
                  {renderChild(child)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
