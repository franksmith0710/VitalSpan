import { useState } from "react";
import { ArrowDown, ArrowUp, GripVertical, Minus, Plus, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import type { LayoutWidget } from "./layoutUtils";
import { WidgetSqlPanel } from "./WidgetSqlPanel";

type DashboardWidgetProps = {
  widget: LayoutWidget;
  mode: "edit" | "view";
  onDelete: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  onResize: (id: string, patch: Partial<Pick<LayoutWidget, "colSpan" | "rowSpan" | "title">>) => void;
  onTitleChange: (id: string, title: string) => void;
  onChartConfigChange?: (id: string, config: ChartViewConfig) => void;
  filterParameters?: Record<string, string>;
  executeKey?: string;
};

export function DashboardWidget({
  widget,
  mode,
  onDelete,
  onMove,
  onResize,
  onTitleChange,
  onChartConfigChange,
  filterParameters,
  executeKey,
}: DashboardWidgetProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-2 dark:border-gray-800">
        {mode === "edit" ? (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="dashboard-drag-handle cursor-grab text-gray-400" aria-label="拖拽组件">
              <GripVertical className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
            <Input
              value={widget.title}
              onChange={(e) => onTitleChange(widget.id, e.target.value)}
              className="h-8 max-w-[200px] text-theme-sm"
              aria-label="组件标题"
            />
            <p className="mt-1 truncate text-theme-xs text-gray-500">
              {widget.chartConfig.mode ?? "sql"} · {(widget.chartConfig.sql ?? "").slice(0, 40)}
            </p>
          </div>
          </div>
        ) : (
          <h4 className="truncate text-theme-sm font-medium text-gray-800 dark:text-white/90">
            {widget.title}
          </h4>
        )}
        {mode === "edit" ? (
          <div className="flex shrink-0 flex-wrap items-center gap-1">
            {([4, 6, 8, 12] as const).map((span) => (
              <IconButton
                key={span}
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`宽度 ${span} 列`}
                className={widget.colSpan === span ? "bg-gray-100 dark:bg-gray-800" : undefined}
                onClick={() => onResize(widget.id, { colSpan: span })}
              >
                <span className="text-theme-xs">{span}</span>
              </IconButton>
            ))}
            <IconButton
              type="button"
              variant="ghost"
              size="sm"
              aria-label="减少行高"
              disabled={widget.rowSpan <= 1}
              onClick={() => onResize(widget.id, { rowSpan: Math.max(1, widget.rowSpan - 1) })}
            >
              <Minus className="size-4" />
            </IconButton>
            <IconButton
              type="button"
              variant="ghost"
              size="sm"
              aria-label="增加行高"
              disabled={widget.rowSpan >= 8}
              onClick={() => onResize(widget.id, { rowSpan: Math.min(8, widget.rowSpan + 1) })}
            >
              <Plus className="size-4" />
            </IconButton>
            <IconButton
              type="button"
              variant="ghost"
              size="sm"
              aria-label="上移"
              onClick={() => onMove(widget.id, "up")}
            >
              <ArrowUp className="size-4" />
            </IconButton>
            <IconButton
              type="button"
              variant="ghost"
              size="sm"
              aria-label="下移"
              onClick={() => onMove(widget.id, "down")}
            >
              <ArrowDown className="size-4" />
            </IconButton>
            <IconButton
              type="button"
              variant="ghost"
              size="sm"
              aria-label="删除组件"
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 className="size-4" />
            </IconButton>
          </div>
        ) : null}
      </div>
      {mode === "edit" && onChartConfigChange ? (
        <WidgetSqlPanel
          widget={widget}
          onChange={(chartConfig) => onChartConfigChange(widget.id, chartConfig)}
        />
      ) : null}
      <div className="flex-1 p-2">
        <ChartRenderer
          config={widget.chartConfig}
          title={widget.title}
          filterParameters={filterParameters}
          executeKey={executeKey}
        />
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
