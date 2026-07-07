import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";
import { ErrorBanner, MetaDataTable } from "./metadata-shared";

type Term = { id: string; code: string; name: string; definition?: string | null; status: string };

export function GlossaryPanel({ prefix }: { prefix: string; onCreateClick?: () => void }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Term | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [definition, setDefinition] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Term | null>(null);

  const query = useQuery({
    queryKey: queryKeys.metadataHub.glossary({ codePrefix: prefix || undefined }),
    queryFn: () => {
      const q = new URLSearchParams({ limit: "100", offset: "0" });
      if (prefix.trim()) q.set("code_prefix", prefix.trim());
      return apiFetch<{ items: Term[] }>(`/api/v1/metadata/glossary?${q}`);
    },
  });
  const inv = () => void qc.invalidateQueries({ queryKey: ["metadata", "glossary"] });

  const save = useMutation({
    mutationFn: async () => {
      if (editing) {
        await apiFetch(`/api/v1/metadata/glossary/${editing.id}`, {
          method: "PUT", body: JSON.stringify({ name: name.trim(), definition: definition.trim() || null }),
        });
      } else {
        await apiFetch("/api/v1/metadata/glossary", {
          method: "POST", body: JSON.stringify({ code: code.trim(), name: name.trim(), definition: definition.trim() || null }),
        });
      }
    },
    onSuccess: () => { toast.success(editing ? "术语已更新" : "术语已创建"); setOpen(false); inv(); },
    onError: (e) => toast.error(mapApiError(e)),
  });
  const del = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/v1/metadata/glossary/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast.success("术语已删除"); setDeleteTarget(null); inv(); },
    onError: (e) => toast.error(mapApiError(e)),
  });

  return (
    <>
      <div className="flex justify-end">
        <Button type="button" variant="primary" size="sm" onClick={() => { setEditing(null); setCode(""); setName(""); setDefinition(""); setOpen(true); }}>
          <Plus className="size-4" aria-hidden />新建术语
        </Button>
      </div>
      {query.error ? <ErrorBanner message={mapApiError(query.error)} onRetry={() => void query.refetch()} /> : (
        <MetaDataTable loading={query.isLoading} empty={(query.data?.items.length ?? 0) === 0}
          headers={["名称", "编码", "状态", "操作"]}
          rows={(query.data?.items ?? []).map((t) => [t.name, <span key="c" className="font-mono text-theme-xs">{t.code}</span>,
            <Badge key="s" variant="light" color="primary" size="sm">{t.status}</Badge>,
            <div key="a" className="flex gap-2">
              <Button type="button" variant="outline" size="sm" aria-label="编辑术语" onClick={() => { setEditing(t); setCode(t.code); setName(t.name); setDefinition(t.definition ?? ""); setOpen(true); }}><Pencil className="size-4" /></Button>
              <Button type="button" variant="outline" size="sm" aria-label="删除术语" onClick={() => setDeleteTarget(t)}><Trash2 className="size-4" /></Button>
            </div>])} />
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "编辑术语" : "新建术语"}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            {!editing ? <div className="grid gap-2"><Label htmlFor="term-code">编码</Label><Input id="term-code" value={code} onChange={(e) => setCode(e.target.value)} /></div> : null}
            <div className="grid gap-2"><Label htmlFor="term-name">名称</Label><Input id="term-name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!name.trim()} /></div>
            <div className="grid gap-2"><Label htmlFor="term-def">定义</Label><Textarea id="term-def" value={definition} onChange={(e) => setDefinition(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>取消</Button>
            <Button type="button" variant="primary" disabled={save.isPending || !name.trim()} onClick={() => save.mutate()}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>确认删除术语？</AlertDialogTitle><AlertDialogDescription>将删除「{deleteTarget?.name}」</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction onClick={() => deleteTarget && del.mutate(deleteTarget.id)}>删除</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
