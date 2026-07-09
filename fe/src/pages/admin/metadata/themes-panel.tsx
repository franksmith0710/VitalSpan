import { type ReactNode, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { IconButton } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import { ErrorBanner, ListPageBody, ListPageToolbar, RowActions } from "./metadata-shared";

type ThemeNode = { id: string; name: string; code: string | null; parentId: string | null };
type Term = { id: string; name: string };

const NONE = "__none__";

export function ThemesPanel({ emptyIcon }: { emptyIcon: ReactNode }) {
  const qc = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [parentForCreate, setParentForCreate] = useState<string | null>(null);
  const [moveTarget, setMoveTarget] = useState<ThemeNode | null>(null);
  const [name, setName] = useState("");
  const [termId, setTermId] = useState(NONE);
  const [moveParentId, setMoveParentId] = useState(NONE);
  const [deleteTarget, setDeleteTarget] = useState<ThemeNode | null>(null);

  const roots = useQuery({
    queryKey: queryKeys.metadataHub.themes("null"),
    queryFn: () => apiFetch<{ items: ThemeNode[] }>("/api/v1/metadata/themes?parent_id=null&limit=100"),
  });
  const children = useQuery({
    queryKey: queryKeys.metadataHub.themes(expandedId),
    queryFn: () => apiFetch<{ items: ThemeNode[] }>(`/api/v1/metadata/themes?parent_id=${expandedId}&limit=100`),
    enabled: !!expandedId,
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
  const moveMut = useMutation({
    mutationFn: () =>
      apiFetch(`/api/v1/metadata/themes/${moveTarget!.id}/move`, {
        method: "POST",
        body: JSON.stringify({ parentId: moveParentId === NONE ? null : moveParentId }),
      }),
    onSuccess: () => {
      toast.success("主题节点已移动");
      setMoveOpen(false);
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

  const rootItems = roots.data?.items ?? [];
  const childItems = children.data?.items ?? [];
  const isEmpty = !roots.isLoading && rootItems.length === 0;

  return (
    <>
      <ListPageToolbar
        filters={
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">
            点击节点名称展开子级；支持新建、移动与删除叶节点。
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
        {roots.error ? (
          <ErrorBanner message={mapApiError(roots.error)} onRetry={() => void roots.refetch()} />
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
        ) : (
          <div className="overflow-x-auto">
            <Table size="comfortable" wrapperClassName="min-w-[640px] border-0 shadow-none">
              <TableHeader className="bg-gray-50/80 dark:bg-white/[0.02]">
                <TableRow className="hover:bg-transparent">
                  <TableHead>名称</TableHead>
                  <TableHead>编码</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roots.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  </TableRow>
                ) : (
                  rootItems.flatMap((root) => {
                    const expanded = expandedId === root.id;
                    const rows = [
                      <ThemeRow
                        key={root.id}
                        node={root}
                        depth={0}
                        expanded={expanded}
                        onToggle={() => setExpandedId(expanded ? null : root.id)}
                        onCreateChild={() => {
                          setParentForCreate(root.id);
                          setName("");
                          setTermId(NONE);
                          setCreateOpen(true);
                        }}
                        onMove={() => {
                          setMoveTarget(root);
                          setMoveParentId(NONE);
                          setMoveOpen(true);
                        }}
                        onDelete={() => setDeleteTarget(root)}
                      />,
                    ];
                    if (expanded) {
                      if (children.isLoading) {
                        rows.push(
                          <TableRow key={`${root.id}-loading`}>
                            <TableCell colSpan={3} className="pl-10">
                              <Skeleton className="h-5 w-full max-w-md" />
                            </TableCell>
                          </TableRow>,
                        );
                      } else {
                        for (const child of childItems) {
                          rows.push(
                            <ThemeRow
                              key={child.id}
                              node={child}
                              depth={1}
                              onCreateChild={() => {
                                setParentForCreate(child.id);
                                setName("");
                                setTermId(NONE);
                                setCreateOpen(true);
                              }}
                              onMove={() => {
                                setMoveTarget(child);
                                setMoveParentId(NONE);
                                setMoveOpen(true);
                              }}
                              onDelete={() => setDeleteTarget(child)}
                            />,
                          );
                        }
                      }
                    }
                    return rows;
                  })
                )}
              </TableBody>
            </Table>
          </div>
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

      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>移动「{moveTarget?.name}」</DialogTitle>
          </DialogHeader>
          <Select value={moveParentId} onValueChange={setMoveParentId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>根节点</SelectItem>
              {rootItems
                .filter((n) => n.id !== moveTarget?.id)
                .map((n) => (
                  <SelectItem key={n.id} value={n.id}>
                    {n.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMoveOpen(false)}>
              取消
            </Button>
            <Button type="button" variant="primary" disabled={moveMut.isPending} onClick={() => moveMut.mutate()}>
              移动
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

function ThemeRow({
  node,
  depth,
  expanded,
  onToggle,
  onCreateChild,
  onMove,
  onDelete,
}: {
  node: ThemeNode;
  depth: number;
  expanded?: boolean;
  onToggle?: () => void;
  onCreateChild: () => void;
  onMove: () => void;
  onDelete: () => void;
}) {
  const isRoot = depth === 0;

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2" style={{ paddingLeft: depth * 16 }}>
          {isRoot ? (
            <button
              type="button"
              className="inline-flex items-center gap-2 font-medium text-gray-900 hover:text-brand-600 dark:text-white/90 dark:hover:text-brand-400"
              onClick={onToggle}
              aria-expanded={expanded}
            >
              <ChevronRight
                className={cn("size-4 shrink-0 text-gray-400 transition-transform", expanded && "rotate-90")}
                aria-hidden
              />
              {node.name}
            </button>
          ) : (
            <span className="font-medium text-gray-800 dark:text-white/90">{node.name}</span>
          )}
        </div>
      </TableCell>
      <TableCell>
        {node.code ? (
          <code className="rounded-md bg-gray-100 px-1.5 py-0.5 font-mono text-theme-xs text-gray-600 dark:bg-white/10 dark:text-gray-300">
            {node.code}
          </code>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </TableCell>
      <TableCell>
        <RowActions>
          <IconButton variant="ghost" size="sm" aria-label={`新建子节点 ${node.name}`} onClick={onCreateChild}>
            <Plus className="size-4" />
          </IconButton>
          <Button type="button" variant="ghost" size="sm" onClick={onMove}>
            移动
          </Button>
          <IconButton variant="ghost" size="sm" aria-label={`删除主题 ${node.name}`} onClick={onDelete}>
            <Trash2 className="size-4" />
          </IconButton>
        </RowActions>
      </TableCell>
    </TableRow>
  );
}
