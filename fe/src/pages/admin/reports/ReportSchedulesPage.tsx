import { useQuery } from "@tanstack/react-query";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";
import { PageErrorBanner } from "@/components/ui/page-error-banner";

type ReportSchedule = {
  id: string;
  catalogNodeId: string;
  name?: string;
  status: string;
  cronExpression?: string | null;
};

export function ReportSchedulesPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.reportSchedules(),
    queryFn: () =>
      apiFetch<{ items: ReportSchedule[] }>("/api/v1/reports/schedules"),
  });

  const items = data?.items ?? [];

  return (
    <AdminPageShell
      title="报表调度"
      description="查看报表模板调度任务与执行状态（RPT-005）。"
    >
      {isError ? <PageErrorBanner message={mapApiError(error)} onRetry={() => void refetch()} /> : null}

      <div className="overflow-x-only rounded-xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
        <table className="min-w-[720px] w-full text-left text-theme-sm">
          <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">调度 ID</th>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">模板节点</th>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Cron</th>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">状态</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={4} className="px-4 py-3">
                      <Skeleton className="h-6 w-full" />
                    </td>
                  </tr>
                ))
              : null}
            {items.length === 0 && !isLoading ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                  暂无调度任务
                </td>
              </tr>
            ) : null}
            {items.map((s) => (
              <tr key={s.id} className="border-b border-gray-100 dark:border-gray-800">
                <td className="px-4 py-3 font-mono text-theme-xs">{s.id.slice(0, 8)}…</td>
                <td className="px-4 py-3 font-mono text-theme-xs">{s.catalogNodeId.slice(0, 8)}…</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                  {s.cronExpression ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <Badge variant="light" color="primary" size="sm">
                    {s.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminPageShell>
  );
}
