import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronDown } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";

type ConnectorType = { type: string; displayName: string };
type ConnectorTypeListResponse = { items: ConnectorType[] };

type DataSourceOut = {
  id: string;
  name: string;
  code: string;
  type: string;
  host: string;
  port: number;
  database: string;
  username: string;
  description?: string | null;
  connectionOptions?: {
    charset?: string;
    sslMode?: string;
    connectTimeoutSec?: number;
  };
};

type FormState = {
  name: string;
  code: string;
  type: string;
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
  description: string;
};

const emptyForm: FormState = {
  name: "",
  code: "",
  type: "mysql",
  host: "",
  port: "3306",
  database: "",
  username: "",
  password: "",
  description: "",
};

export function DatasourceFormPage({ mode }: { mode: "create" | "edit" }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const typesQuery = useQuery({
    queryKey: queryKeys.connectorTypes,
    queryFn: () => apiFetch<ConnectorTypeListResponse>("/api/v1/datasources/types"),
  });

  const detailQuery = useQuery({
    queryKey: queryKeys.datasources.detail(id ?? ""),
    queryFn: () => apiFetch<DataSourceOut>(`/api/v1/datasources/${id}`),
    enabled: mode === "edit" && Boolean(id),
  });

  useEffect(() => {
    if (detailQuery.data) {
      const ds = detailQuery.data;
      setForm({
        name: ds.name,
        code: ds.code,
        type: ds.type,
        host: ds.host,
        port: String(ds.port),
        database: ds.database,
        username: ds.username,
        password: "",
        description: ds.description ?? "",
      });
    }
  }, [detailQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        name: form.name,
        type: form.type,
        host: form.host,
        port: Number(form.port),
        database: form.database,
        username: form.username,
        description: form.description || null,
      };
      if (mode === "create") {
        payload.code = form.code;
        payload.password = form.password;
        return apiFetch<DataSourceOut>("/api/v1/datasources", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      if (form.password) payload.password = form.password;
      return apiFetch<DataSourceOut>(`/api/v1/datasources/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.datasources.all });
      navigate(`/admin/datasources/${saved.id}`);
    },
    onError: (err) => setError(mapApiError(err)),
  });

  const setField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  if (mode === "edit" && detailQuery.isLoading) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <AdminPageShell
      title={mode === "create" ? "新建数据源" : "编辑数据源"}
      description={mode === "create" ? "填写连接信息以注册新的数据源。" : "更新连接配置；留空密码表示不修改。"}
      actions={
        <Button asChild variant="outline">
          <Link to="/admin/datasources">返回列表</Link>
        </Button>
      }
    >
      <Card className="mx-auto max-w-2xl w-full">
        <CardHeader>
          <CardTitle>连接信息</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              saveMutation.mutate();
            }}
          >
            {error ? (
              <div className="rounded-xl border border-error-500 bg-error-50 p-3 text-theme-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400">
                {error}
              </div>
            ) : null}

            <div className="grid gap-2">
              <Label htmlFor="name">名称</Label>
              <Input id="name" value={form.name} onChange={(e) => setField("name", e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="code">标识</Label>
              <Input
                id="code"
                value={form.code}
                onChange={(e) => setField("code", e.target.value)}
                required
                readOnly={mode === "edit"}
                disabled={mode === "edit"}
              />
            </div>
            <div className="grid gap-2">
              <Label>类型</Label>
              <Select value={form.type} onValueChange={(v) => setField("type", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="选择类型" />
                </SelectTrigger>
                <SelectContent>
                  {(typesQuery.data?.items ?? [{ type: "mysql", displayName: "MySQL" }]).map((t) => (
                    <SelectItem key={t.type} value={t.type}>
                      {t.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="host">主机</Label>
                <Input id="host" value={form.host} onChange={(e) => setField("host", e.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="port">端口</Label>
                <Input id="port" type="number" value={form.port} onChange={(e) => setField("port", e.target.value)} required />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="database">数据库</Label>
              <Input id="database" value={form.database} onChange={(e) => setField("database", e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="username">用户名</Label>
              <Input id="username" value={form.username} onChange={(e) => setField("username", e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">{mode === "edit" ? "密码（留空不修改）" : "密码"}</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => setField("password", e.target.value)}
                required={mode === "create"}
                autoComplete={mode === "create" ? "new-password" : "current-password"}
              />
            </div>

            <Collapsible.Root open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <Collapsible.Trigger
                type="button"
                className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-4 py-2 text-theme-sm font-medium text-gray-700 dark:border-gray-800 dark:text-gray-300"
              >
                高级选项
                <ChevronDown className={cn("size-4 transition-transform", advancedOpen && "rotate-180")} />
              </Collapsible.Trigger>
              <Collapsible.Content className="pt-3">
                <div className="grid gap-2">
                  <Label htmlFor="description">描述</Label>
                  <Input
                    id="description"
                    value={form.description}
                    onChange={(e) => setField("description", e.target.value)}
                  />
                </div>
              </Collapsible.Content>
            </Collapsible.Root>

            <Button type="submit" variant="primary" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "保存中…" : "保存"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}
