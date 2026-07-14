import type { ReactNode } from "react";
import { useCallback, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

/** 原生 table 选择列（非 shadcn Table） */
export const listTableSelectHeadClass =
  "w-10 max-w-10 px-2 py-2 text-center font-medium text-gray-600 dark:text-gray-400";
export const listTableSelectCellClass = "w-10 max-w-10 px-2 py-2";

export function useListBatchMode(onExit?: () => void) {
  const [batchMode, setBatchMode] = useState(false);

  const enterBatchMode = useCallback(() => setBatchMode(true), []);

  const exitBatchMode = useCallback(() => {
    setBatchMode(false);
    onExit?.();
  }, [onExit]);

  const toggleBatchMode = useCallback(() => {
    setBatchMode((prev) => {
      if (prev) onExit?.();
      return !prev;
    });
  }, [onExit]);

  return { batchMode, setBatchMode, enterBatchMode, exitBatchMode, toggleBatchMode };
}

export function ListBatchModeButton({
  active,
  onToggle,
  className,
}: {
  active: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant={active ? "primary" : "outline"}
      size="sm"
      className={className}
      onClick={onToggle}
    >
      {active ? "完成" : "批量操作"}
    </Button>
  );
}

export function ListPageBatchActions({
  batchMode,
  onToggleBatchMode,
  selectedCount,
  entityLabel = "项",
  onClear,
  onDelete,
  className,
}: {
  batchMode: boolean;
  onToggleBatchMode: () => void;
  selectedCount: number;
  entityLabel?: string;
  onClear: () => void;
  onDelete: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      <ListBatchModeButton active={batchMode} onToggle={onToggleBatchMode} />
      {batchMode ? (
        <ListBatchDeleteBar
          selectedCount={selectedCount}
          entityLabel={entityLabel}
          onClear={onClear}
          onDelete={onDelete}
          className="min-w-0 flex-1"
        />
      ) : null}
    </div>
  );
}

export function ListRowCheckbox({
  checked,
  onCheckedChange,
  ariaLabel,
  className,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <Checkbox
      checked={checked}
      onCheckedChange={(value) => onCheckedChange(value === true)}
      aria-label={ariaLabel}
      className={cn("size-4 shrink-0", className)}
      onClick={(event) => event.stopPropagation()}
    />
  );
}

export function ListHeaderCheckbox({
  checked,
  indeterminate,
  onCheckedChange,
  disabled,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Checkbox
      checked={indeterminate ? "indeterminate" : checked}
      disabled={disabled}
      onCheckedChange={(value) => onCheckedChange(value === true)}
      aria-label="全选当前页"
      className="size-4"
    />
  );
}

export function ListBatchDeleteBar({
  selectedCount,
  entityLabel = "项",
  onDelete,
  onClear,
  className,
}: {
  selectedCount: number;
  entityLabel?: string;
  onDelete: () => void;
  onClear: () => void;
  className?: string;
}) {
  if (selectedCount === 0) return null;
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-lg border border-brand-200 bg-brand-50/60 px-3 py-2 text-theme-xs dark:border-brand-500/30 dark:bg-brand-500/10",
        className,
      )}
    >
      <span className="font-medium text-brand-700 dark:text-brand-300">
        已选 {selectedCount} {entityLabel}
      </span>
      <Button type="button" variant="ghost" size="sm" className="h-8" onClick={onClear}>
        取消选择
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 border-error-200 text-error-600 hover:bg-error-50 dark:border-error-500/30 dark:text-error-400"
        onClick={onDelete}
      >
        批量删除 ({selectedCount})
      </Button>
    </div>
  );
}

export function BatchDeleteDialog({
  open,
  onOpenChange,
  count,
  title,
  description,
  pending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  count: number;
  title: string;
  description?: ReactNode;
  pending?: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description ?? `确定删除选中的 ${count} 项？删除后无法恢复。`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>取消</AlertDialogCancel>
          <AlertDialogAction disabled={pending} onClick={onConfirm}>
            {pending ? "删除中…" : "删除"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
