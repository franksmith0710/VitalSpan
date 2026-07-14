import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Box, Check, ChevronDown, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SearchField } from "@/components/ui/search-field";
import { cn } from "@/lib/utils";
import type { DatasetListItem } from "./DatasetPickerPanel";

type DatasetSelectorProps = {
  widgetId: string;
  datasetId?: string;
  datasetsLoading: boolean;
  datasetsError: boolean;
  datasetsEmpty: boolean;
  datasetItems: DatasetListItem[];
  onSelect: (datasetId: string) => void;
  onRefresh?: () => void;
  className?: string;
};

export function DatasetSelector({
  widgetId,
  datasetId,
  datasetsLoading,
  datasetsError,
  datasetsEmpty,
  datasetItems,
  onSelect,
  onRefresh,
  className,
}: DatasetSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = datasetItems.find((item) => item.datasetId === datasetId);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return datasetItems;
    return datasetItems.filter((item) => item.displayName.toLowerCase().includes(q));
  }, [datasetItems, search]);

  const triggerLabel = datasetsLoading
    ? "加载中…"
    : selected?.displayName ?? "选择数据集";

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          id={`dataset-picker-${widgetId}`}
          aria-label="选择数据集"
          className={cn(
            "flex h-11 w-full items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-left shadow-theme-xs transition-colors",
            "hover:border-brand-300 focus-visible:border-brand-300 focus-visible:outline-hidden focus-visible:ring-3 focus-visible:ring-brand-500/20",
            "dark:border-gray-700 dark:bg-gray-900",
            selected && "border-brand-300 text-brand-600 dark:border-brand-500/40 dark:text-brand-400",
            className,
          )}
        >
          <span className="min-w-0 flex-1 truncate text-theme-sm font-medium text-gray-800 dark:text-white/90">
            {triggerLabel}
          </span>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-gray-400 transition-transform dark:text-gray-500",
              open && "rotate-180",
            )}
            aria-hidden
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[240px] p-0"
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <div
          className="border-b border-gray-100 px-3 py-2.5 dark:border-gray-800"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-theme-xs font-semibold text-gray-800 dark:text-white/90">
              数据集
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-theme-xs text-brand-600 hover:text-brand-700 dark:text-brand-400"
              onClick={() => onRefresh?.()}
              disabled={datasetsLoading}
            >
              <RefreshCw className={cn("size-3.5", datasetsLoading && "animate-spin")} aria-hidden />
              刷新
            </Button>
          </div>
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="搜索"
            aria-label="搜索数据集"
            className="mt-2"
            inputClassName="h-9 text-theme-xs"
          />
        </div>
        <div className="max-h-56 overflow-y-auto p-1">
          {datasetsLoading ? (
            <p className="px-3 py-4 text-center text-theme-xs text-gray-500">加载中…</p>
          ) : datasetsError ? (
            <p className="px-3 py-4 text-center text-theme-xs text-error-600">加载失败</p>
          ) : datasetsEmpty ? (
            <p className="px-3 py-4 text-center text-theme-xs text-gray-500">暂无数据集</p>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-4 text-center text-theme-xs text-gray-500">无匹配数据集</p>
          ) : (
            filtered.map((item) => {
              const active = item.datasetId === datasetId;
              return (
                <DropdownMenuItem
                  key={item.datasetId}
                  className={cn(
                    "gap-2.5 rounded-lg px-2.5 py-2",
                    active && "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400",
                  )}
                  onSelect={() => {
                    onSelect(item.datasetId);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
                    <Box className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-theme-sm">
                    {item.displayName}
                    {!item.boundConfigId ? (
                      <span className="text-theme-xs text-gray-400">（未绑定）</span>
                    ) : null}
                  </span>
                  {active ? <Check className="size-4 shrink-0" aria-hidden /> : null}
                </DropdownMenuItem>
              );
            })
          )}
        </div>
        <DropdownMenuSeparator className="mx-0" />
        <div className="p-2">
          <Link
            to="/admin/datasets"
            className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-theme-xs font-medium text-brand-600 transition-colors hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10"
          >
            <Plus className="size-4" aria-hidden />
            新建数据集
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
