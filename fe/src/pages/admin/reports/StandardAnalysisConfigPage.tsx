import { Link, useSearchParams } from "react-router";
import { ArrowLeft, Plus } from "lucide-react";
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
import { mapApiError } from "@/lib/apiError";
import { StandardAnalysisConfigForm } from "./components/StandardAnalysisConfigForm";
import { StandardAnalysisPackList } from "./components/StandardAnalysisPackList";
import { STANDARD_WORKBENCH_GRID_CLASS } from "./components/standardAnalysisUi";
import { useStandardAnalysisEditor } from "./useStandardAnalysisEditor";

export function StandardAnalysisConfigPage() {
  const editor = useStandardAnalysisEditor();
  const {
    packsQuery,
    packs,
    draft,
    setDraft,
    editingKey,
    isCreating,
    activePackKey,
    columnOptions,
    deleteOpen,
    setDeleteOpen,
    selectPack,
    startCreate,
    onSave,
    onDelete,
    upsert,
    remove,
    showSavedHint,
    setShowSavedHint,
  } = editor;

  return (
    <AdminPageShell
      layout="list"
      title="标准分析配置"
      description="绑定数据集、映射字段、设置周期快照与可选定时投递。"
      leadingActions={
        <Button type="button" variant="outline" size="sm" className="h-10" asChild>
          <Link to="/admin/reports/standard">
            <ArrowLeft className="size-4" aria-hidden />
            返回标准分析
          </Link>
        </Button>
      }
    >
      {packsQuery.isError ? (
        <PageErrorBanner message={mapApiError(packsQuery.error)} onRetry={() => packsQuery.refetch()} />
      ) : null}

      <ListPageSection className="min-h-0 flex-1">
        <div className="border-b border-gray-200 px-4 py-3 xl:hidden dark:border-gray-800">
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
          <div className="hidden min-h-0 min-w-0 overflow-hidden xl:flex">
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

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <StandardAnalysisConfigForm
              draft={draft}
              isCreating={isCreating}
              editingKey={editingKey}
              columnOptions={columnOptions}
              saving={upsert.isPending}
              deleting={remove.isPending}
              showSavedHint={showSavedHint}
              onDismissSavedHint={() => setShowSavedHint(false)}
              onChange={(updater) => setDraft((current) => updater(current))}
              onSave={() => void onSave()}
              onDelete={() => setDeleteOpen(true)}
            />
          </div>
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
