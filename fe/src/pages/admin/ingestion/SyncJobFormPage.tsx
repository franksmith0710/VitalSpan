import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { RefreshCw } from "lucide-react";
import { AdminPageHeaderIcon, AdminPageShell } from "@/components/layout/admin-page-shell";
import { ADMIN_PAGE_SURFACE_CLASS } from "@/components/layout/list-page-kit";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { PageErrorBanner } from "@/components/ui/page-error-banner";

type JobFormState = {
  name: string;
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
  table: string;
  target_table: string;
  schedule_cron: string;
  enabled: boolean;
};

const emptyForm: JobFormState = {
  name: "",
  host: "127.0.0.1",
  port: "3307",
  database: "sample_db",
  username: "sample",
  password: "sample",
  table: "dirty_orders",
  target_table: "orders_clean",
  schedule_cron: "",
  enabled: true,
};

const syncJobPageIcon = (
  <AdminPageHeaderIcon>
    <RefreshCw className="size-6" aria-hidden />
  </AdminPageHeaderIcon>
);

export function SyncJobFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState<JobFormState>(emptyForm);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      setLoading(true);
      try {
        const job = await apiFetch<{
          name: string;
          enabled: boolean;
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
        setForm({
          name: job.name,
          host: job.source.host,
          port: String(job.source.port),
          database: job.source.database,
          username: job.source.username,
          password: "",
          table: job.source.table,
          target_table: job.target_table,
          schedule_cron: job.schedule_cron ?? "",
          enabled: job.enabled,
        });
      } catch (err) {
        setError(mapApiError(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const update = (key: keyof JobFormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    const payload = {
      name: form.name,
      source: {
        type: "mysql" as const,
        host: form.host,
        port: Number(form.port),
        database: form.database,
        username: form.username,
        password: form.password || "",
        table: form.table,
      },
      target_table: form.target_table,
      schedule_cron: form.schedule_cron || null,
      enabled: form.enabled,
    };
    try {
      if (isEdit && id) {
        await apiFetch(`/api/v1/ingestion/sync-jobs/${id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/api/v1/ingestion/sync-jobs", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      navigate("/admin/ingestion/sync-jobs");
    } catch (err) {
      setError(mapApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

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
      description="配置 MySQL 源库连接、目标表与可选 Cron 调度；M1B 执行器仅支持 MySQL 全量同步。"
      actions={
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/ingestion/sync-jobs">返回列表</Link>
        </Button>
      }
    >
      {error ? (
        <div className="mb-4 shrink-0">
          <PageErrorBanner message={error} onRetry={() => setError(null)} />
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className={`${ADMIN_PAGE_SURFACE_CLASS} space-y-4 p-6 lg:p-8`}
      >
        <div className="space-y-2">
          <Label htmlFor="name">任务名称</Label>
          <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} required />
        </div>

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
          <Label htmlFor="schedule_cron">定时 Cron（可选）</Label>
          <Input
            id="schedule_cron"
            placeholder="例：0 2 * * *"
            value={form.schedule_cron}
            onChange={(e) => update("schedule_cron", e.target.value)}
          />
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

        <div className="flex gap-3 pt-2">
          <Button type="submit" variant="primary" loading={submitting}>
            {isEdit ? "保存" : "创建"}
          </Button>
          <Button asChild type="button" variant="outline">
            <Link to="/admin/ingestion/sync-jobs">取消</Link>
          </Button>
        </div>
      </form>
    </AdminPageShell>
  );
}
