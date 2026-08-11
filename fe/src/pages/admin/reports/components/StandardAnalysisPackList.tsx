import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { ReactNode } from "react";
import type { AnalysisPack } from "../useStandardAnalysis";
import { THEME_META } from "./standardAnalysisUi";
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
    <aside className="flex min-h-0 w-full flex-col border-b border-gray-200 lg:border-b-0 lg:border-r dark:border-gray-800">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <h2 className="text-theme-sm font-medium text-gray-800 dark:text-white/90">分析包</h2>
        <div className="flex items-center gap-2">
          {!isLoading ? (
            <span className="text-theme-xs tabular-nums text-gray-400 dark:text-gray-500">{packs.length}</span>
          ) : null}
          {headerAction}
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <ul className="p-2">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <li key={i} className="px-1 py-0.5">
                  <Skeleton className="h-11 w-full rounded-lg" />
                </li>
              ))
            : packs.length === 0
              ? (
                  <li className="px-3 py-6 text-center text-theme-xs text-gray-500 dark:text-gray-400">{emptyHint}</li>
                )
              : packs.map((pack) => {
                const active = pack.packKey === activePackKey;
                const themePreview = pack.enabledThemes
                  .slice(0, 3)
                  .map((theme) => THEME_META[theme]?.label ?? theme)
                  .join("、");
                return (
                  <li key={pack.packKey}>
                    <button
                      type="button"
                      onClick={() => onSelect(pack.packKey)}
                      aria-current={active ? "true" : undefined}
                      className={cn(
                        "w-full rounded-lg border-l-2 px-3 py-2.5 text-left transition-colors",
                        active
                          ? "border-brand-500 bg-gray-50 dark:bg-white/[0.04]"
                          : "border-transparent text-gray-600 hover:bg-gray-50/80 dark:text-gray-400 dark:hover:bg-white/[0.02]",
                      )}
                    >
                      <span
                        className={cn(
                          "block truncate text-theme-sm",
                          active ? "font-medium text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300",
                        )}
                      >
                        {pack.displayName}
                      </span>
                      <span className="mt-1 block truncate text-theme-xs text-gray-400 dark:text-gray-500">
                        {themePreview}
                        {pack.enabledThemes.length > 3 ? "…" : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
        </ul>
      </ScrollArea>
    </aside>
  );
}
