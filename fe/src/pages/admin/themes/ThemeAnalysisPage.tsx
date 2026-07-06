import { toast } from "sonner";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mapApiError } from "@/lib/apiError";
import { useThemeAnalysis } from "./useThemeAnalysis";

const DIMENSION_OPTIONS = ["region", "status", "category"] as const;

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-error-500 bg-error-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-error-500/30 dark:bg-error-500/15">
      <p className="text-theme-sm text-error-700 dark:text-error-400">{message}</p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        重试
      </Button>
    </div>
  );
}

function DrillTable({ columns, rows }: { columns: string[]; rows: unknown[][] }) {
  return (
    <div className="min-h-[240px] overflow-x-auto">
      <table className="w-full min-w-[320px] text-theme-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-800">
            {columns.map((col) => (
              <th key={col} className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-100 dark:border-gray-800/60">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 text-gray-600 dark:text-gray-400">
                  {String(cell ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ThemeAnalysisPage() {
  const {
    canWrite,
    routeDashboardId,
    effectiveDashboardId,
    setSelectedDashboardId,
    dashboardsQuery,
    configQuery,
    chartBindingsQuery,
    executePlanQuery,
    drillQuery,
    activeDimensionId,
    setActiveDimensionId,
    draftDimensions,
    draftGranularity,
    setDraftGranularity,
    toggleDimensionDraft,
    saveMutation,
    granularities,
  } = useThemeAnalysis();

  const needsDashboardPicker = !routeDashboardId || routeDashboardId === "default";
  const hasConfig = Boolean(configQuery.data);
  const compareWindow = executePlanQuery.data?.compareWindow;
  const showCompareBadge =
    (configQuery.data?.timeGranularity === "yoy" || configQuery.data?.timeGranularity === "mom") &&
    compareWindow;

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync();
      toast.success("主题配置已保存");
    } catch (err) {
      toast.error(mapApiError(err));
    }
  };

  return (
    <AdminPageShell title="实体主题分析" description="配置实体主题维度并按维度钻取分析。">
      {needsDashboardPicker ? (
        <div className="mb-4 max-w-md">
          <Select value={effectiveDashboardId} onValueChange={setSelectedDashboardId}>
            <SelectTrigger aria-label="选择 Dashboard">
              <SelectValue placeholder="选择 Dashboard" />
            </SelectTrigger>
            <SelectContent>
              {(dashboardsQuery.data?.items ?? []).map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <Tabs defaultValue="config" className="flex flex-col gap-6">
        <TabsList>
          <TabsTrigger value="config">配置</TabsTrigger>
          <TabsTrigger value="analysis">分析</TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle className="text-theme-base">主题配置</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {!canWrite ? (
                <p className="text-theme-sm text-gray-600 dark:text-gray-400">
                  只读权限，无法修改主题配置
                </p>
              ) : null}

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <span className="text-theme-sm text-gray-600 dark:text-gray-400">时间粒度</span>
                <Select
                  value={draftGranularity}
                  onValueChange={setDraftGranularity}
                  disabled={!canWrite}
                >
                  <SelectTrigger className="w-[180px]" aria-label="时间粒度">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {granularities.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="mb-2 text-theme-sm text-gray-600 dark:text-gray-400">分析维度</p>
                <div className="flex flex-wrap gap-2">
                  {DIMENSION_OPTIONS.map((dim) => {
                    const selected = draftDimensions.some((d) => d.dimensionId === dim);
                    return (
                      <Button
                        key={dim}
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!canWrite}
                        aria-pressed={selected}
                        onClick={() => toggleDimensionDraft(dim)}
                      >
                        {dim}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <Button type="button" disabled={!canWrite || saveMutation.isPending} onClick={() => void handleSave()}>
                {saveMutation.isPending ? "保存中…" : "保存"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis">
          {!hasConfig ? (
            <Card>
              <CardContent className="py-10 text-center text-theme-sm text-gray-600 dark:text-gray-400">
                请先配置
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-6">
              {showCompareBadge && compareWindow ? (
                <Badge variant="outline" className="w-fit">
                  对比窗口：{compareWindow.current.start} ~ {compareWindow.current.end} vs{" "}
                  {compareWindow.baseline.start} ~ {compareWindow.baseline.end}
                </Badge>
              ) : null}

              <Card>
                <CardHeader>
                  <CardTitle className="text-theme-base">维度钻取</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="w-full whitespace-nowrap pb-2">
                    <div className="flex gap-2">
                      {(configQuery.data?.dimensions ?? []).map((dim) => (
                        <Button
                          key={dim.dimensionId}
                          type="button"
                          variant="outline"
                          size="sm"
                          aria-pressed={activeDimensionId === dim.dimensionId}
                          className={
                            activeDimensionId === dim.dimensionId
                              ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
                              : undefined
                          }
                          onClick={() => setActiveDimensionId(dim.dimensionId)}
                        >
                          {dim.label ?? dim.dimensionId}
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>

                  {drillQuery.isLoading ? (
                    <Skeleton className="mt-4 h-[240px] w-full" />
                  ) : drillQuery.isError ? (
                    <div className="mt-4">
                      <ErrorBanner
                        message={mapApiError(drillQuery.error)}
                        onRetry={() => void drillQuery.refetch()}
                      />
                    </div>
                  ) : drillQuery.data ? (
                    <div className="mt-4">
                      <DrillTable columns={drillQuery.data.columns} rows={drillQuery.data.rows} />
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-theme-base">关联图表</CardTitle>
                </CardHeader>
                <CardContent>
                  {chartBindingsQuery.isLoading ? (
                    <Skeleton className="h-16 w-full" />
                  ) : (chartBindingsQuery.data?.bindings ?? []).length === 0 ? (
                    <p className="text-theme-sm text-gray-600 dark:text-gray-400">暂无关联图表</p>
                  ) : (
                    <ul className="space-y-2 text-theme-sm text-gray-700 dark:text-gray-300">
                      {chartBindingsQuery.data?.bindings.map((b) => (
                        <li key={b.widgetId}>
                          widgetId: {b.widgetId}
                          {b.dimensionId ? ` · dimension: ${b.dimensionId}` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </AdminPageShell>
  );
}
