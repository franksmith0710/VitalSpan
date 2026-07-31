import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  BatchDeleteDialog,
  ListPageBatchActions,
  ListHeaderCheckbox,
  ListRowCheckbox,
  listTableSelectCellClass,
  listTableSelectHeadClass,
  useListBatchMode,
} from "@/components/layout/list-batch-delete";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import {
  ListPagePagination,
  ListPageSection,
  ListPageTableFrame,
  ListPageToolbar,
} from "@/components/layout/list-page-kit";
import { useListRowSelection } from "@/hooks/useListRowSelection";
import { runBatchDelete } from "@/lib/runBatchDelete";
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
import { Button, IconButton } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SearchField } from "@/components/ui/search-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import { mapRoleError } from "./roleErrors";
import { PageErrorBanner } from "@/components/ui/page-error-banner";
import { useListPagination } from "@/lib/list-pagination";
import {
  roleCreateSchema,
  roleEditSchema,
  type RoleCreateValues,
  type RoleEditValues,
} from "./roleFormSchema";
import { RolePermissionsPanel } from "./RolePermissionsPanel";
import { RoleProfileFormFields } from "./RoleProfileFormFields";

type RoleOut = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  isRoot?: boolean;
};

type DashboardSummary = { id: string; name: string };
type CatalogTemplateNode = { id: string; name: string; nodeType: string };

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
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTab, setDialogTab] = useState<"profile" | "permissions">("profile");
  const [editing, setEditing] = useState<RoleOut | null>(null);
  const [form, setForm] = useState<RoleCreateValues | RoleEditValues>(EMPTY_CREATE);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<RoleOut | null>(null);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedPrefix(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const pagination = useListPagination(undefined, [debouncedPrefix, statusFilter]);

  const listParams = useMemo(
    () => ({
      limit: pagination.pageSize,
      offset: pagination.offset,
      ...(debouncedPrefix ? { codePrefix: debouncedPrefix } : {}),
    }),
    [debouncedPrefix, pagination.pageSize, pagination.offset],
  );

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.roles.list(listParams),
    queryFn: () => {
      const params = new URLSearchParams({
        limit: String(pagination.pageSize),
        offset: String(pagination.offset),
      });
      if (debouncedPrefix) params.set("code_prefix", debouncedPrefix);
      return apiFetch<{ items: RoleOut[]; total: number }>(`/api/v1/roles?${params}`);
    },
  });

  const total = data?.total ?? 0;

  const filteredItems = useMemo(() => {
    const items = data?.items ?? [];
    if (statusFilter === "active") return items.filter((row) => row.isActive);
    if (statusFilter === "inactive") return items.filter((row) => !row.isActive);
    return items;
  }, [data?.items, statusFilter]);

  const rowIds = useMemo(() => filteredItems.map((row) => row.id), [filteredItems]);
  const selection = useListRowSelection(rowIds);
  const batch = useListBatchMode(selection.clear);
  const tableColSpan = batch.batchMode ? 6 : 5;

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
    setDialogTab("profile");
    setForm(EMPTY_CREATE);
    setFormErrors({});
    setActionError(null);
    setDialogOpen(true);
  };

  const openEdit = async (role: RoleOut) => {
    setEditing(role);
    setDialogTab("profile");
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

  const handleBatchDelete = async () => {
    const ids = [...selection.selectedIds];
    if (ids.length === 0) return;
    setBatchDeleting(true);
    const { ok, failed } = await runBatchDelete(ids, (id) =>
      apiFetch(`/api/v1/roles/${id}`, { method: "DELETE" }),
    );
    setBatchDeleting(false);
    setBatchDeleteOpen(false);
    selection.clear();
    await queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });
    if (failed === 0) toast.success(`已删除 ${ok} 个角色`);
    else toast.warning(`已删除 ${ok} 个，${failed} 个删除失败`);
  };

  return (
    <AdminPageShell
      layout="list"
      title="角色管理"
      description="创建与管理角色，可配置默认仪表板与报表模板。"
      actions={
        <Button type="button" variant="primary" onClick={openCreate}>
          新建角色
        </Button>
      }
    >
      <ListPageSection>
        <ListPageToolbar
          filters={
            <>
              <SearchField
                className="w-full sm:max-w-md"
                value={search}
                onChange={setSearch}
                placeholder="按编码前缀搜索…"
                aria-label="搜索角色"
              />
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as "all" | "active" | "inactive")}
              >
                <SelectTrigger className="h-11 w-full sm:w-[140px]" aria-label="筛选角色状态">
                  <SelectValue placeholder="状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="active">仅启用</SelectItem>
                  <SelectItem value="inactive">仅停用</SelectItem>
                </SelectContent>
              </Select>
            </>
          }
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <ListPageBatchActions
                batchMode={batch.batchMode}
                onToggleBatchMode={batch.toggleBatchMode}
                selectedCount={selection.selectedCount}
                entityLabel="个角色"
                onClear={selection.clear}
                onDelete={() => setBatchDeleteOpen(true)}
              />
              {!isLoading && data ? (
                <p className="text-theme-sm text-gray-500 dark:text-gray-400">
                  {debouncedPrefix || statusFilter !== "all"
                    ? `显示 ${filteredItems.length} 个`
                    : `共 ${data.total} 个角色`}
                </p>
              ) : null}
            </div>
          }
        />

        {isError ? (
          <div className="shrink-0 border-b border-gray-100 px-5 py-3 dark:border-white/[0.06]">
            <PageErrorBanner message={mapApiError(error)} onRetry={() => void refetch()} />
          </div>
        ) : null}
        {actionError ? (
          <div className="shrink-0 border-b border-gray-100 px-5 py-3 dark:border-white/[0.06]">
            <PageErrorBanner message={actionError} onRetry={() => setActionError(null)} />
          </div>
        ) : null}

        <ListPageTableFrame>
          <div className="overflow-x-only">
            <table className="min-w-[720px] w-full text-left text-theme-sm">
              <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
                <tr>
                  {batch.batchMode ? (
                    <th className={listTableSelectHeadClass}>
                      <ListHeaderCheckbox
                        checked={selection.allSelected}
                        indeterminate={selection.someSelected}
                        disabled={filteredItems.length === 0}
                        onCheckedChange={() => selection.toggleAll()}
                      />
                    </th>
                  ) : null}
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
                        <td className="px-4 py-3" colSpan={tableColSpan}>
                          <Skeleton className="h-6 w-full" />
                        </td>
                      </tr>
                    ))
                  : null}
                {!isLoading && data && data.items.length > 0 && filteredItems.length === 0 ? (
                  <tr>
                    <td
                      className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                      colSpan={tableColSpan}
                    >
                      当前筛选条件下暂无角色
                    </td>
                  </tr>
                ) : null}
                {!isLoading && data?.items.length === 0 ? (
                  <tr>
                    <td
                      className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                      colSpan={tableColSpan}
                    >
                      {debouncedPrefix ? (
                        <>未找到编码以「{debouncedPrefix}」开头的角色</>
                      ) : (
                        <>
                          暂无角色
                          <div className="mt-3">
                            <Button type="button" variant="primary" size="sm" onClick={openCreate}>
                              新建角色
                            </Button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                ) : null}
                {!isLoading
                  ? filteredItems.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-gray-100 transition-colors last:border-0 hover:bg-gray-50/80 dark:border-gray-800 dark:hover:bg-white/[0.02]"
                      >
                        {batch.batchMode ? (
                          <td className={listTableSelectCellClass}>
                            <ListRowCheckbox
                              checked={selection.isSelected(row.id)}
                              onCheckedChange={() => selection.toggle(row.id)}
                              ariaLabel={`选择角色 ${row.name}`}
                            />
                          </td>
                        ) : null}
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
                          <div className="flex items-center justify-end gap-0.5">
                            <IconButton
                              type="button"
                              variant="ghost"
                              size="sm"
                              aria-label="编辑"
                              onClick={() => void openEdit(row)}
                            >
                              <Pencil className="size-4" />
                            </IconButton>
                            <IconButton
                              type="button"
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "text-gray-500 hover:text-error-600 dark:text-gray-400 dark:hover:text-error-400",
                              )}
                              aria-label="删除"
                              onClick={() => {
                                setActionError(null);
                                setDeleteTarget(row);
                              }}
                            >
                              <Trash2 className="size-4" />
                            </IconButton>
                          </div>
                        </td>
                      </tr>
                    ))
                  : null}
              </tbody>
            </table>
          </div>
        </ListPageTableFrame>

        {!isLoading && total > 0 ? (
          <ListPagePagination
            current={pagination.page}
            pageSize={pagination.pageSize}
            total={total}
            showSizeChanger
            onChange={pagination.onPageChange}
          />
        ) : null}
      </ListPageSection>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setDialogTab("profile");
        }}
      >
        <DialogContent className="flex max-h-[min(90dvh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="shrink-0 border-b border-gray-100 px-6 py-5 dark:border-white/[0.06]">
            <DialogTitle>{editing ? "编辑角色" : "新建角色"}</DialogTitle>
          </DialogHeader>
          {editing ? (
            <Tabs
              value={dialogTab}
              onValueChange={(v) => setDialogTab(v as "profile" | "permissions")}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="shrink-0 border-b border-gray-100 px-6 dark:border-white/[0.06]">
                <TabsList className="h-10 w-full justify-start rounded-none border-0 bg-transparent p-0">
                  <TabsTrigger value="profile" className="rounded-lg">
                    基本信息
                  </TabsTrigger>
                  <TabsTrigger value="permissions" className="rounded-lg">
                    权限
                  </TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="profile" className="mt-0 min-h-0 flex-1 overflow-y-auto px-6 py-5">
                <RoleProfileFormFields
                  editing={editing}
                  form={form}
                  setForm={setForm}
                  formErrors={formErrors}
                  dashboards={dashboards?.items}
                  reportTemplates={reportTemplates?.items}
                />
              </TabsContent>
              <TabsContent value="permissions" className="mt-0 min-h-0 flex-1 overflow-y-auto px-6 py-5">
                <RolePermissionsPanel
                  roleId={editing.id}
                  roleName={editing.name}
                  isRoot={editing.isRoot}
                />
              </TabsContent>
            </Tabs>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <RoleProfileFormFields
                editing={null}
                form={form}
                setForm={setForm}
                formErrors={formErrors}
                dashboards={dashboards?.items}
                reportTemplates={reportTemplates?.items}
              />
            </div>
          )}
          {dialogTab === "profile" || !editing ? (
            <DialogFooter className="shrink-0 px-6 py-4">
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
          ) : (
            <DialogFooter className="shrink-0 px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                关闭
              </Button>
            </DialogFooter>
          )}
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

      <BatchDeleteDialog
        open={batchDeleteOpen}
        onOpenChange={setBatchDeleteOpen}
        count={selection.selectedCount}
        title="批量删除角色"
        pending={batchDeleting}
        onConfirm={() => void handleBatchDelete()}
      />
    </AdminPageShell>
  );
}
