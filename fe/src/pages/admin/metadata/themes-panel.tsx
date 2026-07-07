import { type ReactNode, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";
import { ErrorBanner } from "./metadata-shared";

type ThemeNode = { id: string; name: string; code: string | null; parentId: string | null };
type Term = { id: string; name: string };

const NONE = "__none__";

export function ThemesPanel() {
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

  const createMut = useMutation({
    mutationFn: () => apiFetch("/api/v1/metadata/themes", {
      method: "POST",
      body: JSON.stringify({
        name: name.trim(),
        ...(parentForCreate ? { parentId: parentForCreate } : {}),
        ...(termId !== NONE ? { termId } : {}),
      }),
    }),
    onSuccess: () => { toast.success("主题节点已创建"); setCreateOpen(false); inv(); },
    onError: (e) => toast.error(mapApiError(e)),
  });
  const moveMut = useMutation({
    mutationFn: () => apiFetch(`/api/v1/metadata/themes/${moveTarget!.id}/move`, {
      method: "POST", body: JSON.stringify({ parentId: moveParentId === NONE ? null : moveParentId }),
    }),
    onSuccess: () => { toast.success("主题节点已移动"); setMoveOpen(false); inv(); },
    onError: (e) => toast.error(mapApiError(e)),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/v1/metadata/themes/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast.success("主题节点已删除"); setDeleteTarget(null); inv(); },
    onError: (e) => toast.error(mapApiError(e)),
  });

  const row = (node: ThemeNode, depth: number): ReactNode => (
    <tr key={node.id} className="border-b border-gray-100 dark:border-gray-800">
      <td className="px-4 py-3 font-medium" style={{ paddingLeft: depth * 16 + 16 }}>
        <button type="button" className="hover:text-brand-500" onClick={() => setExpandedId(expandedId === node.id ? null : node.id)}>{node.name}</button>
      </td>
      <td className="px-4 py-3">{node.code ?? "—"}</td>
      <td className="px-4 py-3">
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" aria-label="新建子节点" onClick={() => { setParentForCreate(node.id); setName(""); setTermId(NONE); setCreateOpen(true); }}><Plus className="size-4" /></Button>
          <Button type="button" variant="outline" size="sm" aria-label="移动主题" onClick={() => { setMoveTarget(node); setMoveParentId(NONE); setMoveOpen(true); }}>移动</Button>
          <Button type="button" variant="outline" size="sm" aria-label="删除主题" onClick={() => setDeleteTarget(node)}><Trash2 className="size-4" /></Button>
        </div>
      </td>
    </tr>
  );

  const rows: ReactNode[] = [];
  for (const root of roots.data?.items ?? []) {
    rows.push(row(root, 0));
    if (expandedId === root.id) for (const c of children.data?.items ?? []) rows.push(row(c, 1));
  }

  return (
    <>
      <div className="flex justify-end">
        <Button type="button" variant="primary" size="sm" onClick={() => { setParentForCreate(null); setName(""); setTermId(NONE); setCreateOpen(true); }}>
          <Plus className="size-4" aria-hidden />新建根节点
        </Button>
      </div>
      {roots.error ? <ErrorBanner message={mapApiError(roots.error)} onRetry={() => void roots.refetch()} /> : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
          <table className="min-w-[640px] w-full text-left text-theme-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
              <tr><th className="px-4 py-3 font-medium text-gray-600">名称</th><th className="px-4 py-3 font-medium text-gray-600">编码</th><th className="px-4 py-3 font-medium text-gray-600">操作</th></tr>
            </thead>
            <tbody>
              {roots.isLoading ? <tr><td colSpan={3} className="px-4 py-3"><Skeleton className="h-6 w-full" /></td></tr>
                : rows.length === 0 ? <tr><td colSpan={3} className="px-4 py-10 text-center text-gray-500">暂无主题节点</td></tr> : rows}
            </tbody>
          </table>
        </div>
      )}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{parentForCreate ? "新建子节点" : "新建根节点"}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2"><Label htmlFor="theme-name">名称</Label><Input id="theme-name" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="grid gap-2"><Label>关联术语</Label>
              <Select value={termId} onValueChange={setTermId}><SelectTrigger><SelectValue placeholder="可选" /></SelectTrigger>
                <SelectContent><SelectItem value={NONE}>无</SelectItem>{(terms.data?.items ?? []).map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
            <Button type="button" variant="primary" disabled={!name.trim() || createMut.isPending} onClick={() => createMut.mutate()}>创建</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>移动「{moveTarget?.name}」</DialogTitle></DialogHeader>
          <Select value={moveParentId} onValueChange={setMoveParentId}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value={NONE}>根节点</SelectItem>{(roots.data?.items ?? []).filter((n) => n.id !== moveTarget?.id).map((n) => <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>)}</SelectContent>
          </Select>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setMoveOpen(false)}>取消</Button>
            <Button type="button" variant="primary" disabled={moveMut.isPending} onClick={() => moveMut.mutate()}>移动</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>确认删除主题节点？</AlertDialogTitle>
          <AlertDialogDescription>将删除「{deleteTarget?.name}」，仅叶节点可删除。</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction onClick={() => deleteTarget && delMut.mutate(deleteTarget.id)}>删除</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
