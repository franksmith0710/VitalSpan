import { useState } from "react";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { ChartRenderer } from "@/components/charts/ChartRenderer";
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
import type { LayoutWidget } from "./layoutUtils";

type DashboardWidgetProps = {
  widget: LayoutWidget;
  mode: "edit" | "view";
  onDelete: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
};

export function DashboardWidget({ widget, mode, onDelete, onMove }: DashboardWidgetProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-2 dark:border-gray-800">
        <h4 className="truncate text-theme-sm font-medium text-gray-800 dark:text-white/90">{widget.title}</h4>
        {mode === "edit" ? (
          <div className="flex shrink-0 items-center gap-1">
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
      <div className="flex-1 p-2">
        <ChartRenderer config={widget.chartConfig} title={widget.title} />
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
