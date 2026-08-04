import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { ArrowLeft, Play, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { AdminPageHeaderIcon, AdminPageShell } from "@/components/layout/admin-page-shell";
import { ADMIN_PAGE_SURFACE_CLASS } from "@/components/layout/list-page-kit";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { getApiValidationFieldErrors, mapApiError } from "@/lib/apiError";
import { hasCapability } from "@/lib/capabilities";
import { sessionUserFromMe } from "@/lib/session";
import { useSyncJobRun, type SyncRunSuccess } from "@/hooks/useSyncJobRun";
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
import { PageErrorBanner } from "@/components/ui/page-error-banner";
import { UnsavedLeaveDialog } from "@/components/ui/unsaved-leave-dialog";
import { useFormDirtyState } from "@/hooks/use-form-dirty-state";
import { useUnsavedLeaveGuard } from "@/hooks/use-unsaved-leave-guard";
import {
  findJobsSharingTargetTable,
  suggestSyncTargetTable,
} from "@/lib/suggestSyncTargetTable";
import {
  SyncJobForm,
  SYNC_JOB_FORM_ID,
  type DatasourceItem,
  type JobFormState,
  type SyncMode,
} from "./components/SyncJobForm";
import { SyncConsumeActionCard } from "./components/SyncConsumeActionCard";
import type { SyncJobLastRun, SyncJobSummary } from "./components/sync-job-types";

const newJobFormDefaults: JobFormState = {
  name: "",
  sourceMode: "datasource",
  sourceDataSourceId: "",
  host: "127.0.0.1",
  port: "3307",
  database: "sample_db",
  username: "sample",
  password: "sample",
  table: "dirty_orders",
  target_table: "",
  syncMode: "full",
  primaryKey: "id",
  incrementalColumn: "updated_at",
  schedule_cron: "",
  enabled: true,
};

function serializeJobForm(form: JobFormState): string {
  return JSON.stringify({ ...form, password: form.password || "" });
}

const syncJobPageIcon = (
  <AdminPageHeaderIcon>
    <RefreshCw className="size-6" aria-hidden />
  </AdminPageHeaderIcon>
);

function buildPayload(form: JobFormState) {
  const base = {
    name: form.name,
    target_table: form.target_table,
    schedule_cron: form.schedule_cron || null,
    enabled: form.enabled,
    sync_mode: form.syncMode,
    primary_key: form.syncMode === "incremental" ? form.primaryKey : null,
    incremental_column: form.syncMode === "incremental" ? form.incrementalColumn : null,
  };
  if (form.sourceMode === "datasource") {
    return {
      ...base,
      source_mode: "datasource" as const,
      source_data_source_id: form.sourceDataSourceId,
      source_table: form.table,
    };
  }
  return {
    ...base,
    source_mode: "inline" as const,
    source: {
      type: "mysql" as const,
      host: form.host,
      port: Number(form.port),
      database: form.database,
      username: form.username,
      password: form.password || "",
      table: form.table,
    },
  };
}

export function SyncJobFormPage() {
  const { id } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const canManage = useMemo(
    () => (user ? hasCapability(sessionUserFromMe(user), "ingestion:manage") : false),
    [user],
  );
  const isEdit = Boolean(id);
  const justCreated = Boolean(
    (location.state as { justCreated?: boolean } | null)?.justCreated,
  );
  const navigate = useNavigate();
  const [form, setForm] = useState<JobFormState>(newJobFormDefaults);
  const [existingJobs, setExistingJobs] = useState<SyncJobSummary[]>([]);
  const [datasources, setDatasources] = useState<DatasourceItem[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [sharedTargetConfirmOpen, setSharedTargetConfirmOpen] = useState(false);
  const [runConfirmOpen, setRunConfirmOpen] = useState(false);
  const [recentRunSuccess, setRecentRunSuccess] = useState<SyncRunSuccess | null>(null);
  const [consumeCardDismissed, setConsumeCardDismissed] = useState(false);
  const [bootstrapReady, setBootstrapReady] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const targetTableManualRef = useRef(false);
  const newJobInitializedRef = useRef(false);

  const { runJob, runningId, pollingJobId, runError, clearRunError } = useSyncJobRun({
    onSuccess: (payload) => {
      setConsumeCardDismissed(false);
      setRecentRunSuccess(payload);
    },
  });

  const { isDirty, isBaselineReady, resetBaseline, markSaved } = useFormDirtyState(
    form,
    serializeJobForm,
  );

  const leaveGuardEnabled = isBaselineReady && isDirty;
  const { leaveDialogOpen, confirmLeave, cancelLeave } = useUnsavedLeaveGuard({
    enabled: leaveGuardEnabled,
  });

  useEffect(() => {
    void (async () => {
      try {
        const [dsData, jobsData] = await Promise.all([
          apiFetch<{ items: DatasourceItem[] }>("/api/v1/datasources"),
          apiFetch<{ items: SyncJobSummary[] }>("/api/v1/ingestion/sync-jobs"),
        ]);
        setDatasources(dsData.items.filter((item) => item.type === "mysql"));
        setExistingJobs(jobsData.items);
      } catch {
        setDatasources([]);
        setExistingJobs([]);
      } finally {
        setBootstrapReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (isEdit || !bootstrapReady || newJobInitializedRef.current) return;
    const suggested = suggestSyncTargetTable(
      newJobFormDefaults.table,
      existingJobs.map((job) => job.target_table),
    );
    const nextForm: JobFormState = {
      ...newJobFormDefaults,
      target_table: suggested,
      sourceDataSourceId: datasources[0]?.id ?? "",
    };
    setForm(nextForm);
    resetBaseline(nextForm);
    newJobInitializedRef.current = true;
  }, [datasources, existingJobs, isEdit, bootstrapReady, resetBaseline]);

  useEffect(() => {
    if (!id) {
      if (!newJobInitializedRef.current) return;
      resetBaseline(form);
      return;
    }
    void (async () => {
      setLoading(true);
      try {
        const job = await apiFetch<{
          name: string;
          enabled: boolean;
          sync_mode: SyncMode;
          primary_key: string | null;
          incremental_column: string | null;
          source_data_source_id: string | null;
          source: {
            type: string;
            host: string;
            port: number;
            database: string;
            username: string;
            password: string;
            table: string;
          };
          target_table: string;
          schedule_cron: string | null;
          last_run?: SyncJobLastRun | null;
        }>(`/api/v1/ingestion/sync-jobs/${id}`);
        const nextForm: JobFormState = {
          name: job.name,
          sourceMode: job.source_data_source_id ? "datasource" : "inline",
          sourceDataSourceId: job.source_data_source_id ?? "",
          host: job.source.host,
          port: String(job.source.port),
          database: job.source.database,
          username: job.source.username,
          password: "",
          table: job.source.table,
          target_table: job.target_table,
          syncMode: job.sync_mode ?? "full",
          primaryKey: job.primary_key ?? "id",
          incrementalColumn: job.incremental_column ?? "updated_at",
          schedule_cron: job.schedule_cron ?? "",
          enabled: job.enabled,
        };
        setForm(nextForm);
        resetBaseline(nextForm);
        targetTableManualRef.current = true;
        if (job.last_run?.status === "succeeded") {
          setRecentRunSuccess({
            jobId: id,
            jobName: job.name,
            targetTable: job.target_table,
            rowsSynced: job.last_run.rows_synced,
          });
        } else {
          setRecentRunSuccess(null);
        }
      } catch (err) {
        setError(mapApiError(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [id, resetBaseline]);

  const selectedDatasource = useMemo(
    () => datasources.find((item) => item.id === form.sourceDataSourceId),
    [datasources, form.sourceDataSourceId],
  );

  const conflictingJobs = useMemo(
    () => findJobsSharingTargetTable(existingJobs, form.target_table, isEdit ? id : undefined),
    [existingJobs, form.target_table, id, isEdit],
  );

  const applySuggestedTarget = (sourceTable: string) => {
    const suggested = suggestSyncTargetTable(
      sourceTable,
      existingJobs.map((job) => job.target_table),
    );
    setForm((prev) => ({ ...prev, target_table: suggested }));
    targetTableManualRef.current = false;
  };

  const update = <K extends keyof JobFormState>(key: K, value: JobFormState[K]) => {
    if (key === "target_table") {
      targetTableManualRef.current = true;
    }
    if (key === "table" && !targetTableManualRef.current && typeof value === "string") {
      setForm((prev) => {
        const suggested = suggestSyncTargetTable(
          value,
          existingJobs.map((job) => job.target_table),
        );
        return { ...prev, table: value, target_table: suggested };
      });
      setFieldErrors((prev) => {
        if (!prev.table && !prev.target_table) return prev;
        const next = { ...prev };
        delete next.table;
        delete next.target_table;
        return next;
      });
      return;
    }
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key as string]) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  };

  const submitPayload = async (): Promise<boolean> => {
    if (submitting) return false;
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    const payload = buildPayload(form);
    try {
      if (isEdit && id) {
        await apiFetch(`/api/v1/ingestion/sync-jobs/${id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast.success("同步任务已更新");
        markSaved(form);
      } else {
        const created = await apiFetch<{ id: string }>("/api/v1/ingestion/sync-jobs", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("同步任务已创建", {
          description: "可在此页立即运行同步，成功后一键创建 Dataset 出图。",
        });
        markSaved(form);
        navigate(`/admin/ingestion/sync-jobs/${created.id}/edit`, {
          replace: true,
          state: { justCreated: true },
        });
      }
      return true;
    } catch (err) {
      const message = mapApiError(err);
      setError(message);
      setFieldErrors(getApiValidationFieldErrors(err));
      toast.error(message);
      if (scrollRef.current) {
        scrollRef.current.scrollTop = 0;
      }
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (event?: FormEvent): Promise<boolean> => {
    event?.preventDefault();
    if (form.sourceMode === "datasource" && !form.sourceDataSourceId.trim()) {
      const message = "请选择业务源连接，或切换为「手动填写（排障）」";
      setError(message);
      toast.error(message);
      return false;
    }
    if (conflictingJobs.length > 0) {
      setSharedTargetConfirmOpen(true);
      return false;
    }
    return submitPayload();
  };

  const handleConfirmSharedTarget = async () => {
    setSharedTargetConfirmOpen(false);
    await submitPayload();
  };

  const handleSaveAndLeave = async () => {
    const ok = await handleSubmit();
    if (ok) confirmLeave();
  };

  const pageDescription = useMemo(() => {
    if (!isBaselineReady) {
      return "先在连接管理登记 MySQL 业务源，再配置同步与目标表；当前仅支持 MySQL 源。";
    }
    if (isDirty) return "有未保存的更改 · 保存后生效";
    return "已保存 · 支持全量覆盖或增量 upsert 到托管分析库";
  }, [isBaselineReady, isDirty]);

  const sharedTargetJobNames = useMemo(() => {
    if (!recentRunSuccess || !id || recentRunSuccess.jobId !== id) return [];
    return existingJobs
      .filter(
        (job) => job.id !== id && job.target_table === recentRunSuccess.targetTable,
      )
      .map((job) => job.name);
  }, [existingJobs, id, recentRunSuccess]);

  const handleConfirmRun = useCallback(async () => {
    if (!id || !form.name.trim()) return;
    setRunConfirmOpen(false);
    clearRunError();
    await runJob({ id, name: form.name.trim() });
  }, [clearRunError, form.name, id, runJob]);

  const showConsumeCard =
    isEdit &&
    id &&
    !consumeCardDismissed &&
    recentRunSuccess?.jobId === id &&
    recentRunSuccess.targetTable === form.target_table;

  if (loading) {
    return (
      <AdminPageShell
        layout="fill"
        title={isEdit ? "编辑同步任务" : "新建同步任务"}
        icon={syncJobPageIcon}
      >
        <Skeleton className="h-full min-h-[480px] w-full rounded-2xl" />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      layout="fill"
      title={isEdit ? "编辑同步任务" : "新建同步任务"}
      icon={syncJobPageIcon}
      description={pageDescription}
      leadingActions={
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/ingestion/sync-jobs">
            <ArrowLeft className="size-4" aria-hidden />
            返回列表
          </Link>
        </Button>
      }
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {isEdit && canManage && id ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={submitting || runningId === id || pollingJobId === id || isDirty}
              loading={runningId === id || pollingJobId === id}
              loadingText="运行中…"
              title={isDirty ? "请先保存更改后再运行" : undefined}
              onClick={() => setRunConfirmOpen(true)}
            >
              <Play className="size-4" aria-hidden />
              立即运行
            </Button>
          ) : null}
          <Button
            type="submit"
            form={SYNC_JOB_FORM_ID}
            variant="primary"
            size="sm"
            loading={submitting}
            loadingText={isEdit ? "保存中…" : "创建中…"}
            disabled={submitting || (isEdit && !isDirty)}
          >
            {isEdit ? "保存" : "创建"}
          </Button>
        </div>
      }
    >
      <div
        className={cn(
          ADMIN_PAGE_SURFACE_CLASS,
          "flex min-h-0 flex-1 flex-col overflow-hidden",
        )}
      >
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto custom-scrollbar px-6 py-6 lg:px-8 lg:py-8"
        >
          {error || runError ? (
            <div className="mx-auto mb-6 w-full max-w-3xl shrink-0">
              <PageErrorBanner
                message={error ?? runError ?? ""}
                autoHideMs={0}
                onRetry={() => {
                  setError(null);
                  setFieldErrors({});
                  clearRunError();
                }}
              />
            </div>
          ) : null}

          {showConsumeCard ? (
            <div className="mx-auto mb-6 w-full max-w-3xl shrink-0">
              <SyncConsumeActionCard
                jobId={id!}
                jobName={form.name.trim() || undefined}
                targetTable={recentRunSuccess!.targetTable}
                rowsSynced={recentRunSuccess!.rowsSynced}
                sharedTargetJobNames={sharedTargetJobNames}
                canManage={canManage}
                onDismiss={() => setConsumeCardDismissed(true)}
              />
            </div>
          ) : null}

          <SyncJobForm
            form={form}
            isEdit={isEdit}
            jobId={id}
            justCreated={justCreated}
            etlRulesHref={isEdit && id ? `/admin/ingestion/sync-jobs/${id}/etl-rules` : undefined}
            datasources={datasources}
            selectedDatasource={selectedDatasource}
            fieldErrors={fieldErrors}
            conflictingJobNames={conflictingJobs.map((job) => job.name)}
            onSuggestTargetTable={() => applySuggestedTarget(form.table)}
            onChange={update}
            onSubmit={(event) => void handleSubmit(event)}
          />
        </div>
      </div>
      <UnsavedLeaveDialog
        open={leaveDialogOpen}
        saving={submitting}
        entityLabel="同步任务"
        onStay={cancelLeave}
        onDiscardLeave={confirmLeave}
        onSaveAndLeave={handleSaveAndLeave}
      />

      <AlertDialog open={runConfirmOpen} onOpenChange={setRunConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认手动运行同步？</AlertDialogTitle>
            <AlertDialogDescription>
              {form.syncMode === "full"
                ? "全量同步将清空并覆盖托管分析库中的目标表数据。"
                : "将按增量策略拉取并 upsert 到托管分析库目标表。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={runningId === id}>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={runningId === id}
              onClick={() => void handleConfirmRun()}
            >
              确认运行
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={sharedTargetConfirmOpen} onOpenChange={setSharedTargetConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>目标表已被其他任务使用</AlertDialogTitle>
            <AlertDialogDescription>
              已有 {conflictingJobs.length} 个任务写入目标表
              <span className="font-mono"> {form.target_table}</span>
              （{conflictingJobs.map((job) => job.name).join("、")}），将共用 Dataset
              <span className="font-mono"> {form.target_table}</span>；后跑的全量同步会覆盖分析库中的同表数据。确定继续保存？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>取消</AlertDialogCancel>
            <AlertDialogAction disabled={submitting} onClick={() => void handleConfirmSharedTarget()}>
              仍要保存
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminPageShell>
  );
}
