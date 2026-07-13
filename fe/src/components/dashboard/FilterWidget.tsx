import { useState } from "react";
import { Filter as FilterIcon, GripVertical, Trash2 } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { FilterControl } from "./FilterWidgetControls";
import type { FilterWidgetConfig, LayoutWidget } from "./layoutUtils";

type FilterWidgetProps = {
  widget: LayoutWidget & { filterConfig: FilterWidgetConfig };
  mode: "edit" | "view";
  selected?: boolean;
  value: string;
  onValueChange: (filterId: string, value: string) => void;
  onSelect?: () => void;
  onDelete?: (id: string) => void;
  onTitleChange?: (id: string, title: string) => void;
};

export function FilterWidget({
  widget,
  mode,
  selected = false,
  value,
  onValueChange,
  onSelect,
  onDelete,
  onTitleChange,
}: FilterWidgetProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const cfg = widget.filterConfig;
  const controlId = `fw-${widget.id}`;

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
          role="group"
          aria-label="拖动以移动组件"
          title="拖动以移动组件"
        >
          <GripVertical
            className="size-3.5 shrink-0 text-gray-300 dark:text-gray-600"
            aria-hidden
          />
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-white text-gray-500 shadow-theme-xs dark:bg-white/5 dark:text-gray-400">
            <FilterIcon className="size-3.5" aria-hidden />
          </span>
          <Input
            value={widget.title}
            onChange={(e) => onTitleChange?.(widget.id, e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            className="dashboard-no-drag h-7 min-w-0 flex-1 border-transparent bg-transparent px-1 text-theme-sm font-medium shadow-none focus-visible:border-gray-300 dark:focus-visible:border-gray-700"
            aria-label="筛选器标题"
          />
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
            <FilterIcon className="size-3.5" aria-hidden />
          </span>
          <h4 className="min-w-0 flex-1 truncate text-theme-sm font-semibold text-gray-800 dark:text-white/90">
            {widget.title}
          </h4>
          <span className="shrink-0 text-theme-xs text-gray-400">筛选器</span>
        </div>
      )}

      <div
        role={mode === "edit" ? "button" : undefined}
        tabIndex={mode === "edit" ? 0 : undefined}
        onClick={
          mode === "edit"
            ? (e) => {
                e.stopPropagation();
                onSelect?.();
              }
            : undefined
        }
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
          "dashboard-no-drag flex min-h-0 flex-1 items-start p-3",
          mode === "edit" && "cursor-pointer hover:bg-gray-50/50 dark:hover:bg-white/[0.02]",
        )}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <FilterControl
          id={controlId}
          label={cfg.dimensionRef || widget.title}
          controlType={cfg.controlType}
          value={value}
          options={cfg.options}
          onChange={(next) => onValueChange(cfg.filterId, next)}
          className="w-full max-w-none sm:max-w-none"
        />
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
