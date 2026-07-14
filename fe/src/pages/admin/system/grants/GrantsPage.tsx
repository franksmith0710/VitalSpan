import { Shield } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BatchDeleteDialog,
  ListBatchDeleteBar,
  ListHeaderCheckbox,
  ListRowCheckbox,
} from "@/components/layout/list-batch-delete";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { useListRowSelection } from "@/hooks/useListRowSelection";
import { runBatchDelete } from "@/lib/runBatchDelete";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PanelEmptyState } from "@/components/ui/panel-empty-state";
import { SearchField } from "@/components/ui/search-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { mapApiError } from "@/lib/apiError";
import { apiFetch } from "@/lib/api";
import type { ResourceType } from "./grantFormSchema";
import { GrantsDialogs, RESOURCE_TYPE_LABELS } from "./GrantsDialogs";
import { useGrantsPage } from "./useGrantsPage";

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

export function GrantsPage() {
  const page = useGrantsPage();
  const { isLoading, isError, error, refetch } = page.grantsQuery;
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);
  const rowIds = useMemo(
    () => page.filteredItems.map((row) => row.id),
    [page.filteredItems],
  );
  const selection = useListRowSelection(rowIds);

  const handleBatchDelete = async () => {
    const ids = [...selection.selectedIds];
    if (ids.length === 0) return;
    setBatchDeleting(true);
    const { ok, failed } = await runBatchDelete(ids, (id) =>
      apiFetch(`/api/v1/resource-grants/${id}`, { method: "DELETE" }),
    );
    setBatchDeleting(false);
    setBatchDeleteOpen(false);
    selection.clear();
    await page.grantsQuery.refetch();
    if (failed === 0) toast.success(`已撤销 ${ok} 条授权`);
    else toast.warning(`已撤销 ${ok} 条，${failed} 条撤销失败`);
  };

  return (
    <AdminPageShell
      title="资源授权"
      description="按角色绑定数据源、Dashboard 或报表资源的访问授权。"
      actions={
        <Button type="button" variant="primary" onClick={page.openCreate}>
          新建授权
        </Button>
      }
    >
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-center">
        <SearchField
          className="w-full sm:max-w-md"
          value={page.search}
          onChange={page.setSearch}
          placeholder="按资源 ID 前缀搜索…"
          aria-label="搜索资源 ID"
        />
        <Select value={page.roleFilter} onValueChange={page.setRoleFilter}>
          <SelectTrigger className="h-11 w-full sm:w-[180px]" aria-label="筛选角色">
            <SelectValue placeholder="全部角色" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部角色</SelectItem>
            {(page.rolesQuery.data?.items ?? []).map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={page.typeFilter} onValueChange={page.setTypeFilter}>
          <SelectTrigger className="h-11 w-full sm:w-[160px]" aria-label="筛选资源类型">
            <SelectValue placeholder="全部类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            {(["datasource", "dashboard", "report"] as const).map((t) => (
              <SelectItem key={t} value={t}>
                {RESOURCE_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isError ? (
        <ErrorBanner message={mapApiError(error)} onRetry={() => void refetch()} />
      ) : null}
      {page.actionError ? (
        <ErrorBanner message={page.actionError} onRetry={() => page.setActionError(null)} />
      ) : null}

      <ListBatchDeleteBar
        selectedCount={selection.selectedCount}
        entityLabel="条授权"
        onClear={selection.clear}
        onDelete={() => setBatchDeleteOpen(true)}
      />

      <Card className="overflow-hidden shadow-theme-xs">
        <div className="overflow-x-auto">
          <table className="min-w-[720px] w-full text-left text-theme-sm" aria-label="资源授权列表">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
              <tr>
                <th className="w-10 px-4 py-3">
                  <ListHeaderCheckbox
                    checked={selection.allSelected}
                    indeterminate={selection.someSelected}
                    disabled={page.filteredItems.length === 0}
                    onCheckedChange={() => selection.toggleAll()}
                  />
                </th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">角色名称</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">资源类型</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">资源 ID</th>
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
              {!isLoading && page.filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-0">
                    <PanelEmptyState
                      icon={<Shield className="size-10" aria-hidden />}
                      title="暂无资源授权"
                      description="点击「新建授权」为角色绑定数据源、Dashboard 或报表资源。"
                      size="sm"
                      variant="plain"
                    />
                  </td>
                </tr>
              ) : null}
              {!isLoading
                ? page.filteredItems.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50/80 dark:border-gray-800 dark:hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3">
                        <ListRowCheckbox
                          checked={selection.isSelected(row.id)}
                          onCheckedChange={() => selection.toggle(row.id)}
                          ariaLabel={`选择授权 ${row.resourceId}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        {page.roleNameById.get(row.roleId) ?? row.roleId}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="light" color="light">
                          {RESOURCE_TYPE_LABELS[row.resourceType as ResourceType]}
                        </Badge>
                      </td>
                      <td className="max-w-xs truncate px-4 py-3 font-mono text-theme-xs text-gray-800 dark:text-white/90">
                        {row.resourceId}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          aria-label="撤销授权"
                          onClick={() => {
                            page.setActionError(null);
                            page.setDeleteTarget(row);
                          }}
                        >
                          撤销
                        </Button>
                      </td>
                    </tr>
                  ))
                : null}
            </tbody>
          </table>
        </div>
      </Card>

      <GrantsDialogs
        dialogOpen={page.dialogOpen}
        setDialogOpen={page.setDialogOpen}
        deleteTarget={page.deleteTarget}
        setDeleteTarget={page.setDeleteTarget}
        form={page.form}
        setForm={page.setForm}
        formErrors={page.formErrors}
        roles={page.rolesQuery.data?.items ?? []}
        createPending={page.createMutation.isPending}
        deletePending={page.deleteMutation.isPending}
        onSubmitCreate={page.submitCreate}
        onConfirmDelete={(id) => page.deleteMutation.mutate(id)}
      />

      <BatchDeleteDialog
        open={batchDeleteOpen}
        onOpenChange={setBatchDeleteOpen}
        count={selection.selectedCount}
        title="批量撤销授权"
        description={`确定撤销选中的 ${selection.selectedCount} 条资源授权？`}
        pending={batchDeleting}
        onConfirm={() => void handleBatchDelete()}
      />
    </AdminPageShell>
  );
}
