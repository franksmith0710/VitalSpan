import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronDown } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ConnectorCategoryCard } from "@/components/datasources/ConnectorCategoryCard";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { ApiRequestError, apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import {
  connectorTypeIcon,
  DISPLAY_GROUP_META,
  DISPLAY_GROUP_ORDER,
  groupTypesByDisplayGroup,
  type ConnectorTypeItem,
  type DisplayGroup,
} from "@/lib/connector-taxonomy";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";

type WizardStep = "category" | "type" | "form";
type ConnectorTypeListResponse = { items: ConnectorTypeItem[] };

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

function hostFieldLabel(type: string): string {
  if (type === "rest_api") return "Base URL";
  if (type === "excel" || type === "csv") return "文件路径 / URL";
  return "主机";
}

function hidePortField(type: string): boolean {
  return type === "excel" || type === "csv";
}

const CONNECTOR_FIELD_HINTS: Record<string, { port: string; databaseLabel: string; usernameLabel: string }> = {
  mongodb: { port: "27017", databaseLabel: "认证库", usernameLabel: "用户名" },
  elasticsearch: { port: "9200", databaseLabel: "默认索引（可选）", usernameLabel: "用户名" },
  opensearch: { port: "9200", databaseLabel: "默认索引（可选）", usernameLabel: "用户名" },
  dm: { port: "5236", databaseLabel: "库/模式（OWNER）", usernameLabel: "用户名" },
  kingbase: { port: "54321", databaseLabel: "数据库", usernameLabel: "用户名" },
  gbase: { port: "5258", databaseLabel: "数据库", usernameLabel: "用户名" },
  oceanbase: { port: "2881", databaseLabel: "租户/数据库", usernameLabel: "用户名" },
  tidb: { port: "4000", databaseLabel: "数据库", usernameLabel: "用户名" },
  gaussdb: { port: "5432", databaseLabel: "数据库 / Schema", usernameLabel: "用户名" },
  rest_api: { port: "443", databaseLabel: "API 探测路径", usernameLabel: "用户名（Basic，可选）" },
  excel: { port: "1", databaseLabel: "Sheet 名（可选）", usernameLabel: "用户名" },
  csv: { port: "1", databaseLabel: "数据库", usernameLabel: "用户名" },
  db2: { port: "50000", databaseLabel: "数据库", usernameLabel: "用户名" },
  impala: { port: "21050", databaseLabel: "数据库", usernameLabel: "用户名" },
  redshift: { port: "5439", databaseLabel: "数据库", usernameLabel: "用户名" },
};

export function DatasourceFormPage({ mode }: { mode: "create" | "edit" }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [wizardStep, setWizardStep] = useState<WizardStep>(mode === "create" ? "category" : "form");
  const [selectedGroup, setSelectedGroup] = useState<DisplayGroup | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);

  const typesQuery = useQuery({
    queryKey: queryKeys.connectorTypes,
    queryFn: () => apiFetch<ConnectorTypeListResponse>("/api/v1/datasources/types"),
  });

  const groupedTypes = useMemo(
    () => groupTypesByDisplayGroup(typesQuery.data?.items ?? []),
    [typesQuery.data?.items],
  );

  const visibleGroups = useMemo(
    () => DISPLAY_GROUP_ORDER.filter((g) => (groupedTypes.get(g)?.length ?? 0) > 0),
    [groupedTypes],
  );

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

  useEffect(() => {
    if (errorCode === "DATASOURCE_CODE_CONFLICT" && mode === "create") {
      codeInputRef.current?.focus();
      codeInputRef.current?.select();
    }
  }, [errorCode, mode]);

  const clearError = () => {
    setError(null);
    setErrorCode(null);
  };

  const setField = (key: keyof FormState, value: string) => {
    clearError();
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    clearError();
    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        type: form.type,
        host: form.host,
        port: Number(form.port),
        database: form.database,
        username: form.username,
        description: form.description || null,
      };
      let saved: DataSourceOut;
      if (mode === "create") {
        payload.code = form.code;
        payload.password = form.password;
        saved = await apiFetch<DataSourceOut>("/api/v1/datasources", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else {
        if (form.password) payload.password = form.password;
        saved = await apiFetch<DataSourceOut>(`/api/v1/datasources/${id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.datasources.all });
      navigate(`/admin/datasources/${saved.id}`);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setErrorCode(err.code ?? null);
      }
      setError(mapApiError(err));
    } finally {
      setIsSaving(false);
    }
  };

  if (mode === "edit" && detailQuery.isLoading) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const showForm = mode === "edit" || wizardStep === "form";
  const selectedTypeLabel =
    typesQuery.data?.items.find((t) => t.type === form.type)?.displayName ?? form.type;

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
      {mode === "create" && wizardStep === "category" ? (
        <div className="mx-auto grid max-w-3xl w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleGroups.map((group) => {
            const items = groupedTypes.get(group) ?? [];
            const meta = DISPLAY_GROUP_META[group];
            const Icon = connectorTypeIcon(items[0]?.type ?? group, group);
            return (
              <ConnectorCategoryCard
                key={group}
                label={items[0]?.categoryLabel ?? meta.label}
                description={meta.description}
                count={items.length}
                icon={Icon}
                onSelect={() => {
                  setSelectedGroup(group);
                  setWizardStep("type");
                }}
              />
            );
          })}
        </div>
      ) : null}

      {mode === "create" && wizardStep === "type" && selectedGroup ? (
        <div className="mx-auto max-w-3xl w-full space-y-4">
          <button type="button" className="text-theme-sm text-brand-600" onClick={() => setWizardStep("category")}>
            ← 返回选择大类
          </button>
          <div className="grid gap-3 sm:grid-cols-2">
            {(groupedTypes.get(selectedGroup) ?? []).map((t) => {
              const Icon = connectorTypeIcon(t.type, t.displayGroup);
              return (
                <ConnectorCategoryCard
                  key={t.type}
                  label={t.displayName}
                  description={t.type}
                  count={0}
                  icon={Icon}
                  onSelect={() => {
                    const hints = CONNECTOR_FIELD_HINTS[t.type];
                    setForm((prev) => ({
                      ...prev,
                      type: t.type,
                      port: hints?.port ?? prev.port,
                    }));
                    setWizardStep("form");
                  }}
                />
              );
            })}
          </div>
        </div>
      ) : null}

      {showForm ? (
        <>
          {mode === "create" && wizardStep === "form" ? (
            <div className="mx-auto mb-4 flex max-w-2xl items-center justify-between text-theme-sm text-gray-500">
              <span>选择类型 › 连接配置</span>
              <button type="button" className="text-brand-600" onClick={() => setWizardStep("type")}>
                更改类型
              </button>
            </div>
          ) : null}

          <Card className="mx-auto max-w-2xl w-full">
            <CardHeader>
              <CardTitle>连接信息</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="grid gap-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSave();
                }}
              >
                {error ? (
                  <Alert severity="error" closable onClose={clearError}>
                    <AlertDescription className="text-theme-sm text-error-700 dark:text-error-400">
                      {error}
                    </AlertDescription>
                  </Alert>
                ) : null}

                <div className="grid gap-2">
                  <Label htmlFor="name">名称</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    required
                    fieldState={errorCode === "DATASOURCE_NAME_CONFLICT" ? "error" : "default"}
                    aria-invalid={errorCode === "DATASOURCE_NAME_CONFLICT" || undefined}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="code">标识</Label>
                  <Input
                    ref={codeInputRef}
                    id="code"
                    value={form.code}
                    onChange={(e) => setField("code", e.target.value)}
                    required
                    readOnly={mode === "edit"}
                    fieldState={
                      errorCode === "DATASOURCE_CODE_CONFLICT" && mode === "create" ? "error" : "default"
                    }
                    aria-invalid={
                      errorCode === "DATASOURCE_CODE_CONFLICT" && mode === "create" ? true : undefined
                    }
                  />
                </div>
                {mode === "edit" ? (
                  <div className="grid gap-2">
                    <Label>类型</Label>
                    <Select
                      value={form.type}
                      onValueChange={(v) => {
                        clearError();
                        const hints = CONNECTOR_FIELD_HINTS[v];
                        setForm((prev) => ({
                          ...prev,
                          type: v,
                          port: hints?.port ?? prev.port,
                        }));
                      }}
                    >
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
                    {form.type === "oceanbase" ? (
                      <p
                        id="oceanbase-hint"
                        className="text-theme-sm text-gray-500 dark:text-gray-400"
                      >
                        使用 MySQL 兼容协议连接；集群部署请填写 OBProxy 主机与租户名。
                      </p>
                    ) : null}
                    {form.type === "gaussdb" ? (
                      <p
                        id="gaussdb-hint"
                        className="text-theme-sm text-gray-500 dark:text-gray-400"
                      >
                        GaussDB 兼容 PostgreSQL 协议，默认端口 5432
                      </p>
                    ) : null}
                    {form.type === "rest_api" ? (
                      <p id="rest-api-hint" className="text-theme-sm text-gray-500 dark:text-gray-400">
                        base URL 填主机地址；HTTPS 默认 443
                      </p>
                    ) : null}
                    {form.type === "excel" ? (
                      <p id="excel-hint" className="text-theme-sm text-gray-500 dark:text-gray-400">
                        host 填本地 .xlsx 路径或 HTTPS 文件 URL
                      </p>
                    ) : null}
                    {form.type === "csv" ? (
                      <p id="csv-hint" className="text-theme-sm text-gray-500 dark:text-gray-400">
                        host 填本地 .csv 路径或 HTTPS URL
                      </p>
                    ) : null}
                    {form.type === "impala" ? (
                      <p id="impala-hint" className="text-theme-sm text-gray-500 dark:text-gray-400">
                        兼容 Hive 协议；默认 LDAP/无认证由后端处理
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <Label>类型</Label>
                    <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">{selectedTypeLabel}</p>
                    {form.type === "oceanbase" ? (
                      <p id="oceanbase-hint" className="text-theme-sm text-gray-500 dark:text-gray-400">
                        使用 MySQL 兼容协议连接；集群部署请填写 OBProxy 主机与租户名。
                      </p>
                    ) : null}
                    {form.type === "gaussdb" ? (
                      <p id="gaussdb-hint" className="text-theme-sm text-gray-500 dark:text-gray-400">
                        GaussDB 兼容 PostgreSQL 协议，默认端口 5432
                      </p>
                    ) : null}
                    {form.type === "rest_api" ? (
                      <p id="rest-api-hint" className="text-theme-sm text-gray-500 dark:text-gray-400">
                        base URL 填主机地址；HTTPS 默认 443
                      </p>
                    ) : null}
                    {form.type === "excel" ? (
                      <p id="excel-hint" className="text-theme-sm text-gray-500 dark:text-gray-400">
                        host 填本地 .xlsx 路径或 HTTPS 文件 URL
                      </p>
                    ) : null}
                    {form.type === "csv" ? (
                      <p id="csv-hint" className="text-theme-sm text-gray-500 dark:text-gray-400">
                        host 填本地 .csv 路径或 HTTPS URL
                      </p>
                    ) : null}
                    {form.type === "impala" ? (
                      <p id="impala-hint" className="text-theme-sm text-gray-500 dark:text-gray-400">
                        兼容 Hive 协议；默认 LDAP/无认证由后端处理
                      </p>
                    ) : null}
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="host">{hostFieldLabel(form.type)}</Label>
                    <Input id="host" value={form.host} onChange={(e) => setField("host", e.target.value)} required />
                  </div>
                  {hidePortField(form.type) ? null : (
                    <div className="grid gap-2">
                      <Label htmlFor="port">端口</Label>
                      <Input id="port" type="number" value={form.port} onChange={(e) => setField("port", e.target.value)} required />
                    </div>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="database">{CONNECTOR_FIELD_HINTS[form.type]?.databaseLabel ?? "数据库"}</Label>
                  <Input
                    id="database"
                    value={form.database}
                    onChange={(e) => setField("database", e.target.value)}
                    required
                    aria-describedby={
                      form.type === "oceanbase"
                        ? "oceanbase-hint"
                        : form.type === "gaussdb"
                          ? "gaussdb-hint"
                          : form.type === "rest_api"
                            ? "rest-api-hint"
                            : form.type === "excel"
                              ? "excel-hint"
                              : form.type === "csv"
                                ? "csv-hint"
                                : form.type === "impala"
                                  ? "impala-hint"
                                  : undefined
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="username">{CONNECTOR_FIELD_HINTS[form.type]?.usernameLabel ?? "用户名"}</Label>
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

                <Button type="submit" variant="primary" disabled={isSaving} loading={isSaving} loadingText="保存中…">
                  保存
                </Button>
              </form>
            </CardContent>
          </Card>
        </>
      ) : null}
    </AdminPageShell>
  );
}
