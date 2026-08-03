import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeaderIcon, AdminPageShell } from "@/components/layout/admin-page-shell";
import { ADMIN_PAGE_SURFACE_CLASS } from "@/components/layout/list-page-kit";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { getApiValidationFieldErrors, mapApiError } from "@/lib/apiError";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageErrorBanner } from "@/components/ui/page-error-banner";
import { UnsavedLeaveDialog } from "@/components/ui/unsaved-leave-dialog";
import { useFormDirtyState } from "@/hooks/use-form-dirty-state";
import { useUnsavedLeaveGuard } from "@/hooks/use-unsaved-leave-guard";
import {
  SyncJobForm,
  SYNC_JOB_FORM_ID,
  type DatasourceItem,
  type JobFormState,
  type SyncMode,
} from "./components/SyncJobForm";

const emptyForm: JobFormState = {
  name: "",
  sourceMode: "inline",
  sourceDataSourceId: "",
  host: "127.0.0.1",
  port: "3307",
  database: "sample_db",
  username: "sample",
  password: "sample",
  table: "dirty_orders",
  target_table: "orders_clean",
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
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState<JobFormState>(emptyForm);
  const [datasources, setDatasources] = useState<DatasourceItem[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

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
        const data = await apiFetch<{ items: DatasourceItem[] }>("/api/v1/datasources");
        setDatasources(data.items.filter((item) => item.type === "mysql"));
      } catch {
        setDatasources([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!id) {
      resetBaseline(emptyForm);
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

  const update = <K extends keyof JobFormState>(key: K, value: JobFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key as string]) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  };

  const handleSubmit = async (event?: FormEvent): Promise<boolean> => {
    event?.preventDefault();
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
        toast.success("同步任务已创建");
        markSaved(form);
        navigate(`/admin/ingestion/sync-jobs/${created.id}/edit`, { replace: true });
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

  const handleSaveAndLeave = async () => {
    const ok = await handleSubmit();
    if (ok) confirmLeave();
  };

  const pageDescription = useMemo(() => {
    if (!isBaselineReady) {
      return "配置 MySQL 源、目标表与同步方式；支持引用已登记数据源与增量 upsert。";
    }
    if (isDirty) return "有未保存的更改 · 保存后生效";
    return "已保存 · 支持全量覆盖或增量 upsert 到托管分析库";
  }, [isBaselineReady, isDirty]);

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
          {error ? (
            <div className="mx-auto mb-6 w-full max-w-3xl shrink-0">
              <PageErrorBanner
                message={error}
                autoHideMs={0}
                onRetry={() => {
                  setError(null);
                  setFieldErrors({});
                }}
              />
            </div>
          ) : null}

          <SyncJobForm
            form={form}
            isEdit={isEdit}
            datasources={datasources}
            selectedDatasource={selectedDatasource}
            fieldErrors={fieldErrors}
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
    </AdminPageShell>
  );
}
