import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import {
  BatchDeleteDialog,
  ListHeaderCheckbox,
  ListPageBatchActions,
  DESTRUCTIVE_ALERT_ACTION_CLASS,
} from "@/components/layout/list-batch-delete";
import {
  AdminFormDialogBody,
  AdminFormDialogContent,
  AdminFormDialogFooter,
  AdminFormDialogHeader,
  AdminFormField,
} from "@/components/layout/admin-form-dialog";
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
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import { PageErrorBanner } from "@/components/ui/page-error-banner";
import { mapOrgError } from "./orgErrors";
import { OrgTreeRows, type OrgOut } from "./OrgTreeRows";
import { useOrgBatchDelete } from "./useOrgBatchDelete";

function parentOptions(items: OrgOut[], excludeId?: string) {
  return items.filter((o) => o.id !== excludeId);
}

export function OrgTreePage() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createParentId, setCreateParentId] = useState<string>("__root__");
  const [editOrg, setEditOrg] = useState<OrgOut | null>(null);
  const [editName, setEditName] = useState("");
  const [editParentId, setEditParentId] = useState<string>("__root__");
  const [deleteOrg, setDeleteOrg] = useState<OrgOut | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.orgs.all,
    queryFn: () => apiFetch<{ items: OrgOut[] }>("/api/v1/orgs"),
  });

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: queryKeys.orgs.all });
  };

  const createMutation = useMutation({
    mutationFn: (body: { name: string; parent_id?: string | null }) =>
      apiFetch<OrgOut>("/api/v1/orgs", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: async () => {
      toast.success("组织节点已创建");
      setCreateOpen(false);
      setCreateName("");
      setCreateParentId("__root__");
      await invalidate();
    },
    onError: (err) => toast.error(mapOrgError(err)),
  });

  const updateMutation = useMutation({
    mutationFn: (body: { id: string; name: string; parent_id: string | null }) =>
      apiFetch<OrgOut>(`/api/v1/orgs/${body.id}`, {
        method: "PUT",
        body: JSON.stringify({ name: body.name, parent_id: body.parent_id }),
      }),
    onSuccess: async () => {
      toast.success("组织节点已更新");
      setEditOrg(null);
      await invalidate();
    },
    onError: (err) => toast.error(mapOrgError(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/v1/orgs/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      toast.success("组织节点已删除");
      setDeleteOrg(null);
      await invalidate();
    },
    onError: (err) => toast.error(mapOrgError(err)),
  });

  const items = data?.items ?? [];
  const {
    selection,
    batch,
    batchDeleteOpen,
    setBatchDeleteOpen,
    batchDeleting,
    handleBatchDelete,
  } = useOrgBatchDelete(items, invalidate);

  const openEdit = (org: OrgOut) => {
    setEditOrg(org);
    setEditName(org.name);
    setEditParentId(org.parent_id ?? "__root__");
  };

  return (
    <AdminPageShell
      title="组织架构"
      description="维护处室、部门或辖区层级。用户归属与数据范围过滤都依赖组织树，建议作为后台管理的第一步。"
      actions={
        <Button type="button" variant="primary" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" aria-hidden />
          新建组织
        </Button>
      }
    >
      {isError ? <PageErrorBanner message={mapApiError(error)} onRetry={() => void refetch()} /> : null}

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
        {items.length > 0 ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <ListPageBatchActions
              batchMode={batch.batchMode}
              onToggleBatchMode={batch.toggleBatchMode}
              selectedCount={selection.selectedCount}
              entityLabel="个组织"
              onClear={selection.clear}
              onDelete={() => setBatchDeleteOpen(true)}
            />
            {batch.batchMode ? (
              <div className="flex items-center gap-2">
                <ListHeaderCheckbox
                  checked={selection.allSelected}
                  indeterminate={selection.someSelected}
                  disabled={items.length === 0}
                  onCheckedChange={() => selection.toggleAll()}
                />
                <span className="text-theme-xs text-gray-500 dark:text-gray-400">全选</span>
              </div>
            ) : (
              <p className="text-theme-sm text-gray-500 dark:text-gray-400">共 {items.length} 个组织节点</p>
            )}
          </div>
        ) : null}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="py-12 text-center text-theme-sm text-gray-500 dark:text-gray-400">
            尚未建立组织。点击「新建组织」添加第一个处室或部门。
          </p>
        ) : (
          <OrgTreeRows
            items={items}
            parentId={null}
            depth={0}
            batchMode={batch.batchMode}
            isSelected={selection.isSelected}
            onToggleSelect={selection.toggle}
            onEdit={openEdit}
            onDelete={setDeleteOrg}
          />
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <AdminFormDialogContent>
          <AdminFormDialogHeader>
            <DialogTitle>新建组织</DialogTitle>
          </AdminFormDialogHeader>
          <AdminFormDialogBody>
            <AdminFormField label="名称" htmlFor="org-create-name">
              <Input
                id="org-create-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="如：综合处、华东区"
              />
            </AdminFormField>
            <AdminFormField label="上级组织">
              <Select value={createParentId} onValueChange={setCreateParentId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__root__">（顶级组织）</SelectItem>
                  {items.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </AdminFormField>
          </AdminFormDialogBody>
          <AdminFormDialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              取消
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={!createName.trim() || createMutation.isPending}
              onClick={() =>
                createMutation.mutate({
                  name: createName.trim(),
                  parent_id: createParentId === "__root__" ? null : createParentId,
                })
              }
            >
              创建
            </Button>
          </AdminFormDialogFooter>
        </AdminFormDialogContent>
      </Dialog>

      <Dialog open={Boolean(editOrg)} onOpenChange={(o) => !o && setEditOrg(null)}>
        <AdminFormDialogContent>
          <AdminFormDialogHeader>
            <DialogTitle>编辑组织</DialogTitle>
          </AdminFormDialogHeader>
          <AdminFormDialogBody>
            <AdminFormField label="名称" htmlFor="org-edit-name">
              <Input
                id="org-edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </AdminFormField>
            <AdminFormField label="上级组织">
              <Select value={editParentId} onValueChange={setEditParentId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__root__">（顶级组织）</SelectItem>
                  {parentOptions(items, editOrg?.id).map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </AdminFormField>
          </AdminFormDialogBody>
          <AdminFormDialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditOrg(null)}>
              取消
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={!editName.trim() || updateMutation.isPending}
              onClick={() => {
                if (!editOrg) return;
                updateMutation.mutate({
                  id: editOrg.id,
                  name: editName.trim(),
                  parent_id: editParentId === "__root__" ? null : editParentId,
                });
              }}
            >
              保存
            </Button>
          </AdminFormDialogFooter>
        </AdminFormDialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteOrg)} onOpenChange={(o) => !o && setDeleteOrg(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除组织？</AlertDialogTitle>
            <AlertDialogDescription>
              将删除「{deleteOrg?.name}」。若仍有下级组织或已绑定用户，删除会失败。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className={DESTRUCTIVE_ALERT_ACTION_CLASS}
              disabled={deleteMutation.isPending}
              onClick={() => deleteOrg && deleteMutation.mutate(deleteOrg.id)}
            >
              {deleteMutation.isPending ? "删除中…" : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BatchDeleteDialog
        open={batchDeleteOpen}
        onOpenChange={setBatchDeleteOpen}
        count={selection.selectedCount}
        title="批量删除组织"
        description={`确定删除选中的 ${selection.selectedCount} 个组织节点？仍有下级组织或已绑定用户的节点会删除失败。`}
        pending={batchDeleting}
        onConfirm={() => void handleBatchDelete()}
      />
    </AdminPageShell>
  );
}
