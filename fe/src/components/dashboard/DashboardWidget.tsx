import { useState } from "react";
import { Trash2 } from "lucide-react";
import { ChartRenderer } from "@/components/charts/ChartRenderer";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { LayoutWidget } from "./layoutUtils";
import { isWidgetConfigReady } from "./createLayoutWidget";
import { widgetChartIcon, WIDGET_CHART_LABELS } from "./widgetIcons";

type DashboardWidgetProps = {
  widget: LayoutWidget;
  mode: "edit" | "view";
  selected?: boolean;
  onSelect?: () => void;
  onDelete?: (id: string) => void;
  onTitleChange: (id: string, title: string) => void;
  onChartConfigChange?: (id: string, config: ChartViewConfig) => void;
  filterParameters?: Record<string, string>;
  executeKey?: string;
};

function WidgetEditPreview({ widget }: { widget: LayoutWidget }) {
  const Icon = widgetChartIcon(widget.chartConfig.chartType);
  const typeLabel = WIDGET_CHART_LABELS[widget.chartConfig.chartType] ?? widget.chartConfig.chartType;
  const ready = isWidgetConfigReady(widget.chartConfig);

  return (
    <div className="flex h-full min-h-[64px] flex-col items-center justify-center gap-2 px-3 py-3">
      <span className="flex size-8 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400">
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <Badge variant="light" color="light" size="sm">
          {typeLabel}
        </Badge>
        <Badge variant="light" color={ready ? "success" : "warning"} size="sm">
          {ready ? "配置就绪" : "待配置"}
        </Badge>
      </div>
      <p className="text-center text-theme-xs text-gray-500 dark:text-gray-400">
        {ready ? "保存布局后可在预览查看出图" : "在右侧配置数据源与查询"}
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
  onTitleChange,
  filterParameters,
  executeKey,
}: DashboardWidgetProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const Icon = widgetChartIcon(widget.chartConfig.chartType);
  const typeLabel = WIDGET_CHART_LABELS[widget.chartConfig.chartType] ?? widget.chartConfig.chartType;

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-xl border bg-white shadow-theme-xs transition-[border-color,box-shadow] dark:bg-white/[0.03]",
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
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-white text-gray-500 shadow-theme-xs dark:bg-white/5 dark:text-gray-400">
            <Icon className="size-3.5" aria-hidden />
          </span>
          <Input
            value={widget.title}
            onChange={(e) => onTitleChange(widget.id, e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            className="dashboard-no-drag h-7 min-w-0 flex-1 border-transparent bg-transparent px-1 text-theme-sm font-medium shadow-none focus-visible:border-gray-300 dark:focus-visible:border-gray-700"
            aria-label="组件标题"
          />
          <span className="dashboard-no-drag hidden shrink-0 text-theme-xs tabular-nums text-gray-400 sm:inline">
            {widget.colSpan}×{widget.rowSpan}
          </span>
          {onDelete ? (
            <IconButton
              type="button"
              variant="ghost"
              size="sm"
              className="dashboard-no-drag size-7 shrink-0 text-gray-400 hover:text-error-600 dark:hover:text-error-400"
              aria-label="删除组件"
              onClick={(e) => {
                e.stopPropagation();
                setConfirmOpen(true);
              }}
            >
              <Trash2 className="size-3.5" />
            </IconButton>
          ) : null}
        </div>
      ) : (
        <div className="flex shrink-0 items-center gap-2 border-b border-gray-100 px-3 py-2 dark:border-gray-800">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400">
            <Icon className="size-3.5" aria-hidden />
          </span>
          <h4 className="min-w-0 flex-1 truncate text-theme-sm font-semibold text-gray-800 dark:text-white/90">
            {widget.title}
          </h4>
          <span className="shrink-0 text-theme-xs text-gray-400">{typeLabel}</span>
        </div>
      )}

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
          "min-h-0 flex-1",
          mode === "edit" && "cursor-pointer hover:bg-gray-50/50 dark:hover:bg-white/[0.02]",
        )}
      >
        {mode === "edit" ? (
          <WidgetEditPreview widget={widget} />
        ) : (
          <div className="h-full p-2">
            <ChartRenderer
              config={widget.chartConfig}
              title={widget.title}
              filterParameters={filterParameters}
              executeKey={executeKey}
            />
          </div>
        )}
      </div>

      {onDelete ? (
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>删除组件</AlertDialogTitle>
              <AlertDialogDescription>
                确定删除「{widget.title}」？删除后需保存布局才会生效。
              </AlertDialogDescription>
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
      ) : null}
    </div>
  );
}
