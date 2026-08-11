import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  HUB_SEGMENTED_BUTTON_CLASS,
  HUB_SEGMENTED_SHELL_CLASS,
} from "@/components/dashboard/hubFilterUi";
import {
  DataTable,
  ListPageFooter,
  ListPageTableFrame,
  ListPageToolbar,
} from "@/components/layout/list-page-kit";
import { ListGhostEmptyState } from "@/components/ui/panel-empty-state";
import { PageErrorBanner } from "@/components/ui/page-error-banner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { AnalysisPack, AnalysisTheme, CompareResult, RunResult } from "../useStandardAnalysis";
import {
  normalizeColumns,
  normalizeRows,
  StandardAnalysisMetaRow,
  THEME_META,
} from "./standardAnalysisUi";

type Props = {
  pack: AnalysisPack;
  activeTheme: AnalysisTheme;
  viewMode: "live" | "compare";
  onThemeChange: (theme: AnalysisTheme) => void;
  onViewModeChange: (mode: "live" | "compare") => void;
  runQuery: {
    isLoading: boolean;
    isFetching: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => void;
    data?: RunResult;
  };
  compareQuery: {
    isLoading: boolean;
    isFetching: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => void;
    data?: CompareResult;
  };
  mapError: (error: unknown) => string;
};

export function StandardAnalysisResultPanel({
  pack,
  activeTheme,
  viewMode,
  onThemeChange,
  onViewModeChange,
  runQuery,
  compareQuery,
  mapError,
}: Props) {
  const activeQuery = viewMode === "live" ? runQuery : compareQuery;
  const liveSection = runQuery.data?.renderSpec.sections[0];
  const compareData = compareQuery.data;
  const liveColumns = liveSection ? normalizeColumns(liveSection.columns) : [];
  const liveRows = liveSection
    ? normalizeRows(liveSection.rows, liveColumns).map((row) => row.map((cell) => String(cell ?? "")))
    : [];

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-gray-200 px-5 py-3 dark:border-gray-800">
        <h2 className="truncate text-theme-sm font-semibold text-gray-900 dark:text-white lg:hidden">
          {pack.displayName}
        </h2>
        <div className={cn("min-w-0", "lg:mt-0", "mt-1.5")}>
          <StandardAnalysisMetaRow pack={pack} />
        </div>
      </div>

      <Tabs
        value={activeTheme}
        onValueChange={(value) => onThemeChange(value as AnalysisTheme)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <ListPageToolbar
          filters={
            <TabsList variant="enclosed" size="sm" className="h-auto max-w-full flex-wrap">
              {(pack.enabledThemes as AnalysisTheme[]).map((theme) => (
                <TabsTrigger key={theme} value={theme} variant="enclosed" size="sm">
                  {THEME_META[theme]?.label ?? theme}
                </TabsTrigger>
              ))}
            </TabsList>
          }
          actions={
            <div className="flex items-center gap-2">
              <div className={cn(HUB_SEGMENTED_SHELL_CLASS, "inline-flex gap-0.5 p-0.5")}>
                <Button
                  type="button"
                  variant={viewMode === "live" ? "primary" : "ghost"}
                  size="sm"
                  className={cn(HUB_SEGMENTED_BUTTON_CLASS, "h-8 px-3")}
                  onClick={() => onViewModeChange("live")}
                >
                  实时
                </Button>
                <Button
                  type="button"
                  variant={viewMode === "compare" ? "primary" : "ghost"}
                  size="sm"
                  className={cn(HUB_SEGMENTED_BUTTON_CLASS, "h-8 px-3")}
                  onClick={() => onViewModeChange("compare")}
                >
                  对比上期
                </Button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="size-8 p-0"
                disabled={activeQuery.isFetching}
                aria-label="刷新"
                onClick={() => activeQuery.refetch()}
              >
                <RefreshCw className={cn("size-4", activeQuery.isFetching && "animate-spin")} aria-hidden />
              </Button>
            </div>
          }
        />

        <ListPageTableFrame className="flex min-h-0 flex-1 flex-col">
          {activeQuery.isError ? (
            <PageErrorBanner message={mapError(activeQuery.error)} onRetry={() => activeQuery.refetch()} />
          ) : null}

          {viewMode === "live" ? (
            <DataTable
              loading={activeQuery.isLoading}
              empty={!activeQuery.isLoading && liveRows.length === 0}
              headers={liveColumns}
              rows={liveRows}
              emptyState={{
                icon: null,
                title: "暂无数据",
                description: "当前主题未返回结果，请切换主题或稍后重试。",
              }}
            />
          ) : (
            <DataTable
              loading={activeQuery.isLoading}
              empty={!activeQuery.isLoading && (compareData?.deltas.length ?? 0) === 0}
              headers={["维度", "本期", "上期", "增减"]}
              lastColumnAlign="right"
              rows={(compareData?.deltas ?? []).map((delta) => [
                delta.key,
                <span key={`${delta.key}-current`} className="tabular-nums">
                  {delta.currentValue}
                </span>,
                <span key={`${delta.key}-previous`} className="tabular-nums text-gray-500 dark:text-gray-400">
                  {delta.previousValue ?? "—"}
                </span>,
                <span key={`${delta.key}-delta`} className="tabular-nums font-medium text-gray-800 dark:text-gray-200">
                  {delta.delta != null ? (delta.delta > 0 ? `+${delta.delta}` : delta.delta) : "—"}
                </span>,
              ])}
              emptyState={{
                icon: null,
                title: "暂无可对比数据",
                description: "等待周期快照生成后再查看对比。",
              }}
            />
          )}
        </ListPageTableFrame>

        {viewMode === "compare" && compareData && !activeQuery.isLoading ? (
          <ListPageFooter>
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">
              本期 {compareData.currentPeriodKey}
              {compareData.previousPeriodKey ? ` · 上期 ${compareData.previousPeriodKey}` : " · 暂无上期快照"}
            </p>
          </ListPageFooter>
        ) : null}
      </Tabs>
    </section>
  );
}
