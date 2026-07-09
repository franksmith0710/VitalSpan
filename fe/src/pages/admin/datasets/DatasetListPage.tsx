import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import {
  DataTable,
  ListPageBody,
  ListPagePagination,
  ListPageSection,
  PageErrorBanner,
  RowActions,
} from "@/components/layout/list-page-kit";
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
import { Button, IconButton } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";
import { useListPagination } from "@/lib/list-pagination";

type DatasetItem = {
  datasetId: string;
  displayName: string;
  tables: Array<{ name: string; alias?: string | null }>;
  computedFields: Array<{ name: string; expression: string }>;
  allowedRoles: string[];
  boundConfigId?: string | null;
};

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

  const pagination = useListPagination(20);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.datasets.list({
      limit: pagination.pageSize,
      offset: pagination.offset,
    }),
    queryFn: () =>
      apiFetch<{ items: DatasetItem[]; total: number }>(
        `/api/v1/datasets?limit=${pagination.pageSize}&offset=${pagination.offset}`,
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
  const total = data?.total ?? 0;

  return (
    <AdminPageShell
      title="Dataset"
      description="语义层数据集管理：表关联、计算字段与授权角色（META-004）。"
      actions={
        <Button type="button" variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" aria-hidden />
          新建 Dataset
        </Button>
      }
    >
      <ListPageSection>
        {isError ? (
          <ListPageBody>
            <PageErrorBanner message={mapApiError(error)} onRetry={() => void refetch()} />
          </ListPageBody>
        ) : null}
        <ListPageBody>
          <DataTable
            loading={isLoading}
            empty={items.length === 0}
            lastColumnAlign="right"
            emptyState={{
              icon: <Layers className="size-7" aria-hidden />,
              title: "暂无 Dataset",
              description: "创建语义层数据集，配置表关联与计算字段。",
              action: (
                <Button type="button" variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="size-4" aria-hidden />
                  新建 Dataset
                </Button>
              ),
            }}
            headers={["显示名", "ID", "绑定配置", "表数量", "操作"]}
            rows={items.map((d) => [
              <span key="n" className="font-medium text-gray-900 dark:text-white/90">
                {d.displayName}
              </span>,
              <code
                key="id"
                className="rounded-md bg-gray-100 px-1.5 py-0.5 font-mono text-theme-xs text-gray-600 dark:bg-white/10 dark:text-gray-300"
              >
                {d.datasetId}
              </code>,
              d.boundConfigId ? `${d.boundConfigId.slice(0, 8)}…` : "—",
              d.tables.length,
              <RowActions key="a">
                <IconButton variant="ghost" size="sm" aria-label={`编辑 ${d.displayName}`} onClick={() => openEdit(d)}>
                  <Pencil className="size-4" />
                </IconButton>
                <IconButton variant="ghost" size="sm" aria-label={`删除 ${d.displayName}`} onClick={() => setDeleteTarget(d)}>
                  <Trash2 className="size-4" />
                </IconButton>
              </RowActions>,
            ])}
          />
        </ListPageBody>

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
