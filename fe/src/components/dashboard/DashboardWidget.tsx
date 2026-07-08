import { useState } from "react";
import { GripVertical, MoreHorizontal, Trash2 } from "lucide-react";
import { ChartRenderer } from "@/components/charts/ChartRenderer";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { IconButton } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { LayoutWidget } from "./layoutUtils";
import { widgetChartIcon } from "./widgetIcons";

type DashboardWidgetProps = {
  widget: LayoutWidget;
  mode: "edit" | "view";
  selected?: boolean;
  onSelect?: () => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  onResize: (id: string, patch: Partial<Pick<LayoutWidget, "colSpan" | "rowSpan" | "title">>) => void;
  onTitleChange: (id: string, title: string) => void;
  onChartConfigChange?: (id: string, config: ChartViewConfig) => void;
  filterParameters?: Record<string, string>;
  executeKey?: string;
};

function stopBubble(e: React.SyntheticEvent) {
  e.stopPropagation();
}

function WidgetEditPreview({ widget }: { widget: LayoutWidget }) {
  const Icon = widgetChartIcon(widget.chartConfig.chartType);
  const ready = Boolean(widget.chartConfig.dataSourceId && widget.chartConfig.sql?.trim());

  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-3 py-4 dark:border-gray-800 dark:bg-white/[0.02]">
      <span className="flex size-9 items-center justify-center rounded-lg bg-white text-gray-500 shadow-theme-xs dark:bg-white/5 dark:text-gray-400">
        <Icon className="size-4" aria-hidden />
      </span>
      <p className="text-center text-theme-xs text-gray-500 dark:text-gray-400">
        {ready ? "配置已就绪，保存后预览" : "在右侧配置数据源与 SQL"}
      </p>
    </div>
  );
}

export function DashboardWidget({
  widget,
  mode,
  selected = false,
  onSelect,
  onDelete,
  onMove,
  onResize,
  onTitleChange,
  filterParameters,
  executeKey,
}: DashboardWidgetProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const Icon = widgetChartIcon(widget.chartConfig.chartType);

  return (
    <div
      role={mode === "edit" ? "button" : undefined}
      tabIndex={mode === "edit" ? 0 : undefined}
      onClick={mode === "edit" ? onSelect : undefined}
      onKeyDown={
        mode === "edit"
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect?.();
              }
            }
          : undefined
      }
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border bg-white shadow-theme-xs transition-shadow dark:bg-white/[0.03]",
        mode === "edit" && "cursor-pointer hover:shadow-theme-sm",
        selected
          ? "border-brand-300 ring-2 ring-brand-500/20 dark:border-brand-500/40"
          : "border-gray-200 dark:border-gray-800",
      )}
    >
      <div
        className="flex shrink-0 items-center gap-1.5 border-b border-gray-100 px-2 py-2 dark:border-gray-800"
        onClick={stopBubble}
      >
        {mode === "edit" ? (
          <span
            className="dashboard-drag-handle flex size-8 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 active:cursor-grabbing dark:hover:bg-white/5 dark:hover:text-gray-300"
            aria-label="拖拽组件"
            onClick={stopBubble}
          >
            <GripVertical className="size-4" />
          </span>
        ) : null}
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400">
          <Icon className="size-4" aria-hidden />
        </span>
        {mode === "edit" ? (
          <Input
            value={widget.title}
            onChange={(e) => onTitleChange(widget.id, e.target.value)}
            onClick={stopBubble}
            className="h-8 min-w-0 flex-1 border-transparent bg-transparent px-1.5 text-theme-sm shadow-none focus-visible:border-gray-300 dark:focus-visible:border-gray-700"
            aria-label="组件标题"
          />
        ) : (
          <h4 className="min-w-0 flex-1 truncate text-theme-sm font-semibold text-gray-800 dark:text-white/90">
            {widget.title}
          </h4>
        )}
        {mode === "edit" ? (
          <div className="flex shrink-0 items-center gap-1" onClick={stopBubble}>
            <Badge variant="light" color="light" size="sm" className="hidden sm:inline-flex">
              {widget.colSpan} 列
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <IconButton type="button" variant="ghost" size="sm" aria-label="更多操作">
                  <MoreHorizontal className="size-4" />
                </IconButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onMove(widget.id, "up")}>上移</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onMove(widget.id, "down")}>下移</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <IconButton
              type="button"
              variant="ghost"
              size="sm"
              aria-label="删除组件"
              className="text-gray-500 hover:text-error-600 dark:hover:text-error-400"
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 className="size-4" />
            </IconButton>
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 p-2">
        {mode === "edit" ? (
          <WidgetEditPreview widget={widget} />
        ) : (
          <ChartRenderer
            config={widget.chartConfig}
            title={widget.title}
            filterParameters={filterParameters}
            executeKey={executeKey}
          />
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除组件</AlertDialogTitle>
            <AlertDialogDescription>确定删除「{widget.title}」？此操作不可撤销。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(widget.id);
                setConfirmOpen(false);
              }}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
