import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Plus } from "lucide-react";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { SyncJobsEmptyState } from "./components/SyncJobsEmptyState";
import { SyncJobsMetrics } from "./components/SyncJobsMetrics";
import { SyncJobsTable } from "./components/SyncJobsTable";
import {
  SyncJobsToolbar,
  type SyncJobStatusFilter,
} from "./components/SyncJobsToolbar";
import { type SyncJobListResponse, type SyncJobSummary } from "./components/sync-job-types";

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-xl border border-error-500 bg-error-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-error-500/30 dark:bg-error-500/15"
    >
      <p className="text-theme-sm text-error-700 dark:text-error-400">{message}</p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        重试
      </Button>
    </div>
  );
}

function filterByStatus(jobs: SyncJobSummary[], statusFilter: SyncJobStatusFilter) {
  switch (statusFilter) {
    case "enabled":
      return jobs.filter((job) => job.enabled);
    case "disabled":
      return jobs.filter((job) => !job.enabled);
    case "scheduled":
      return jobs.filter((job) => Boolean(job.schedule_cron));
    default:
      return jobs;
  }
}

export function SyncJobsPage() {
  const [jobs, setJobs] = useState<SyncJobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<SyncJobStatusFilter>("all");
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

  const stats = useMemo(
    () => ({
      total: jobs.length,
      enabled: jobs.filter((j) => j.enabled).length,
      disabled: jobs.filter((j) => !j.enabled).length,
      scheduled: jobs.filter((j) => j.schedule_cron).length,
    }),
    [jobs],
  );

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    const byStatus = filterByStatus(jobs, statusFilter);
    if (!q) return byStatus;
    return byStatus.filter(
      (job) =>
        job.name.toLowerCase().includes(q) ||
        job.target_table.toLowerCase().includes(q) ||
        job.source_type.toLowerCase().includes(q),
    );
  }, [jobs, search, statusFilter]);

  const resultLabel = useMemo(() => {
    const hasFilter = Boolean(search.trim()) || statusFilter !== "all";
    return hasFilter ? `显示 ${filteredJobs.length} 个` : `共 ${jobs.length} 个任务`;
  }, [filteredJobs.length, jobs.length, search, statusFilter]);

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
    <AdminPageShell
      title="同步任务"
      description="管理源库到托管分析库的全量同步任务，配置定时计划与清洗规则。"
      actions={
        <Button asChild variant="primary">
          <Link to="/admin/ingestion/sync-jobs/new">
            <Plus className="size-4" aria-hidden />
            新建任务
          </Link>
        </Button>
      }
    >
      {error ? <ErrorBanner message={error} onRetry={() => void loadJobs()} /> : null}

      {loading ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[88px] rounded-xl" />
            ))}
          </div>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="mb-3 h-10 w-full rounded-lg last:mb-0" />
            ))}
          </div>
        </div>
      ) : jobs.length === 0 ? (
        <SyncJobsEmptyState />
      ) : (
        <>
          <SyncJobsMetrics stats={stats} />
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
            <SyncJobsToolbar
              search={search}
              onSearchChange={setSearch}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              resultLabel={resultLabel}
            />
            {filteredJobs.length === 0 ? (
              <div className="px-6 py-12 text-center text-theme-sm text-gray-500 dark:text-gray-400">
                {search.trim()
                  ? `未找到匹配「${search.trim()}」的任务`
                  : "当前筛选条件下暂无任务"}
              </div>
            ) : (
              <SyncJobsTable
                jobs={filteredJobs}
                runningId={runningId}
                onRun={setRunTarget}
                onDelete={setDeleteTarget}
              />
            )}
          </div>
        </>
      )}

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
    </AdminPageShell>
  );
}
