import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";
import { mapRoleError } from "./roleErrors";
import {
  roleCreateSchema,
  roleEditSchema,
  type RoleCreateValues,
  type RoleEditValues,
} from "./roleFormSchema";

type RoleOut = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
};

type DashboardSummary = { id: string; name: string };
type CatalogTemplateNode = { id: string; name: string; nodeType: string };

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

const EMPTY_CREATE: RoleCreateValues = {
  code: "",
  name: "",
  description: "",
  defaultDashboardId: "",
  defaultReportTemplateNodeId: "",
};

export function RoleListPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedPrefix, setDebouncedPrefix] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RoleOut | null>(null);
  const [form, setForm] = useState<RoleCreateValues | RoleEditValues>(EMPTY_CREATE);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<RoleOut | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedPrefix(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const listParams = useMemo(
    () => ({
      limit: 50,
      offset: 0,
      ...(debouncedPrefix ? { codePrefix: debouncedPrefix } : {}),
    }),
    [debouncedPrefix],
  );

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.roles.list(listParams),
    queryFn: () => {
      const params = new URLSearchParams({ limit: "50", offset: "0" });
      if (debouncedPrefix) params.set("code_prefix", debouncedPrefix);
      return apiFetch<{ items: RoleOut[]; total: number }>(`/api/v1/roles?${params}`);
    },
  });

  const { data: dashboards } = useQuery({
    queryKey: queryKeys.dashboards.list(),
    queryFn: () => apiFetch<{ items: DashboardSummary[] }>("/api/v1/dashboards"),
  });

  const { data: reportTemplates } = useQuery({
    queryKey: queryKeys.reports.catalogNodes("all-templates"),
    queryFn: async () => {
      const data = await apiFetch<{ items: CatalogTemplateNode[] }>("/api/v1/reports/catalog/nodes");
      return { items: data.items.filter((n) => n.nodeType === "template") };
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_CREATE);
    setFormErrors({});
    setActionError(null);
    setDialogOpen(true);
  };

  const openEdit = async (role: RoleOut) => {
    setEditing(role);
    setFormErrors({});
    setActionError(null);
    let defaultDashboardId = "";
    let defaultReportTemplateNodeId = "";
    try {
      const dv = await apiFetch<{
        dashboardId: string | null;
        reportTemplateNodeId?: string | null;
      }>(`/api/v1/roles/${role.id}/default-views`);
      defaultDashboardId = dv.dashboardId ?? "";
      defaultReportTemplateNodeId = dv.reportTemplateNodeId ?? "";
    } catch {
      /* optional */
    }
    setForm({
      name: role.name,
      description: role.description ?? "",
      isActive: role.isActive,
      defaultDashboardId,
      defaultReportTemplateNodeId,
    });
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const isEdit = Boolean(editing);
      const parsed = isEdit
        ? roleEditSchema.safeParse(form)
        : roleCreateSchema.safeParse(form);
      if (!parsed.success) {
        const errs: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          const key = String(issue.path[0] ?? "form");
          errs[key] = issue.message;
        }
        setFormErrors(errs);
        throw new Error("validation");
      }
      setFormErrors({});
      const values = parsed.data;
      const dashId = values.defaultDashboardId || null;
      const reportId = values.defaultReportTemplateNodeId || null;

      if (isEdit && editing) {
        await apiFetch(`/api/v1/roles/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify({
            name: values.name,
            description: values.description || null,
            is_active: (values as RoleEditValues).isActive,
          }),
        });
        await apiFetch(`/api/v1/roles/${editing.id}/default-views`, {
          method: "PUT",
          body: JSON.stringify({ dashboardId: dashId, reportTemplateNodeId: reportId }),
        });
      } else {
        const created = await apiFetch<RoleOut>("/api/v1/roles", {
          method: "POST",
          body: JSON.stringify({
            code: (values as RoleCreateValues).code,
            name: values.name,
            description: values.description || null,
          }),
        });
        if (dashId || reportId) {
          await apiFetch(`/api/v1/roles/${created.id}/default-views`, {
            method: "PUT",
            body: JSON.stringify({ dashboardId: dashId, reportTemplateNodeId: reportId }),
          });
        }
      }
    },
    onSuccess: async () => {
      toast.success("已保存");
      setDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });
    },
    onError: (err) => {
      if (err instanceof Error && err.message === "validation") return;
      setActionError(mapRoleError(err));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/v1/roles/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      setDeleteTarget(null);
      toast.success("已删除");
      await queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });
    },
    onError: (err) => setActionError(mapRoleError(err)),
  });

  return (
    <AdminPageShell
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/admin">系统</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>角色管理</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      }
      title="角色管理"
      description="创建与管理角色，可配置默认 Dashboard 与报表模板。"
      actions={
        <Button type="button" variant="primary" onClick={openCreate}>
          新建角色
        </Button>
      }
    >
      <Input
        className="max-w-md"
        placeholder="搜索角色编码…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="搜索角色"
      />

      {isError ? (
        <ErrorBanner message={mapApiError(error)} onRetry={() => void refetch()} />
      ) : null}
      {actionError ? (
        <ErrorBanner message={actionError} onRetry={() => setActionError(null)} />
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
        <table className="min-w-[720px] w-full text-left text-theme-sm">
          <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">编码</th>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">显示名</th>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">描述</th>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">状态</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-3" colSpan={5}>
                      <Skeleton className="h-6 w-full" />
                    </td>
                  </tr>
                ))
              : null}
            {!isLoading && data?.items.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-gray-500 dark:text-gray-400" colSpan={5}>
                  暂无角色
                  <div className="mt-3">
                    <Button type="button" variant="primary" size="sm" onClick={openCreate}>
                      新建角色
                    </Button>
                  </div>
                </td>
              </tr>
            ) : null}
            {!isLoading
              ? data?.items.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-3 font-mono text-gray-800 dark:text-white/90">
                      {row.code}
                    </td>
                    <td className="px-4 py-3">{row.name}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-gray-600 dark:text-gray-400">
                      {row.description ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="light" color={row.isActive ? "success" : "light"}>
                        {row.isActive ? "启用" : "停用"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => void openEdit(row)}>
                          编辑
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setActionError(null);
                            setDeleteTarget(row);
                          }}
                        >
                          删除
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              : null}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "编辑角色" : "新建角色"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {!editing ? (
              <div className="grid gap-2">
                <Label htmlFor="role-code">角色编码</Label>
                <Input
                  id="role-code"
                  value={(form as RoleCreateValues).code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  aria-invalid={Boolean(formErrors.code)}
                />
                {formErrors.code ? (
                  <p className="text-theme-xs text-error-600">{formErrors.code}</p>
                ) : null}
              </div>
            ) : (
              <div className="grid gap-2">
                <Label>角色编码</Label>
                <Input value={editing.code} readOnly disabled />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="role-name">显示名</Label>
              <Input
                id="role-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                aria-invalid={Boolean(formErrors.name)}
              />
              {formErrors.name ? (
                <p className="text-theme-xs text-error-600">{formErrors.name}</p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role-desc">描述</Label>
              <Textarea
                id="role-desc"
                value={form.description ?? ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            {editing ? (
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="role-active">启用</Label>
                <Switch
                  id="role-active"
                  checked={(form as RoleEditValues).isActive}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, isActive: checked } as RoleEditValues)
                  }
                />
              </div>
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor="role-dash">默认 Dashboard</Label>
              <Select
                value={form.defaultDashboardId || "__none__"}
                onValueChange={(v) =>
                  setForm({ ...form, defaultDashboardId: v === "__none__" ? "" : v })
                }
              >
                <SelectTrigger id="role-dash">
                  <SelectValue placeholder="不设置" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">不设置</SelectItem>
                  {dashboards?.items.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role-report-tpl">默认报表模板</Label>
              <Select
                value={form.defaultReportTemplateNodeId || "__none__"}
                onValueChange={(v) =>
                  setForm({ ...form, defaultReportTemplateNodeId: v === "__none__" ? "" : v })
                }
              >
                <SelectTrigger id="role-report-tpl">
                  <SelectValue placeholder="不设置" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">不设置</SelectItem>
                  {reportTemplates?.items.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      <span className="truncate" title={t.name}>
                        {t.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? "保存中…" : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除角色？</AlertDialogTitle>
            <AlertDialogDescription>
              将删除「{deleteTarget?.name}」（{deleteTarget?.code}）。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? "删除中…" : "删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminPageShell>
  );
}
