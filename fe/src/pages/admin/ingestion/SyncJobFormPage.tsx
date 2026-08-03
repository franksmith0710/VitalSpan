import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeaderIcon, AdminPageShell } from "@/components/layout/admin-page-shell";
import { ADMIN_PAGE_SURFACE_CLASS } from "@/components/layout/list-page-kit";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { PageErrorBanner } from "@/components/ui/page-error-banner";
import { UnsavedLeaveDialog } from "@/components/ui/unsaved-leave-dialog";
import { useFormDirtyState } from "@/hooks/use-form-dirty-state";
import { useUnsavedLeaveGuard } from "@/hooks/use-unsaved-leave-guard";
import { SyncJobConsumeGuide } from "./components/SyncJobConsumeGuide";
import { CRON_PRESETS } from "./components/sync-job-types";

type SourceMode = "inline" | "datasource";
type SyncMode = "full" | "incremental";

type DatasourceItem = {
  id: string;
  name: string;
  type: string;
  host: string;
  port: number;
  database: string;
};

type JobFormState = {
  name: string;
  sourceMode: SourceMode;
  sourceDataSourceId: string;
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
  table: string;
  target_table: string;
  syncMode: SyncMode;
  primaryKey: string;
  incrementalColumn: string;
  schedule_cron: string;
  enabled: boolean;
};

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
  };

  const handleSubmit = async (event?: FormEvent): Promise<boolean> => {
    event?.preventDefault();
    if (submitting) return false;
    setSubmitting(true);
    setError(null);
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
      setError(mapApiError(err));
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
      actions={
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/ingestion/sync-jobs">返回列表</Link>
        </Button>
      }
    >
      <div
        className={cn(
          ADMIN_PAGE_SURFACE_CLASS,
          "flex min-h-0 flex-1 flex-col overflow-hidden",
        )}
      >
        <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar px-6 py-6 lg:px-8 lg:py-8">
          {error ? (
            <div className="mb-4 shrink-0">
              <PageErrorBanner message={error} onRetry={() => setError(null)} />
            </div>
          ) : null}

          <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">任务名称</Label>
              <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label>源连接方式</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={form.sourceMode === "datasource" ? "primary" : "outline"}
                  size="sm"
                  onClick={() => update("sourceMode", "datasource")}
                >
                  使用已有数据源
                </Button>
                <Button
                  type="button"
                  variant={form.sourceMode === "inline" ? "primary" : "outline"}
                  size="sm"
                  onClick={() => update("sourceMode", "inline")}
                >
                  手动填写连接
                </Button>
              </div>
              {form.sourceMode === "datasource" ? (
                <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                  引用数据源时会快照连接信息；数据源改密后请重新保存任务。
                </p>
              ) : null}
            </div>

            {form.sourceMode === "datasource" ? (
              <div className="space-y-4 rounded-lg border border-gray-100 p-4 dark:border-gray-800">
                <div className="space-y-2">
                  <Label htmlFor="datasource">MySQL 数据源</Label>
                  <Select
                    value={form.sourceDataSourceId || undefined}
                    onValueChange={(value) => update("sourceDataSourceId", value)}
                  >
                    <SelectTrigger id="datasource">
                      <SelectValue placeholder="选择已登记的 MySQL 数据源" />
                    </SelectTrigger>
                    <SelectContent>
                      {datasources.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedDatasource ? (
                  <p className="font-mono text-theme-xs text-gray-500 dark:text-gray-400">
                    {selectedDatasource.host}:{selectedDatasource.port}/{selectedDatasource.database}
                  </p>
                ) : null}
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="host">主机</Label>
                    <Input id="host" value={form.host} onChange={(e) => update("host", e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="port">端口</Label>
                    <Input id="port" value={form.port} onChange={(e) => update("port", e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="database">数据库</Label>
                  <Input
                    id="database"
                    value={form.database}
                    onChange={(e) => update("database", e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="username">用户名</Label>
                    <Input
                      id="username"
                      value={form.username}
                      onChange={(e) => update("username", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">密码{isEdit ? "（留空保持不变）" : ""}</Label>
                    <Input
                      id="password"
                      type="password"
                      value={form.password}
                      onChange={(e) => update("password", e.target.value)}
                      required={!isEdit}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="table">源表</Label>
              <Input id="table" value={form.table} onChange={(e) => update("table", e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="target_table">目标表</Label>
              <Input
                id="target_table"
                value={form.target_table}
                onChange={(e) => update("target_table", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>同步方式</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={form.syncMode === "full" ? "primary" : "outline"}
                  size="sm"
                  onClick={() => update("syncMode", "full")}
                >
                  全量
                </Button>
                <Button
                  type="button"
                  variant={form.syncMode === "incremental" ? "primary" : "outline"}
                  size="sm"
                  onClick={() => update("syncMode", "incremental")}
                >
                  增量
                </Button>
              </div>
              <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                {form.syncMode === "full"
                  ? "每次运行清空目标表后重新写入。"
                  : "按主键 upsert，不 truncate；首次运行等同 bootstrap 全量拉取。"}
              </p>
            </div>

            {form.syncMode === "incremental" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="primary_key">主键字段</Label>
                  <Input
                    id="primary_key"
                    value={form.primaryKey}
                    onChange={(e) => update("primaryKey", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="incremental_column">增量字段</Label>
                  <Input
                    id="incremental_column"
                    value={form.incrementalColumn}
                    onChange={(e) => update("incrementalColumn", e.target.value)}
                    required
                  />
                  <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                    整型或时间戳列；用于水位比较。
                  </p>
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="schedule_cron">定时 Cron（可选）</Label>
              <Input
                id="schedule_cron"
                placeholder="例：0 2 * * *（分 时 日 月 周）"
                value={form.schedule_cron}
                onChange={(e) => update("schedule_cron", e.target.value)}
              />
              <div className="flex flex-wrap gap-2 pt-1">
                {CRON_PRESETS.map((preset) => (
                  <Button
                    key={preset.value}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => update("schedule_cron", preset.value)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 dark:border-gray-800">
              <div>
                <Label htmlFor="enabled">启用任务</Label>
                <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                  停用后不会参与 Cron 调度，仍可手动运行。
                </p>
              </div>
              <Switch
                id="enabled"
                checked={form.enabled}
                onCheckedChange={(checked) => update("enabled", checked)}
              />
            </div>

            {isEdit && form.target_table ? (
              <SyncJobConsumeGuide targetTable={form.target_table} />
            ) : null}

            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                variant="primary"
                loading={submitting}
                disabled={isEdit && !isDirty}
              >
                {isEdit ? "保存" : "创建"}
              </Button>
              <Button asChild type="button" variant="outline">
                <Link to="/admin/ingestion/sync-jobs">取消</Link>
              </Button>
            </div>
          </form>
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
