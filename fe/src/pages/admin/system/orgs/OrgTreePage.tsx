import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
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
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";
import { PageErrorBanner } from "@/components/ui/page-error-banner";
import { mapOrgError } from "./orgErrors";
import { OrgTreeRows, type OrgOut } from "./OrgTreeRows";

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
            onEdit={openEdit}
            onDelete={setDeleteOrg}
          />
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建组织</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="org-create-name">名称</Label>
              <Input
                id="org-create-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="如：综合处、华东区"
              />
            </div>
            <div className="grid gap-2">
              <Label>上级组织</Label>
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
            </div>
          </div>
          <DialogFooter>
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
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editOrg)} onOpenChange={(o) => !o && setEditOrg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑组织</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="org-edit-name">名称</Label>
              <Input
                id="org-edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>上级组织</Label>
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
            </div>
          </div>
          <DialogFooter>
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
          </DialogFooter>
        </DialogContent>
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
              disabled={deleteMutation.isPending}
              onClick={() => deleteOrg && deleteMutation.mutate(deleteOrg.id)}
            >
              {deleteMutation.isPending ? "删除中…" : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminPageShell>
  );
}
