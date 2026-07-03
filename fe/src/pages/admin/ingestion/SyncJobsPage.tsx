import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { History, Pencil, Play, Settings2, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
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
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type SyncJobSummary = {
  id: string;
  name: string;
  source_type: string;
  target_table: string;
  enabled: boolean;
  schedule_cron: string | null;
};

type SyncJobListResponse = {
  items: SyncJobSummary[];
};

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

export function SyncJobsPage() {
  const [jobs, setJobs] = useState<SyncJobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runTarget, setRunTarget] = useState<SyncJobSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SyncJobSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<SyncJobListResponse>("/api/v1/ingestion/sync-jobs");
      setJobs(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  const handleRun = async (jobId: string) => {
    setRunningId(jobId);
    try {
      await apiFetch(`/api/v1/ingestion/sync-jobs/${jobId}/run`, { method: "POST" });
      setRunTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败，请稍后重试");
    } finally {
      setRunningId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/v1/ingestion/sync-jobs/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      await loadJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败，请稍后重试");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <nav className="text-theme-sm text-gray-500 dark:text-gray-400">
        <span>管理</span>
        <span className="mx-2">/</span>
        <span>数据接入</span>
        <span className="mx-2">/</span>
        <span className="text-gray-800 dark:text-white/90">同步任务</span>
      </nav>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-theme-xl font-semibold text-gray-900 dark:text-white">同步任务</h1>
          <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
            管理源库到托管分析库的全量同步任务
          </p>
        </div>
        <Button asChild variant="primary">
          <Link to="/admin/ingestion/sync-jobs/new">新建任务</Link>
        </Button>
      </div>

      {error ? <ErrorBanner message={error} onRetry={() => void loadJobs()} /> : null}

      <div className="rounded-xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
        {loading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
            <p className="text-theme-sm text-gray-500 dark:text-gray-400">暂无同步任务</p>
            <Button asChild variant="primary">
              <Link to="/admin/ingestion/sync-jobs/new">新建任务</Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-theme-sm">
              <thead className="border-b border-gray-200 text-gray-500 dark:border-gray-800 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-4 font-medium">名称</th>
                  <th className="px-6 py-4 font-medium">源类型</th>
                  <th className="px-6 py-4 font-medium">目标表</th>
                  <th className="px-6 py-4 font-medium">定时</th>
                  <th className="px-6 py-4 font-medium">状态</th>
                  <th className="px-6 py-4 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr
                    key={job.id}
                    className="border-b border-gray-100 last:border-0 dark:border-gray-800"
                  >
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{job.name}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{job.source_type}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{job.target_table}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                      {job.schedule_cron ?? "手动"}
                    </td>
                    <td className="px-6 py-4">
                      <Badge color={job.enabled ? "success" : "light"} variant="light">
                        {job.enabled ? "已启用" : "已停用"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <IconButton
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label="手动运行同步"
                          disabled={runningId === job.id}
                          loading={runningId === job.id}
                          onClick={() => setRunTarget(job)}
                        >
                          <Play className="size-4" />
                        </IconButton>
                        <IconButton asChild variant="ghost" size="sm" aria-label="查看运行历史">
                          <Link to={`/admin/ingestion/sync-jobs/${job.id}/history`}>
                            <History className="size-4" />
                          </Link>
                        </IconButton>
                        <IconButton asChild variant="ghost" size="sm" aria-label="配置清洗规则">
                          <Link to={`/admin/ingestion/sync-jobs/${job.id}/etl-rules`}>
                            <Settings2 className="size-4" />
                          </Link>
                        </IconButton>
                        <IconButton asChild variant="ghost" size="sm" aria-label="编辑任务">
                          <Link to={`/admin/ingestion/sync-jobs/${job.id}/edit`}>
                            <Pencil className="size-4" />
                          </Link>
                        </IconButton>
                        <IconButton
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label="删除任务"
                          onClick={() => setDeleteTarget(job)}
                        >
                          <Trash2 className="size-4" />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除任务？</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `确定删除任务「${deleteTarget.name}」？删除后无法恢复，运行历史将一并清除。`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-error-500 text-white shadow-theme-xs hover:bg-error-600 disabled:opacity-50"
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
            >
              {deleting ? "删除中…" : "删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={runTarget !== null}
        onOpenChange={(open) => {
          if (!open && runningId === null) setRunTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认手动运行同步？</AlertDialogTitle>
            <AlertDialogDescription>
              {runTarget
                ? `确定立即运行任务「${runTarget.name}」？将全量同步源表数据到托管分析库。`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={runningId !== null}>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={runningId !== null}
              onClick={(event) => {
                event.preventDefault();
                if (runTarget) void handleRun(runTarget.id);
              }}
            >
              {runningId === runTarget?.id ? "运行中…" : "运行"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
