import { type ReactNode, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ListGhostEmptyState } from "@/components/ui/panel-empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";
import { ErrorBanner, ListPageBody, ListPageToolbar } from "./metadata-shared";
import { ThemeTree, type ThemeNode } from "./theme-tree";

type Term = { id: string; name: string };

const NONE = "__none__";

export function ThemesPanel({ emptyIcon }: { emptyIcon: ReactNode }) {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [parentForCreate, setParentForCreate] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [termId, setTermId] = useState(NONE);
  const [deleteTarget, setDeleteTarget] = useState<ThemeNode | null>(null);

  const allNodes = useQuery({
    queryKey: queryKeys.metadataHub.themes("all"),
    queryFn: () => apiFetch<{ items: ThemeNode[] }>("/api/v1/metadata/themes?limit=500"),
  });
  const terms = useQuery({
    queryKey: queryKeys.metadataHub.glossary(),
    queryFn: () => apiFetch<{ items: Term[] }>("/api/v1/metadata/glossary?limit=100"),
    enabled: createOpen,
  });
  const inv = () => void qc.invalidateQueries({ queryKey: ["metadata", "themes"] });

  const openCreateRoot = () => {
    setParentForCreate(null);
    setName("");
    setTermId(NONE);
    setCreateOpen(true);
  };

  const createMut = useMutation({
    mutationFn: () =>
      apiFetch("/api/v1/metadata/themes", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          ...(parentForCreate ? { parentId: parentForCreate } : {}),
          ...(termId !== NONE ? { termId } : {}),
        }),
      }),
    onSuccess: () => {
      toast.success("主题节点已创建");
      setCreateOpen(false);
      inv();
    },
    onError: (e) => toast.error(mapApiError(e)),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/v1/metadata/themes/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("主题节点已删除");
      setDeleteTarget(null);
      inv();
    },
    onError: (e) => toast.error(mapApiError(e)),
  });

  const items = allNodes.data?.items ?? [];
  const isEmpty = !allNodes.isLoading && items.length === 0;

  return (
    <>
      <ListPageToolbar
        filters={
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">
            递归主题树：拖拽行可调整同级顺序（调用 move API）；点击展开子级。
          </p>
        }
        actions={
          <Button type="button" variant="primary" size="sm" onClick={openCreateRoot}>
            <Plus className="size-4" aria-hidden />
            新建根节点
          </Button>
        }
      />
      <ListPageBody>
        {allNodes.error ? (
          <ErrorBanner message={mapApiError(allNodes.error)} onRetry={() => void allNodes.refetch()} />
        ) : isEmpty ? (
          <ListGhostEmptyState
            icon={emptyIcon}
            title="暂无主题节点"
            description="从根节点开始搭建业务主题树，并可关联术语字典条目。"
            action={
              <Button type="button" variant="primary" size="sm" onClick={openCreateRoot}>
                <Plus className="size-4" aria-hidden />
                新建根节点
              </Button>
            }
            headingId="themes-empty"
          />
        ) : allNodes.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <ThemeTree
            nodes={items}
            onCreateChild={(parentId) => {
              setParentForCreate(parentId);
              setName("");
              setTermId(NONE);
              setCreateOpen(true);
            }}
            onDelete={setDeleteTarget}
          />
        )}
      </ListPageBody>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{parentForCreate ? "新建子节点" : "新建根节点"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="theme-name">名称</Label>
              <Input id="theme-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>关联术语</Label>
              <Select value={termId} onValueChange={setTermId}>
                <SelectTrigger>
                  <SelectValue placeholder="可选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>无</SelectItem>
                  {(terms.data?.items ?? []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
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
              disabled={!name.trim() || createMut.isPending}
              onClick={() => createMut.mutate()}
            >
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除主题节点？</AlertDialogTitle>
            <AlertDialogDescription>
              将删除「{deleteTarget?.name}」，仅叶节点可删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && delMut.mutate(deleteTarget.id)}>
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
