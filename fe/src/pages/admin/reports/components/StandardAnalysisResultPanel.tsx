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
import { PageErrorBanner } from "@/components/ui/page-error-banner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { AnalysisPack, AnalysisTheme, CompareResult, RunResult } from "../useStandardAnalysis";
import {
  buildLiveSummaryMetrics,
  compareDeltaClassName,
  formatCompareDelta,
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

function LiveSummaryStrip({ headers, rows }: { headers: string[]; rows: unknown[][] }) {
  const metrics = buildLiveSummaryMetrics(headers, rows);
  if (metrics.length === 0) return null;

  return (
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-3 dark:border-gray-800 dark:bg-white/[0.02]"
        >
          <p className="text-theme-xs text-gray-500 dark:text-gray-400">{metric.label}</p>
          <p className="mt-0.5 text-title-sm font-semibold tabular-nums text-gray-900 dark:text-white">
            {metric.value}
          </p>
        </div>
      ))}
    </div>
  );
}

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
      <div className="shrink-0 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
        <h2 className="truncate text-theme-sm font-semibold text-gray-900 dark:text-white xl:hidden">
          {pack.displayName}
        </h2>
        <div className="hidden min-w-0 xl:block">
          <h2 className="truncate text-base font-semibold tracking-tight text-gray-900 dark:text-white">
            {pack.displayName}
          </h2>
          <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
            {THEME_META[activeTheme]?.label ?? activeTheme} · {viewMode === "live" ? "实时查询" : "与上期快照对比"}
          </p>
        </div>
        <div className={cn("min-w-0", "mt-3")}>
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
              {(pack.enabledThemes as AnalysisTheme[]).map((theme) => {
                const Icon = THEME_META[theme]?.icon;
                return (
                  <TabsTrigger key={theme} value={theme} variant="enclosed" size="sm" className="gap-1.5">
                    {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden /> : null}
                    {THEME_META[theme]?.label ?? theme}
                  </TabsTrigger>
                );
              })}
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

          {viewMode === "live" && !activeQuery.isLoading && liveRows.length > 0 ? (
            <LiveSummaryStrip headers={liveColumns} rows={liveRows} />
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
                <span key={`${delta.key}-dim`} className="font-medium text-gray-800 dark:text-white/90">
                  {delta.key}
                </span>,
                <span key={`${delta.key}-current`} className="tabular-nums">
                  {delta.currentValue}
                </span>,
                <span key={`${delta.key}-previous`} className="tabular-nums text-gray-500 dark:text-gray-400">
                  {delta.previousValue ?? "—"}
                </span>,
                <span
                  key={`${delta.key}-delta`}
                  className={cn("tabular-nums font-medium", compareDeltaClassName(delta.delta))}
                >
                  {formatCompareDelta(delta.delta)}
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
