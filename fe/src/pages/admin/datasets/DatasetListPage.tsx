import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";

type DatasetItem = {
  datasetId: string;
  displayName: string;
  tables: Array<{ name: string; alias?: string | null }>;
  computedFields: Array<{ name: string; expression: string }>;
  allowedRoles: string[];
  boundConfigId?: string | null;
};

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

export function DatasetListPage() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<DatasetItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DatasetItem | null>(null);
  const [datasetId, setDatasetId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [tableNames, setTableNames] = useState("");
  const [computedJson, setComputedJson] = useState("[]");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.datasets.list({ limit: 100, offset: 0 }),
    queryFn: () =>
      apiFetch<{ items: DatasetItem[]; total: number }>(
        "/api/v1/datasets?limit=100&offset=0",
      ),
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["datasets"] });

  const createMutation = useMutation({
    mutationFn: (body: DatasetItem) =>
      apiFetch("/api/v1/datasets", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: async () => {
      toast.success("Dataset 已创建");
      setCreateOpen(false);
      setDatasetId("");
      setDisplayName("");
      invalidate();
    },
    onError: (err) => toast.error(mapApiError(err)),
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      const tables = tableNames.split("\n").map((l) => l.trim()).filter(Boolean).map((name) => ({ name }));
      let computedFields: DatasetItem["computedFields"] = [];
      try {
        computedFields = JSON.parse(computedJson) as DatasetItem["computedFields"];
      } catch {
        throw new Error("计算字段 JSON 格式无效");
      }
      await apiFetch(`/api/v1/datasets/${editing.datasetId}`, {
        method: "PUT",
        body: JSON.stringify({
          datasetId: editing.datasetId,
          displayName: displayName.trim(),
          tables,
          computedFields,
          allowedRoles: editing.allowedRoles,
        }),
      });
    },
    onSuccess: () => {
      toast.success("Dataset 已更新");
      setEditOpen(false);
      invalidate();
    },
    onError: (err) => toast.error(mapApiError(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/v1/datasets/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Dataset 已删除");
      setDeleteTarget(null);
      invalidate();
    },
    onError: (err) => toast.error(mapApiError(err)),
  });

  const openEdit = (d: DatasetItem) => {
    setEditing(d);
    setDisplayName(d.displayName);
    setTableNames(d.tables.map((t) => t.name).join("\n"));
    setComputedJson(JSON.stringify(d.computedFields, null, 2));
    setEditOpen(true);
  };

  const items = data?.items ?? [];

  return (
    <AdminPageShell
      title="Dataset"
      description="语义层数据集管理：表关联、计算字段与授权角色（META-004）。"
      actions={
        <Button type="button" variant="primary" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" aria-hidden />
          新建 Dataset
        </Button>
      }
    >
      {isError ? <ErrorBanner message={mapApiError(error)} onRetry={() => void refetch()} /> : null}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
        <table className="min-w-[720px] w-full text-left text-theme-sm">
          <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">显示名</th>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">ID</th>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">绑定配置</th>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">表数量</th>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">操作</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="px-4 py-3">
                      <Skeleton className="h-6 w-full" />
                    </td>
                  </tr>
                ))
              : null}
            {items.length === 0 && !isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                  暂无 Dataset
                </td>
              </tr>
            ) : null}
            {items.map((d) => (
              <tr key={d.datasetId} className="border-b border-gray-100 dark:border-gray-800">
                <td className="px-4 py-3 font-medium text-gray-800 dark:text-white/90">{d.displayName}</td>
                <td className="px-4 py-3 font-mono text-theme-xs">{d.datasetId}</td>
                <td className="px-4 py-3 font-mono text-theme-xs">
                  {d.boundConfigId ? `${d.boundConfigId.slice(0, 8)}…` : "—"}
                </td>
                <td className="px-4 py-3">{d.tables.length}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" aria-label="编辑 Dataset" onClick={() => openEdit(d)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button type="button" variant="outline" size="sm" aria-label="删除 Dataset" onClick={() => setDeleteTarget(d)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>新建 Dataset</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="ds-id">Dataset ID</Label>
              <Input id="ds-id" value={datasetId} onChange={(e) => setDatasetId(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ds-name">显示名</Label>
              <Input id="ds-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
            <Button
              type="button"
              variant="primary"
              disabled={!datasetId.trim() || !displayName.trim() || createMutation.isPending}
              onClick={() =>
                createMutation.mutate({
                  datasetId: datasetId.trim(),
                  displayName: displayName.trim(),
                  tables: [{ name: "default_table" }],
                  computedFields: [],
                  allowedRoles: ["analyst"],
                })
              }
            >
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>编辑 Dataset</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">显示名</Label>
              <Input id="edit-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-tables">表名（每行一个）</Label>
              <Textarea id="edit-tables" value={tableNames} onChange={(e) => setTableNames(e.target.value)} rows={4} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-computed">计算字段 JSON</Label>
              <Textarea id="edit-computed" className="font-mono text-theme-xs" value={computedJson} onChange={(e) => setComputedJson(e.target.value)} rows={5} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>取消</Button>
            <Button type="button" variant="primary" disabled={editMutation.isPending} onClick={() => editMutation.mutate()}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除 Dataset？</AlertDialogTitle>
            <AlertDialogDescription>将删除「{deleteTarget?.displayName}」（{deleteTarget?.datasetId}）</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.datasetId)}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminPageShell>
  );
}
