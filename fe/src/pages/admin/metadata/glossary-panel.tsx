import { type ReactNode, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  BatchDeleteDialog,
  ListBatchDeleteBar,
  ListHeaderCheckbox,
  ListRowCheckbox,
} from "@/components/layout/list-batch-delete";
import { useListRowSelection } from "@/hooks/useListRowSelection";
import { runBatchDelete } from "@/lib/runBatchDelete";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchField } from "@/components/ui/search-field";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";
import {
  ListPageBody,
  ListPageToolbar,
  MetaDataTable,
  RowActions,
} from "./metadata-shared";
import { TermFieldMappingButton } from "./term-field-mapping-dialog";
import { PageErrorBanner } from "@/components/ui/page-error-banner";

type Term = { id: string; code: string; name: string; definition?: string | null; status: string };

function statusBadge(status: string) {
  const active = status === "active" || status === "published";
  return (
    <Badge variant="light" color={active ? "success" : "light"} size="sm">
      {status}
    </Badge>
  );
}

export function GlossaryPanel({
  prefix,
  onPrefixChange,
  emptyIcon,
}: {
  prefix: string;
  onPrefixChange: (value: string) => void;
  emptyIcon: ReactNode;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Term | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [definition, setDefinition] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Term | null>(null);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);

  const query = useQuery({
    queryKey: queryKeys.metadataHub.glossary({ codePrefix: prefix || undefined }),
    queryFn: () => {
      const q = new URLSearchParams({ limit: "100", offset: "0" });
      if (prefix.trim()) q.set("code_prefix", prefix.trim());
      return apiFetch<{ items: Term[] }>(`/api/v1/metadata/glossary?${q}`);
    },
  });
  const inv = () => void qc.invalidateQueries({ queryKey: ["metadata", "glossary"] });

  const openCreate = () => {
    setEditing(null);
    setCode("");
    setName("");
    setDefinition("");
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (editing) {
        await apiFetch(`/api/v1/metadata/glossary/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify({ name: name.trim(), definition: definition.trim() || null }),
        });
      } else {
        await apiFetch("/api/v1/metadata/glossary", {
          method: "POST",
          body: JSON.stringify({
            code: code.trim(),
            name: name.trim(),
            definition: definition.trim() || null,
          }),
        });
      }
    },
    onSuccess: () => {
      toast.success(editing ? "术语已更新" : "术语已创建");
      setOpen(false);
      inv();
    },
    onError: (e) => toast.error(mapApiError(e)),
  });
  const del = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/v1/metadata/glossary/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("术语已删除");
      setDeleteTarget(null);
      inv();
    },
    onError: (e) => toast.error(mapApiError(e)),
  });

  const items = query.data?.items ?? [];
  const rowIds = useMemo(() => items.map((t) => t.id), [items]);
  const selection = useListRowSelection(rowIds);

  const handleBatchDelete = async () => {
    const ids = [...selection.selectedIds];
    if (ids.length === 0) return;
    setBatchDeleting(true);
    const { ok, failed } = await runBatchDelete(ids, (id) =>
      apiFetch(`/api/v1/metadata/glossary/${id}`, { method: "DELETE" }),
    );
    setBatchDeleting(false);
    setBatchDeleteOpen(false);
    selection.clear();
    inv();
    if (failed === 0) toast.success(`已删除 ${ok} 个术语`);
    else toast.warning(`已删除 ${ok} 个，${failed} 个删除失败`);
  };

  return (
    <>
      <ListPageToolbar
        filters={
          <SearchField
            className="w-full sm:max-w-xs"
            value={prefix}
            onChange={onPrefixChange}
            placeholder="按编码前缀筛选…"
            aria-label="术语编码前缀"
          />
        }
        actions={
          <Button type="button" variant="primary" size="sm" onClick={openCreate}>
            <Plus className="size-4" aria-hidden />
            新建术语
          </Button>
        }
      />
      <ListPageBody className="border-b border-gray-100 py-3 dark:border-white/[0.06]">
        <ListBatchDeleteBar
          selectedCount={selection.selectedCount}
          entityLabel="个术语"
          onClear={selection.clear}
          onDelete={() => setBatchDeleteOpen(true)}
        />
      </ListPageBody>
      <ListPageBody>
        {query.error ? (
          <PageErrorBanner message={mapApiError(query.error)} onRetry={() => void query.refetch()} />
        ) : (
          <MetaDataTable
            loading={query.isLoading}
            empty={items.length === 0}
            lastColumnAlign="right"
            emptyState={{
              icon: emptyIcon,
              title: "暂无术语",
              description: "创建业务术语并维护标准定义，供主题树与维度引用。",
              action: (
                <Button type="button" variant="primary" size="sm" onClick={openCreate}>
                  <Plus className="size-4" aria-hidden />
                  新建术语
                </Button>
              ),
            }}
            headers={[
              <ListHeaderCheckbox
                key="select-all"
                checked={selection.allSelected}
                indeterminate={selection.someSelected}
                disabled={items.length === 0}
                onCheckedChange={() => selection.toggleAll()}
              />,
              "名称",
              "编码",
              "状态",
              "操作",
            ]}
            rows={items.map((t) => [
              <ListRowCheckbox
                key={`${t.id}-select`}
                checked={selection.isSelected(t.id)}
                onCheckedChange={() => selection.toggle(t.id)}
                ariaLabel={`选择术语 ${t.name}`}
              />,
              <span key="n" className="font-medium text-gray-900 dark:text-white/90">
                {t.name}
              </span>,
              <code
                key="c"
                className="rounded-md bg-gray-100 px-1.5 py-0.5 font-mono text-theme-xs text-gray-600 dark:bg-white/10 dark:text-gray-300"
              >
                {t.code}
              </code>,
              statusBadge(t.status),
              <RowActions key="a">
                <TermFieldMappingButton termId={t.id} termName={t.name} />
                <IconButton
                  variant="ghost"
                  size="sm"
                  aria-label={`编辑术语 ${t.name}`}
                  onClick={() => {
                    setEditing(t);
                    setCode(t.code);
                    setName(t.name);
                    setDefinition(t.definition ?? "");
                    setOpen(true);
                  }}
                >
                  <Pencil className="size-4" />
                </IconButton>
                <IconButton
                  variant="ghost"
                  size="sm"
                  aria-label={`删除术语 ${t.name}`}
                  onClick={() => setDeleteTarget(t)}
                >
                  <Trash2 className="size-4" />
                </IconButton>
              </RowActions>,
            ])}
          />
        )}
      </ListPageBody>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "编辑术语" : "新建术语"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            {!editing ? (
              <div className="grid gap-2">
                <Label htmlFor="term-code">编码</Label>
                <Input id="term-code" value={code} onChange={(e) => setCode(e.target.value)} />
              </div>
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor="term-name">名称</Label>
              <Input
                id="term-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={!name.trim()}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="term-def">定义</Label>
              <Textarea id="term-def" value={definition} onChange={(e) => setDefinition(e.target.value)} rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={save.isPending || !name.trim()}
              onClick={() => save.mutate()}
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除术语？</AlertDialogTitle>
            <AlertDialogDescription>将删除「{deleteTarget?.name}」</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && del.mutate(deleteTarget.id)}>
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BatchDeleteDialog
        open={batchDeleteOpen}
        onOpenChange={setBatchDeleteOpen}
        count={selection.selectedCount}
        title="批量删除术语"
        pending={batchDeleting}
        onConfirm={() => void handleBatchDelete()}
      />
    </>
  );
}
