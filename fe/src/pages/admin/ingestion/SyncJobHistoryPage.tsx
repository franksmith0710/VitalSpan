import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { Copy } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type SyncRunItem = {
  id: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  rows_synced: number | null;
  error_message: string | null;
  trace_id: string;
  retry_count: number;
};

type SyncRunListResponse = {
  items: SyncRunItem[];
};

function statusBadge(status: string) {
  if (status === "succeeded") return { color: "success" as const, label: "成功" };
  if (status === "failed") return { color: "error" as const, label: "失败" };
  return { color: "warning" as const, label: "运行中" };
}

export function SyncJobHistoryPage() {
  const { id } = useParams();
  const [runs, setRuns] = useState<SyncRunItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRuns = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<SyncRunListResponse>(
        `/api/v1/ingestion/sync-jobs/${id}/runs?limit=20`,
      );
      setRuns(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadRuns();
  }, [loadRuns]);

  const copyTraceId = async (traceId: string) => {
    try {
      await navigator.clipboard.writeText(traceId);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="space-y-6">
      <nav className="text-theme-sm text-gray-500 dark:text-gray-400">
        <Link to="/admin/ingestion/sync-jobs" className="hover:text-brand-500">
          同步任务
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-800 dark:text-white/90">运行历史</span>
      </nav>

      <div className="flex items-center justify-between">
        <h1 className="text-theme-xl font-semibold text-gray-900 dark:text-white">运行历史</h1>
        <Button type="button" variant="outline" size="sm" onClick={() => void loadRuns()}>
          刷新
        </Button>
      </div>

      {error ? (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-error-500 bg-error-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-error-500/30 dark:bg-error-500/15"
        >
          <p className="text-theme-sm text-error-700 dark:text-error-400">{error}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void loadRuns()}>
            重试
          </Button>
        </div>
      ) : null}

      <div className="rounded-xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
        {loading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : runs.length === 0 ? (
          <div className="px-6 py-16 text-center text-theme-sm text-gray-500 dark:text-gray-400">
            暂无运行记录
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-theme-sm">
              <thead className="border-b border-gray-200 text-gray-500 dark:border-gray-800 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-4 font-medium">状态</th>
                  <th className="px-6 py-4 font-medium">开始时间</th>
                  <th className="px-6 py-4 font-medium">同步行数</th>
                  <th className="px-6 py-4 font-medium">错误信息</th>
                  <th className="px-6 py-4 font-medium">Trace ID</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => {
                  const badge = statusBadge(run.status);
                  return (
                    <tr
                      key={run.id}
                      className="border-b border-gray-100 last:border-0 dark:border-gray-800"
                    >
                      <td className="px-6 py-4">
                        <Badge color={badge.color} variant="light">
                          {badge.label}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                        {new Date(run.started_at).toLocaleString("zh-CN")}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                        {run.rows_synced ?? "—"}
                      </td>
                      <td
                        className="max-w-xs truncate px-6 py-4 text-gray-600 dark:text-gray-300"
                        title={run.error_message ?? undefined}
                      >
                        {run.error_message ?? "—"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="max-w-[120px] truncate font-mono text-xs text-gray-500">
                            {run.trace_id}
                          </span>
                          <IconButton
                            type="button"
                            variant="ghost"
                            size="xs"
                            aria-label="复制 Trace ID"
                            onClick={() => void copyTraceId(run.trace_id)}
                          >
                            <Copy className="size-3.5" />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
