import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, Plus } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { ListPageSection } from "@/components/layout/list-page-kit";
import { Button } from "@/components/ui/button";
import { PageErrorBanner } from "@/components/ui/page-error-banner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";
import { type AnalysisPack, useStandardPackMutations, useStandardPacks } from "./useStandardAnalysis";
import { StandardAnalysisConfigForm } from "./components/StandardAnalysisConfigForm";
import { StandardAnalysisPackList } from "./components/StandardAnalysisPackList";
import {
  createEmptyAnalysisPack,
  STANDARD_WORKBENCH_GRID_CLASS,
} from "./components/standardAnalysisUi";

type PhysicalTable = {
  tableFqn: string;
  displayName: string;
  dataSourceId: string;
};

export function StandardAnalysisConfigPage() {
  const packsQuery = useStandardPacks();
  const packs = packsQuery.data?.items ?? [];
  const { upsert, remove } = useStandardPackMutations();
  const [draft, setDraft] = useState<AnalysisPack>(createEmptyAnalysisPack());
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);

  const physicalQuery = useQuery({
    queryKey: queryKeys.metadata.physicalTables(draft.businessObjectCode || undefined),
    queryFn: () =>
      apiFetch<{ items: PhysicalTable[] }>(
        `/api/v1/metadata/physical-tables?entityTypeCode=${encodeURIComponent(draft.businessObjectCode)}&limit=50`,
      ),
    enabled: Boolean(draft.businessObjectCode),
  });

  useEffect(() => {
    if (bootstrapped || isCreating || editingKey || packs.length === 0) return;
    setDraft(packs[0]);
    setEditingKey(packs[0].packKey);
    setBootstrapped(true);
  }, [bootstrapped, editingKey, isCreating, packs]);

  const activePackKey = isCreating ? null : editingKey;

  const selectPack = (packKey: string) => {
    const pack = packs.find((item) => item.packKey === packKey);
    if (!pack) return;
    setIsCreating(false);
    setEditingKey(pack.packKey);
    setDraft(pack);
  };

  const startCreate = () => {
    setIsCreating(true);
    setEditingKey(null);
    setDraft(createEmptyAnalysisPack());
  };

  const onSelectTable = (fqn: string) => {
    const table = physicalQuery.data?.items.find((item) => item.tableFqn === fqn);
    setDraft((current) => ({
      ...current,
      physicalTableFqn: fqn,
      dataSourceId: table?.dataSourceId ?? current.dataSourceId,
    }));
  };

  const onSave = async () => {
    if (!draft.packKey.trim()) {
      toast.error("请填写分析包标识");
      return;
    }
    if (!draft.displayName.trim()) {
      toast.error("请填写显示名称");
      return;
    }
    if (!draft.businessObjectCode.trim()) {
      toast.error("请填写业务对象代码");
      return;
    }
    if (!draft.physicalTableFqn) {
      toast.error("请选择物理表");
      return;
    }
    if (draft.enabledThemes.length === 0) {
      toast.error("请至少启用一个分析主题");
      return;
    }

    try {
      await upsert.mutateAsync({ packKey: draft.packKey, body: draft });
      setEditingKey(draft.packKey);
      setIsCreating(false);
      setBootstrapped(true);
      toast.success("分析包已保存");
    } catch (err) {
      toast.error(mapApiError(err));
    }
  };

  const onDelete = async () => {
    if (!editingKey) return;
    try {
      await remove.mutateAsync(editingKey);
      setDeleteOpen(false);
      const remaining = packs.filter((pack) => pack.packKey !== editingKey);
      if (remaining[0]) {
        selectPack(remaining[0].packKey);
      } else {
        startCreate();
      }
      toast.success("分析包已删除");
    } catch (err) {
      toast.error(mapApiError(err));
    }
  };

  return (
    <AdminPageShell
      layout="list"
      title="标准分析配置"
      description="绑定业务对象与物理表，启用分析主题并设置快照周期。"
      leadingActions={
        <Button type="button" variant="outline" size="sm" className="h-10" asChild>
          <Link to="/admin/reports/standard">
            <ArrowLeft className="size-4" aria-hidden />
            返回工作台
          </Link>
        </Button>
      }
    >
      {packsQuery.isError ? (
        <PageErrorBanner message={mapApiError(packsQuery.error)} onRetry={() => packsQuery.refetch()} />
      ) : null}

      <ListPageSection className="min-h-0 flex-1">
        <div className="border-b border-gray-200 px-4 py-3 lg:hidden dark:border-gray-800">
          <Select
            value={isCreating ? "__create__" : editingKey ?? ""}
            onValueChange={(value) => {
              if (value === "__create__") {
                startCreate();
                return;
              }
              selectPack(value);
            }}
          >
            <SelectTrigger aria-label="选择分析包" className="h-11">
              <SelectValue placeholder="选择分析包" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__create__">新建分析包</SelectItem>
              {packs.map((pack) => (
                <SelectItem key={pack.packKey} value={pack.packKey}>
                  {pack.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className={STANDARD_WORKBENCH_GRID_CLASS}>
          <div className="hidden min-h-0 lg:flex">
            <StandardAnalysisPackList
              packs={packs}
              activePackKey={activePackKey}
              isLoading={packsQuery.isLoading}
              onSelect={selectPack}
              emptyHint="暂无分析包，点击右侧新建"
              headerAction={
                <Button type="button" variant="outline" size="sm" className="h-8 px-2.5" onClick={startCreate}>
                  <Plus className="size-4" aria-hidden />
                  新建
                </Button>
              }
            />
          </div>

          <StandardAnalysisConfigForm
            draft={draft}
            isCreating={isCreating}
            editingKey={editingKey}
            physicalTables={physicalQuery.data?.items ?? []}
            physicalLoading={physicalQuery.isLoading}
            saving={upsert.isPending}
            deleting={remove.isPending}
            onChange={(updater) => setDraft((current) => updater(current))}
            onSelectTable={onSelectTable}
            onSave={() => void onSave()}
            onDelete={() => setDeleteOpen(true)}
          />
        </div>
      </ListPageSection>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除分析包？</AlertDialogTitle>
            <AlertDialogDescription>
              将删除「{draft.displayName || editingKey}」及其快照配置，此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>取消</AlertDialogCancel>
            <AlertDialogAction disabled={remove.isPending} onClick={() => void onDelete()}>
              {remove.isPending ? "删除中…" : "删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminPageShell>
  );
}
