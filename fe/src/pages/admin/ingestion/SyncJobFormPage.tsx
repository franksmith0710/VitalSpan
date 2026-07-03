import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type JobFormState = {
  name: string;
  source_type: "mysql" | "postgres";
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
  table: string;
  target_table: string;
  schedule_cron: string;
};

const emptyForm: JobFormState = {
  name: "",
  source_type: "mysql",
  host: "127.0.0.1",
  port: "3307",
  database: "sample_db",
  username: "sample",
  password: "sample",
  table: "dirty_orders",
  target_table: "orders_clean",
  schedule_cron: "",
};

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
          source: {
            type: "mysql" | "postgres";
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
          source_type: job.source.type,
          host: job.source.host,
          port: String(job.source.port),
          database: job.source.database,
          username: job.source.username,
          password: "",
          table: job.source.table,
          target_table: job.target_table,
          schedule_cron: job.schedule_cron ?? "",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "操作失败，请稍后重试");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const update = (key: keyof JobFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const payload = {
      name: form.name,
      source: {
        type: form.source_type,
        host: form.host,
        port: Number(form.port),
        database: form.database,
        username: form.username,
        password: form.password || "",
        table: form.table,
      },
      target_table: form.target_table,
      schedule_cron: form.schedule_cron || null,
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
      setError(err instanceof Error ? err.message : "操作失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <nav className="text-theme-sm text-gray-500 dark:text-gray-400">
        <Link to="/admin/ingestion/sync-jobs" className="hover:text-brand-500">
          同步任务
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-800 dark:text-white/90">{isEdit ? "编辑任务" : "新建任务"}</span>
      </nav>

      <h1 className="text-theme-xl font-semibold text-gray-900 dark:text-white">
        {isEdit ? "编辑同步任务" : "新建同步任务"}
      </h1>

      {error ? (
        <div className="rounded-xl border border-error-500 bg-error-50 p-4 text-theme-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400">
          {error}
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="space-y-2">
          <Label htmlFor="name">任务名称</Label>
          <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} required />
        </div>

        <div className="space-y-2">
          <Label>源类型</Label>
          <Select value={form.source_type} onValueChange={(v) => update("source_type", v)}>
            <SelectTrigger>
              <SelectValue placeholder="选择源类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mysql">MySQL</SelectItem>
              <SelectItem value="postgres">PostgreSQL</SelectItem>
            </SelectContent>
          </Select>
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

        <div className="flex gap-3 pt-2">
          <Button type="submit" variant="primary" loading={submitting}>
            {isEdit ? "保存" : "创建"}
          </Button>
          <Button asChild type="button" variant="outline">
            <Link to="/admin/ingestion/sync-jobs">取消</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
