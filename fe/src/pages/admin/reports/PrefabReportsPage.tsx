import { useAuth } from "@/context/auth-context";
import { Lock } from "lucide-react";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { mapApiError } from "@/lib/apiError";
import { ApiRequestError } from "@/lib/api";
import { PanelEmptyState } from "@/components/ui/panel-empty-state";
import { PrefabReportsEmptyPreview } from "./components/PrefabReportsEmptyPreview";
import { PrefabBindingForm } from "./components/PrefabBindingForm";
import { ReportExportCard } from "./components/ReportExportCard";
import { usePrefabReports } from "./usePrefabReports";
import { PageErrorBanner } from "@/components/ui/page-error-banner";

function ResultTable({ columns, rows }: { columns: string[]; rows: unknown[][] }) {
  return (
    <div className="overflow-x-only">
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

export function PrefabReportsPage() {
  const { user } = useAuth();
  const { bindingsQuery, runMutation } = usePrefabReports();
  const isViewerOnly = user?.roles?.length === 1 && user.roles[0] === "viewer";

  if (isViewerOnly) {
    return (
      <AdminPageShell title="预制分析报表" description="浏览并运行系统预置的分析报表。">
        <Card>
          <CardContent>
            <PanelEmptyState
              icon={<Lock className="size-7" aria-hidden />}
              title="无权运行预制报表"
              description="当前账号仅有查看权限，请联系管理员开通分析或管理权限。"
              variant="framed"
            />
          </CardContent>
        </Card>
      </AdminPageShell>
    );
  }

  const bindings = bindingsQuery.data?.items ?? [];
  const section = runMutation.data?.renderSpec.sections[0];
  const runForbidden =
    runMutation.isError &&
    runMutation.error instanceof ApiRequestError &&
    runMutation.error.code === "RPT_PREFAB_RUN_FORBIDDEN";

  return (
    <AdminPageShell title="预制分析报表" description="浏览并运行系统预置的分析报表。">
      <div className="flex flex-col gap-6">
        {bindingsQuery.isError ? (
          <PageErrorBanner
            message={mapApiError(bindingsQuery.error)}
            onRetry={() => void bindingsQuery.refetch()}
          />
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-theme-base">报表列表</CardTitle>
          </CardHeader>
          <CardContent>
            {bindingsQuery.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : bindings.length === 0 ? (
              <PrefabReportsEmptyPreview />
            ) : (
              <ScrollArea className="max-h-[320px]">
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {bindings.map((binding) => (
                    <li
                      key={binding.bindingKey}
                      className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate max-w-[200px] text-theme-sm font-medium text-gray-800 dark:text-white/90" title={binding.displayName}>
                          {binding.displayName}
                        </p>
                        <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                          {binding.analysisType} · {binding.entityTypeCode}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        disabled={runMutation.isPending}
                        aria-label={`运行报表 ${binding.displayName}`}
                        onClick={() => runMutation.mutate(binding.bindingKey)}
                      >
                        {runMutation.isPending ? "运行中…" : "运行"}
                      </Button>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <PrefabBindingForm binding={bindings[0] ?? null} />

        <ReportExportCard />

        {runForbidden ? (
          <Card>
            <CardContent>
              <PanelEmptyState
                icon={<Lock className="size-7" aria-hidden />}
                title="无权运行预制报表"
                description="当前账号没有运行该报表的权限，请联系管理员调整角色或绑定范围。"
                variant="framed"
              />
            </CardContent>
          </Card>
        ) : null}

        {runMutation.isError && !runForbidden ? (
          <PageErrorBanner message={mapApiError(runMutation.error)} onRetry={() => runMutation.reset()} />
        ) : null}

        {runMutation.isPending ? (
          <Card>
            <CardContent className="py-6">
              <Skeleton className="h-[240px] w-full" />
            </CardContent>
          </Card>
        ) : null}

        {section ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-theme-base">运行结果</CardTitle>
            </CardHeader>
            <CardContent className="min-h-[240px]">
              {section.kind === "table" || !section.chartType ? (
                <ResultTable columns={section.columns} rows={section.rows} />
              ) : (
                <ResultTable columns={section.columns} rows={section.rows} />
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AdminPageShell>
  );
}
