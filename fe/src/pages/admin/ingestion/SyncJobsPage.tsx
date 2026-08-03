import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { hasCapability } from "@/lib/capabilities";
import { sessionUserFromMe } from "@/lib/session";
import {
  BatchDeleteDialog,
  ListPageBatchActions,
  useListBatchMode,
} from "@/components/layout/list-batch-delete";
import { useListRowSelection } from "@/hooks/useListRowSelection";
import { runBatchDelete } from "@/lib/runBatchDelete";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { ListPagePagination, ListPageSection } from "@/components/layout/list-page-kit";
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
import { mapApiError } from "@/lib/apiError";
import { SyncJobsEmptyState } from "./components/SyncJobsEmptyState";
import { SyncJobsMetrics } from "./components/SyncJobsMetrics";
import { SyncJobsTable } from "./components/SyncJobsTable";
import {
  SyncJobsToolbar,
  type SyncJobStatusFilter,
} from "./components/SyncJobsToolbar";
import { type SyncJobListResponse, type SyncJobSummary } from "./components/sync-job-types";
import { PageErrorBanner } from "@/components/ui/page-error-banner";
import { sliceListPage, useListPagination } from "@/lib/list-pagination";

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
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = useMemo(
    () => (user ? hasCapability(sessionUserFromMe(user), "ingestion:manage") : false),
    [user],
  );
  const pollTimerRef = useRef<number | null>(null);
  const [jobs, setJobs] = useState<SyncJobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<SyncJobStatusFilter>("all");
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runTarget, setRunTarget] = useState<SyncJobSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SyncJobSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);
  const pagination = useListPagination(undefined, [search, statusFilter]);

  const loadJobs = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await apiFetch<SyncJobListResponse>("/api/v1/ingestion/sync-jobs");
      setJobs(data.items);
    } catch (err) {
      setError(mapApiError(err));
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, []);

  const startRunPolling = useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearInterval(pollTimerRef.current);
    }
    let ticks = 0;
    pollTimerRef.current = window.setInterval(() => {
      ticks += 1;
      void loadJobs({ silent: true });
      if (ticks >= 5) {
        if (pollTimerRef.current !== null) {
          window.clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
      }
    }, 2000);
  }, [loadJobs]);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current !== null) {
        window.clearInterval(pollTimerRef.current);
      }
    };
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

  const pagedJobs = useMemo(
    () => sliceListPage(filteredJobs, pagination.offset, pagination.pageSize),
    [filteredJobs, pagination.offset, pagination.pageSize],
  );

  const rowIds = useMemo(() => pagedJobs.map((job) => job.id), [pagedJobs]);
  const selection = useListRowSelection(rowIds);
  const batch = useListBatchMode(selection.clear);

  const resultLabel = useMemo(() => {
    const hasFilter = Boolean(search.trim()) || statusFilter !== "all";
    return hasFilter ? `显示 ${filteredJobs.length} 个` : `共 ${jobs.length} 个任务`;
  }, [filteredJobs.length, jobs.length, search, statusFilter]);

  const handleRun = async (job: SyncJobSummary) => {
    setRunningId(job.id);
    try {
      await apiFetch(`/api/v1/ingestion/sync-jobs/${job.id}/run`, { method: "POST" });
      setRunTarget(null);
      toast.success(`任务「${job.name}」已开始同步`, {
        action: {
          label: "查看历史",
          onClick: () => navigate(`/admin/ingestion/sync-jobs/${job.id}/history`),
        },
      });
      void loadJobs({ silent: true });
      startRunPolling();
    } catch (err) {
      setError(mapApiError(err));
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
      setError(mapApiError(err));
    } finally {
      setDeleting(false);
    }
  };

  const handleBatchDelete = async () => {
    const ids = [...selection.selectedIds];
    if (ids.length === 0) return;
    setBatchDeleting(true);
    const { ok, failed } = await runBatchDelete(ids, (id) =>
      apiFetch(`/api/v1/ingestion/sync-jobs/${id}`, { method: "DELETE" }),
    );
    setBatchDeleting(false);
    setBatchDeleteOpen(false);
    selection.clear();
    await loadJobs();
    if (failed === 0) toast.success(`已删除 ${ok} 个同步任务`);
    else toast.warning(`已删除 ${ok} 个，${failed} 个删除失败`);
  };

  return (
    <AdminPageShell
      layout="list"
      title="同步任务"
      description="管理源库到托管分析库的全量同步任务，配置定时计划与清洗规则。"
      actions={
        canManage ? (
          <Button asChild variant="primary">
            <Link to="/admin/ingestion/sync-jobs/new">
              <Plus className="size-4" aria-hidden />
              新建任务
            </Link>
          </Button>
        ) : null
      }
    >
      {error ? (
        <div className="shrink-0">
          <PageErrorBanner message={error} onRetry={() => void loadJobs()} />
        </div>
      ) : null}

      {loading ? (
        <div className="shrink-0 space-y-4">
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
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
          <div className="shrink-0">
            <SyncJobsMetrics stats={stats} />
          </div>
          <ListPageSection>
            <SyncJobsToolbar
              search={search}
              onSearchChange={setSearch}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              resultLabel={resultLabel}
              trailing={
                canManage ? (
                  <ListPageBatchActions
                    batchMode={batch.batchMode}
                    onToggleBatchMode={batch.toggleBatchMode}
                    selectedCount={selection.selectedCount}
                    entityLabel="个任务"
                    onClear={selection.clear}
                    onDelete={() => setBatchDeleteOpen(true)}
                  />
                ) : null
              }
            />
            {filteredJobs.length === 0 ? (
              <div className="px-6 py-12 text-center text-theme-sm text-gray-500 dark:text-gray-400">
                {search.trim()
                  ? `未找到匹配「${search.trim()}」的任务`
                  : "当前筛选条件下暂无任务"}
              </div>
            ) : (
              <>
                <div className="min-h-0 flex-1 overflow-hidden">
                  <SyncJobsTable
                    jobs={pagedJobs}
                    canManage={canManage}
                    runningId={runningId}
                    onRun={setRunTarget}
                    onDelete={setDeleteTarget}
                    selectedIds={selection.selectedIds}
                    onToggleSelect={batch.batchMode ? selection.toggle : undefined}
                    onToggleSelectAll={batch.batchMode ? selection.toggleAll : undefined}
                    allSelected={selection.allSelected}
                    someSelected={selection.someSelected}
                  />
                </div>
                <ListPagePagination
                  current={pagination.page}
                  pageSize={pagination.pageSize}
                  total={filteredJobs.length}
                  showSizeChanger
                  onChange={pagination.onPageChange}
                />
              </>
            )}
          </ListPageSection>
        </div>
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
              {runTarget ? (
                runTarget.sync_mode === "incremental" ? (
                  <>
                    确定立即运行增量任务「{runTarget.name}」？将拉取水位之后的新数据，并按主键
                    <strong className="font-semibold text-warning-600 dark:text-warning-400">
                      upsert
                    </strong>
                    到托管分析库目标表
                    <span className="font-mono"> {runTarget.target_table}</span>，不会清空现有数据。
                  </>
                ) : (
                  <>
                    确定立即运行任务「{runTarget.name}」？将从源表全量读取数据，并
                    <strong className="font-semibold text-error-600 dark:text-error-400">
                      清空并覆盖
                    </strong>
                    托管分析库目标表
                    <span className="font-mono"> {runTarget.target_table}</span> 中的全部现有数据。
                  </>
                )
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={runningId !== null}>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={runningId !== null}
              onClick={(event) => {
                event.preventDefault();
                if (runTarget) void handleRun(runTarget);
              }}
            >
              {runningId === runTarget?.id ? "运行中…" : "运行"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BatchDeleteDialog
        open={batchDeleteOpen}
        onOpenChange={setBatchDeleteOpen}
        count={selection.selectedCount}
        title="批量删除同步任务"
        pending={batchDeleting}
        onConfirm={() => void handleBatchDelete()}
      />
    </AdminPageShell>
  );
}
