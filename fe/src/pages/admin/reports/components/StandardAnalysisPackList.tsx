import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import type { ReactNode } from "react";
import type { AnalysisPack } from "../useStandardAnalysis";
import { SNAPSHOT_LABELS, THEME_META } from "./standardAnalysisUi";
import { cn } from "@/lib/utils";

type Props = {
  packs: AnalysisPack[];
  activePackKey: string | null;
  isLoading?: boolean;
  onSelect: (packKey: string) => void;
  headerAction?: ReactNode;
  emptyHint?: string;
};

export function StandardAnalysisPackList({
  packs,
  activePackKey,
  isLoading,
  onSelect,
  headerAction,
  emptyHint = "暂无分析包",
}: Props) {
  return (
    <aside className="flex min-h-0 min-w-0 w-full flex-col overflow-hidden border-b border-gray-200 bg-gray-50/40 xl:border-b-0 xl:border-r dark:border-gray-800 dark:bg-white/[0.02]">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <div className="min-w-0 flex-1">
          <h2 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">分析包</h2>
          <p className="mt-0.5 text-theme-xs break-words text-gray-500 dark:text-gray-400">
            选择业务对象分析范围
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!isLoading ? (
            <Badge variant="light" color="light" size="sm" className="tabular-nums">
              {packs.length}
            </Badge>
          ) : null}
          {headerAction}
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <ul className="space-y-1.5 p-3">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <li key={i}>
                  <Skeleton className="h-[4.5rem] w-full rounded-xl" />
                </li>
              ))
            : packs.length === 0
              ? (
                  <li className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-theme-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
                    {emptyHint}
                  </li>
                )
              : packs.map((pack) => {
                const active = pack.packKey === activePackKey;
                const snapshotLabel = SNAPSHOT_LABELS[pack.snapshotCronPreset] ?? pack.snapshotCronPreset;
                return (
                  <li key={pack.packKey}>
                    <button
                      type="button"
                      onClick={() => onSelect(pack.packKey)}
                      aria-current={active ? "true" : undefined}
                      className={cn(
                        "w-full rounded-xl border px-3 py-3 text-left transition-colors",
                        active
                          ? "border-brand-200 bg-white shadow-theme-xs dark:border-brand-500/30 dark:bg-white/[0.04]"
                          : "border-transparent bg-white/70 hover:border-gray-200 hover:bg-white dark:bg-transparent dark:hover:border-gray-800 dark:hover:bg-white/[0.03]",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={cn(
                            "min-w-0 truncate text-theme-sm font-medium",
                            active ? "text-gray-900 dark:text-white" : "text-gray-800 dark:text-white/90",
                          )}
                        >
                          {pack.displayName}
                        </span>
                        {active ? (
                          <Badge variant="light" color="primary" size="sm" className="shrink-0">
                            当前
                          </Badge>
                        ) : null}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {pack.businessObjectCode ? (
                          <Badge variant="light" color="light" size="sm">
                            {pack.businessObjectCode}
                          </Badge>
                        ) : pack.datasetId ? (
                          <Badge variant="light" color="light" size="sm">
                            数据集
                          </Badge>
                        ) : null}
                        <Badge variant="light" color="info" size="sm">
                          {snapshotLabel}
                        </Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {pack.enabledThemes.slice(0, 3).map((theme) => (
                          <span
                            key={theme}
                            className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600 dark:bg-white/10 dark:text-gray-400"
                          >
                            {THEME_META[theme]?.label ?? theme}
                          </span>
                        ))}
                        {pack.enabledThemes.length > 3 ? (
                          <span className="px-1 text-[11px] text-gray-400">+{pack.enabledThemes.length - 3}</span>
                        ) : null}
                      </div>
                    </button>
                  </li>
                );
              })}
        </ul>
      </ScrollArea>
    </aside>
  );
}
