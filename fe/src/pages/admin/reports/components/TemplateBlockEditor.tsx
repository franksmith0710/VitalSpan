import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  ListPageBatchActions,
  ListRowCheckbox,
  useListBatchMode,
} from "@/components/layout/list-batch-delete";
import { useListRowSelection } from "@/hooks/useListRowSelection";
import { useFormDirtyState } from "@/hooks/use-form-dirty-state";
import { useUnsavedLeaveGuard } from "@/hooks/use-unsaved-leave-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { UnsavedLeaveDialog } from "@/components/ui/unsaved-leave-dialog";
import { mapApiError } from "@/lib/apiError";
import { type TemplateBlock, useReportTemplates } from "../useReportTemplates";

type Props = {
  templateKey: string;
  format: "word" | "excel" | "pdf";
  displayName: string;
  readOnly?: boolean;
};

function emptyBlock(): TemplateBlock {
  return { blockType: "sql", queryRef: "SELECT 1" };
}

function serializeBlocks(blocks: TemplateBlock[]): string {
  return JSON.stringify(blocks);
}

export function TemplateBlockEditor({ templateKey, format, displayName, readOnly = false }: Props) {
  const { templateQuery, saveTemplate } = useReportTemplates(null, templateKey);
  const [blocks, setBlocks] = useState<TemplateBlock[]>([]);
  const rowIds = useMemo(() => blocks.map((_, index) => String(index)), [blocks]);
  const selection = useListRowSelection(rowIds);
  const batch = useListBatchMode(selection.clear);
  const { isDirty, isBaselineReady, resetBaseline, markSaved } = useFormDirtyState(
    blocks,
    serializeBlocks,
  );
  const leaveGuardEnabled = !readOnly && isBaselineReady && isDirty;
  const { leaveDialogOpen, confirmLeave, cancelLeave } = useUnsavedLeaveGuard({
    enabled: leaveGuardEnabled,
  });

  useEffect(() => {
    if (templateQuery.data?.blocks) {
      setBlocks(templateQuery.data.blocks);
      resetBaseline(templateQuery.data.blocks);
    }
  }, [templateQuery.data?.blocks, resetBaseline]);

  const saveBlocks = (next: TemplateBlock[], onSuccess?: () => void) => {
    saveTemplate.mutate(
      { templateKey, body: { templateKey, format, displayName, blocks: next } },
      {
        onSuccess: () => {
          markSaved(next);
          setBlocks(next);
          toast.success("模板块已保存");
          onSuccess?.();
        },
        onError: (err) => toast.error(mapApiError(err)),
      },
    );
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    const next = [...blocks];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setBlocks(next);
  };

  const patchBlock = (index: number, patch: Partial<TemplateBlock>) => {
    setBlocks((prev) => prev.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  };

  const removeBlock = (index: number) => {
    if (blocks.length <= 1) {
      toast.error("至少保留一个块");
      return;
    }
    setBlocks(blocks.filter((_, i) => i !== index));
  };

  const removeSelected = () => {
    const indices = new Set([...selection.selectedIds].map(Number));
    const next = blocks.filter((_, i) => !indices.has(i));
    if (next.length === 0) {
      toast.error("至少保留一个块");
      return;
    }
    setBlocks(next);
    selection.clear();
  };

  const addBlock = () => setBlocks([...blocks, emptyBlock()]);

  const handleSave = () => saveBlocks(blocks);

  const handleSaveAndLeave = () => {
    saveBlocks(blocks, () => confirmLeave());
  };

  if (templateQuery.isLoading) {
    return <p className="text-theme-sm text-gray-500">加载模板块…</p>;
  }

  if (templateQuery.isError && blocks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-theme-sm text-gray-500 dark:border-gray-800">
        暂无模板定义，点击下方创建默认块。
        {!readOnly ? (
          <div className="mt-4">
            <Button
              type="button"
              size="sm"
              variant="primary"
              onClick={() => {
                const next = [emptyBlock()];
                setBlocks(next);
                resetBaseline([]);
              }}
            >
              初始化模板块
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!readOnly ? (
        <ListPageBatchActions
          batchMode={batch.batchMode}
          onToggleBatchMode={batch.toggleBatchMode}
          selectedCount={selection.selectedCount}
          entityLabel="个块"
          onClear={selection.clear}
          onDelete={removeSelected}
        />
      ) : null}
      {blocks.map((block, index) => (
        <div key={`${block.blockType}-${index}`} className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {!readOnly && batch.batchMode ? (
              <ListRowCheckbox
                checked={selection.isSelected(String(index))}
                onCheckedChange={() => selection.toggle(String(index))}
                ariaLabel={`选择模板块 ${index + 1}`}
              />
            ) : null}
            <Select
              value={block.blockType}
              onValueChange={(v) =>
                patchBlock(index, {
                  blockType: v as TemplateBlock["blockType"],
                  queryRef: v === "sql" ? block.queryRef ?? "SELECT 1" : undefined,
                  tableRef: v === "table" ? block.tableRef ?? "fact_table" : undefined,
                  chartType: v === "chart" ? block.chartType ?? "bar" : undefined,
                })
              }
              disabled={readOnly}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sql">SQL</SelectItem>
                <SelectItem value="table">表格</SelectItem>
                <SelectItem value="chart">图表</SelectItem>
              </SelectContent>
            </Select>
            {!readOnly ? (
              <>
                <Button type="button" size="icon" variant="outline" aria-label="上移" onClick={() => moveBlock(index, -1)}>
                  <ArrowUp className="size-4" />
                </Button>
                <Button type="button" size="icon" variant="outline" aria-label="下移" onClick={() => moveBlock(index, 1)}>
                  <ArrowDown className="size-4" />
                </Button>
                <Button type="button" size="icon" variant="destructive" aria-label="删除" onClick={() => removeBlock(index)}>
                  <Trash2 className="size-4" />
                </Button>
              </>
            ) : null}
          </div>
          {block.blockType === "sql" ? (
            <div className="grid gap-2">
              <Label>SQL 文本</Label>
              <Textarea
                value={block.queryRef ?? ""}
                onChange={(e) => patchBlock(index, { queryRef: e.target.value })}
                rows={4}
                className="font-mono text-theme-xs"
                disabled={readOnly}
              />
            </div>
          ) : null}
          {block.blockType === "table" ? (
            <div className="grid gap-2">
              <Label>表引用</Label>
              <Input
                value={block.tableRef ?? ""}
                onChange={(e) => patchBlock(index, { tableRef: e.target.value })}
                disabled={readOnly}
              />
            </div>
          ) : null}
          {block.blockType === "chart" ? (
            <div className="grid gap-2">
              <Label>图表类型</Label>
              <Select
                value={block.chartType ?? "bar"}
                onValueChange={(v) => patchBlock(index, { chartType: v as TemplateBlock["chartType"] })}
                disabled={readOnly}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="line">折线</SelectItem>
                  <SelectItem value="bar">柱状</SelectItem>
                  <SelectItem value="pie">饼图</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
      ))}
      {!readOnly ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={addBlock}>
            <Plus className="size-4" aria-hidden />
            添加块
          </Button>
          <Button
            type="button"
            size="sm"
            variant="primary"
            disabled={saveTemplate.isPending || !isDirty}
            onClick={handleSave}
          >
            {saveTemplate.isPending ? "保存中…" : "保存模板块"}
          </Button>
        </div>
      ) : null}
      <UnsavedLeaveDialog
        open={leaveDialogOpen}
        saving={saveTemplate.isPending}
        entityLabel="模板块"
        onStay={cancelLeave}
        onDiscardLeave={confirmLeave}
        onSaveAndLeave={handleSaveAndLeave}
      />
    </div>
  );
}
