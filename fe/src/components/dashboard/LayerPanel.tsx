import {
  ArrowDown,
  ArrowUp,
  ChevronsDown,
  ChevronsUp,
  Eye,
  EyeOff,
  Lock,
  Unlock,
} from "lucide-react";
import { sortWidgets, type LayoutWidget } from "@/components/dashboard/layoutUtils";
import { IconButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { moveWidget, moveWidgetToExtreme } from "@/components/dashboard/layoutUtils";

export type LayerPanelProps = {
  widgets: LayoutWidget[];
  selectedId?: string | null;
  onSelect: (widgetId: string) => void;
  onWidgetsChange: (widgets: LayoutWidget[]) => void;
  className?: string;
};

function widgetTypeLabel(type: LayoutWidget["type"]): string {
  switch (type) {
    case "chart":
      return "图表";
    case "filter":
      return "筛选";
    case "text":
      return "文本";
    case "media":
      return "媒体";
    case "tabs":
      return "页签";
    default:
      return type;
  }
}

export function LayerPanel({
  widgets,
  selectedId,
  onSelect,
  onWidgetsChange,
  className,
}: LayerPanelProps) {
  const topLevel = sortWidgets(widgets.filter((w) => !w.parentTabsId)).reverse();

  const patchWidget = (id: string, patch: Partial<LayoutWidget>) => {
    onWidgetsChange(widgets.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  };

  return (
    <section className={cn("flex min-h-0 flex-col", className)} data-layer-panel>
      <header className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-theme-sm font-medium text-gray-800 dark:text-white/90">图层管理</h3>
        <span className="text-theme-xs text-gray-500">{topLevel.length} 项</span>
      </header>
      <ul className="custom-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
        {topLevel.map((widget) => (
          <li key={widget.id}>
            <div
              className={cn(
                "flex items-center gap-1 rounded-lg border px-2 py-1.5 transition-colors",
                selectedId === widget.id
                  ? "border-brand-300 bg-brand-50 dark:border-brand-500/40 dark:bg-brand-500/10"
                  : "border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.02]",
                widget.hidden && "opacity-60",
              )}
            >
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left text-theme-xs text-gray-800 dark:text-gray-100"
                onClick={() => onSelect(widget.id)}
              >
                <span className="text-gray-400 dark:text-gray-500">{widgetTypeLabel(widget.type)} · </span>
                {widget.title || widget.id}
              </button>
              <div className="flex shrink-0 items-center gap-0.5">
                <IconButton
                  type="button"
                  variant="ghost"
                  size="xs"
                  aria-label={widget.hidden ? "显示图层" : "隐藏图层"}
                  onClick={() => patchWidget(widget.id, { hidden: !widget.hidden })}
                >
                  {widget.hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </IconButton>
                <IconButton
                  type="button"
                  variant="ghost"
                  size="xs"
                  aria-label={widget.locked ? "解锁图层" : "锁定图层"}
                  onClick={() => patchWidget(widget.id, { locked: !widget.locked })}
                >
                  {widget.locked ? <Lock className="size-3.5" /> : <Unlock className="size-3.5" />}
                </IconButton>
                <IconButton
                  type="button"
                  variant="ghost"
                  size="xs"
                  aria-label="置顶"
                  onClick={() => onWidgetsChange(moveWidgetToExtreme(widgets, widget.id, "top"))}
                >
                  <ChevronsUp className="size-3.5" />
                </IconButton>
                <IconButton
                  type="button"
                  variant="ghost"
                  size="xs"
                  aria-label="上移一层"
                  onClick={() => onWidgetsChange(moveWidget(widgets, widget.id, "up"))}
                >
                  <ArrowUp className="size-3.5" />
                </IconButton>
                <IconButton
                  type="button"
                  variant="ghost"
                  size="xs"
                  aria-label="下移一层"
                  onClick={() => onWidgetsChange(moveWidget(widgets, widget.id, "down"))}
                >
                  <ArrowDown className="size-3.5" />
                </IconButton>
                <IconButton
                  type="button"
                  variant="ghost"
                  size="xs"
                  aria-label="置底"
                  onClick={() => onWidgetsChange(moveWidgetToExtreme(widgets, widget.id, "bottom"))}
                >
                  <ChevronsDown className="size-3.5" />
                </IconButton>
              </div>
            </div>
          </li>
        ))}
        {topLevel.length === 0 ? (
          <li className="rounded-lg border border-dashed border-gray-200 px-3 py-6 text-center text-theme-xs text-gray-500 dark:border-gray-800">
            画布中暂无组件
          </li>
        ) : null}
      </ul>
    </section>
  );
}
