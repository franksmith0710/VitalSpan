import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { IconButton } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";

type Mapping = { id?: string; tableFqn: string; columnName: string };

export function TermFieldMappingDialog({
  termId,
  termName,
  open,
  onOpenChange,
}: {
  termId: string;
  termName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const [rows, setRows] = useState<Mapping[]>([]);

  useQuery({
    queryKey: ["metadata", "glossary", termId, "field-mappings"],
    queryFn: async () => {
      const data = await apiFetch<{ items: Mapping[] }>(
        `/api/v1/metadata/glossary/${termId}/field-mappings`,
      );
      setRows(data.items.length ? data.items : [{ tableFqn: "", columnName: "" }]);
      return data;
    },
    enabled: open,
  });

  const save = useMutation({
    mutationFn: () =>
      apiFetch(`/api/v1/metadata/glossary/${termId}/field-mappings`, {
        method: "PUT",
        body: JSON.stringify({
          items: rows
            .filter((r) => r.tableFqn.trim() && r.columnName.trim())
            .map((r) => ({ tableFqn: r.tableFqn.trim(), columnName: r.columnName.trim() })),
        }),
      }),
    onSuccess: () => {
      toast.success("物理字段映射已保存");
      void qc.invalidateQueries({ queryKey: ["metadata", "glossary", termId, "field-mappings"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(mapApiError(e)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>物理字段映射 — {termName}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          {rows.map((row, idx) => (
            <div key={idx} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <div className="grid gap-1">
                <Label htmlFor={`fqn-${idx}`}>表 FQN</Label>
                <Input
                  id={`fqn-${idx}`}
                  placeholder="schema.table"
                  value={row.tableFqn}
                  onChange={(e) =>
                    setRows((prev) =>
                      prev.map((r, i) => (i === idx ? { ...r, tableFqn: e.target.value } : r)),
                    )
                  }
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor={`col-${idx}`}>列名</Label>
                <Input
                  id={`col-${idx}`}
                  placeholder="column_name"
                  value={row.columnName}
                  onChange={(e) =>
                    setRows((prev) =>
                      prev.map((r, i) => (i === idx ? { ...r, columnName: e.target.value } : r)),
                    )
                  }
                />
              </div>
              <IconButton
                variant="ghost"
                size="sm"
                aria-label="删除映射行"
                disabled={rows.length <= 1}
                onClick={() => setRows((prev) => prev.filter((_, i) => i !== idx))}
              >
                <Trash2 className="size-4" />
              </IconButton>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() => setRows((prev) => [...prev, { tableFqn: "", columnName: "" }])}
          >
            <Plus className="size-4" aria-hidden />
            添加映射
          </Button>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button type="button" variant="primary" disabled={save.isPending} onClick={() => save.mutate()}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TermFieldMappingButton({
  termId,
  termName,
}: {
  termId: string;
  termName: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <IconButton
        variant="ghost"
        size="sm"
        aria-label={`物理字段映射 ${termName}`}
        onClick={() => setOpen(true)}
      >
        <Link2 className="size-4" />
      </IconButton>
      <TermFieldMappingDialog termId={termId} termName={termName} open={open} onOpenChange={setOpen} />
    </>
  );
}
