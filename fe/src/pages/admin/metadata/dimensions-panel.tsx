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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";
import { ErrorBanner, MetaDataTable } from "./metadata-shared";

type Dimension = { id: string; code: string; name: string; status: string; themeNodeId?: string | null };
type ThemeNode = { id: string; name: string };
const NONE = "__none__";

export function DimensionsPanel({ prefix }: { prefix: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [valuesOpen, setValuesOpen] = useState(false);
  const [editing, setEditing] = useState<Dimension | null>(null);
  const [valuesTarget, setValuesTarget] = useState<Dimension | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [themeNodeId, setThemeNodeId] = useState(NONE);
  const [valuesText, setValuesText] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Dimension | null>(null);

  const query = useQuery({
    queryKey: queryKeys.metadataHub.dimensions({ codePrefix: prefix || undefined }),
    queryFn: () => {
      const q = new URLSearchParams({ limit: "100", offset: "0" });
      if (prefix.trim()) q.set("code_prefix", prefix.trim());
      return apiFetch<{ items: Dimension[] }>(`/api/v1/metadata/dimensions?${q}`);
    },
  });
  const themes = useQuery({
    queryKey: queryKeys.metadataHub.themes("null"),
    queryFn: () => apiFetch<{ items: ThemeNode[] }>("/api/v1/metadata/themes?parent_id=null&limit=100"),
    enabled: open,
  });
  const themeNames = new Map((themes.data?.items ?? []).map((t) => [t.id, t.name]));
  const inv = () => void qc.invalidateQueries({ queryKey: ["metadata", "dimensions"] });

  const save = useMutation({
    mutationFn: async () => {
      const theme = themeNodeId === NONE ? null : themeNodeId;
      if (editing) {
        await apiFetch(`/api/v1/metadata/dimensions/${editing.id}`, {
          method: "PUT", body: JSON.stringify({ name: name.trim(), themeNodeId: theme }),
        });
      } else {
        await apiFetch("/api/v1/metadata/dimensions", {
          method: "POST", body: JSON.stringify({ code: code.trim(), name: name.trim(), ...(theme ? { themeNodeId: theme } : {}) }),
        });
      }
    },
    onSuccess: () => { toast.success(editing ? "维度已更新" : "维度已创建"); setOpen(false); inv(); },
    onError: (e) => toast.error(mapApiError(e)),
  });
  const regValues = useMutation({
    mutationFn: async () => {
      const items = valuesText.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
        const [c, ...r] = l.split(","); return { code: c.trim(), label: (r.join(",") || c).trim() };
      });
      await apiFetch(`/api/v1/metadata/dimensions/${valuesTarget!.id}/values`, { method: "POST", body: JSON.stringify({ items }) });
    },
    onSuccess: () => { toast.success("枚举值已注册"); setValuesOpen(false); },
    onError: (e) => toast.error(mapApiError(e)),
  });
  const del = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/v1/metadata/dimensions/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast.success("维度已删除"); setDeleteTarget(null); inv(); },
    onError: (e) => toast.error(mapApiError(e)),
  });

  return (
    <>
      <div className="flex justify-end">
        <Button type="button" variant="primary" size="sm" onClick={() => { setEditing(null); setCode(""); setName(""); setThemeNodeId(NONE); setOpen(true); }}>
          <Plus className="size-4" aria-hidden />新建维度
        </Button>
      </div>
      {query.error ? <ErrorBanner message={mapApiError(query.error)} onRetry={() => void query.refetch()} /> : (
        <MetaDataTable loading={query.isLoading} empty={(query.data?.items.length ?? 0) === 0}
          headers={["名称", "编码", "主题", "状态", "操作"]}
          rows={(query.data?.items ?? []).map((d) => [d.name, <span key="c" className="font-mono text-theme-xs">{d.code}</span>,
            d.themeNodeId ? (themeNames.get(d.themeNodeId) ?? "—") : "—",
            <Badge key="s" variant="light" color="primary" size="sm">{d.status}</Badge>,
            <div key="a" className="flex gap-2">
              <Button type="button" variant="outline" size="sm" aria-label="编辑维度" onClick={() => { setEditing(d); setCode(d.code); setName(d.name); setThemeNodeId(d.themeNodeId ?? NONE); setOpen(true); }}><Pencil className="size-4" /></Button>
              <Button type="button" variant="outline" size="sm" onClick={() => { setValuesTarget(d); setValuesText(""); setValuesOpen(true); }}>枚举值</Button>
              <Button type="button" variant="outline" size="sm" aria-label="删除维度" onClick={() => setDeleteTarget(d)}><Trash2 className="size-4" /></Button>
            </div>])} />
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "编辑维度" : "新建维度"}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            {!editing ? <div className="grid gap-2"><Label htmlFor="dim-code">编码</Label><Input id="dim-code" value={code} onChange={(e) => setCode(e.target.value)} /></div> : null}
            <div className="grid gap-2"><Label htmlFor="dim-name">名称</Label><Input id="dim-name" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="grid gap-2"><Label>所属主题</Label>
              <Select value={themeNodeId} onValueChange={setThemeNodeId}><SelectTrigger><SelectValue placeholder="可选" /></SelectTrigger>
                <SelectContent><SelectItem value={NONE}>无</SelectItem>{(themes.data?.items ?? []).map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>取消</Button>
            <Button type="button" variant="primary" disabled={save.isPending} onClick={() => save.mutate()}>保存</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={valuesOpen} onOpenChange={setValuesOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>注册枚举值 — {valuesTarget?.name}</DialogTitle></DialogHeader>
          <Textarea value={valuesText} onChange={(e) => setValuesText(e.target.value)} placeholder="open,开启" rows={6} />
          <DialogFooter><Button type="button" variant="outline" onClick={() => setValuesOpen(false)}>取消</Button>
            <Button type="button" variant="primary" disabled={regValues.isPending} onClick={() => regValues.mutate()}>注册</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>确认删除维度？</AlertDialogTitle><AlertDialogDescription>将删除「{deleteTarget?.name}」</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction onClick={() => deleteTarget && del.mutate(deleteTarget.id)}>删除</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
