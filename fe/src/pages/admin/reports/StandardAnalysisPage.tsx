import { useMemo, useState } from "react";
import { Plus, TrendingUp } from "lucide-react";
import { AdminPageShell, AdminPageHeaderIcon } from "@/components/layout/admin-page-shell";
import { ListPageSection } from "@/components/layout/list-page-kit";
import { Button } from "@/components/ui/button";
import { PageErrorBanner } from "@/components/ui/page-error-banner";
import { ListGhostEmptyState } from "@/components/ui/panel-empty-state";
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
import {
  HUB_SEGMENTED_BUTTON_CLASS,
  HUB_SEGMENTED_SHELL_CLASS,
} from "@/components/dashboard/hubFilterUi";
import { matchesCapability, resolveEffectiveCapabilities } from "@/lib/capabilities";
import { mapApiError } from "@/lib/apiError";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { ReportCenterTabNav } from "./components/ReportCenterTabNav";
import { StandardAnalysisConfigForm } from "./components/StandardAnalysisConfigForm";
import { StandardAnalysisPackList } from "./components/StandardAnalysisPackList";
import { StandardAnalysisResultPanel } from "./components/StandardAnalysisResultPanel";
import { STANDARD_WORKBENCH_GRID_CLASS } from "./components/standardAnalysisUi";
import {
  type AnalysisTheme,
  useStandardCompare,
  useStandardRun,
} from "./useStandardAnalysis";
import { useStandardAnalysisEditor } from "./useStandardAnalysisEditor";

function StandardPanelModeSwitch({
  panel,
  canManage,
  onChange,
}: {
  panel: "view" | "settings";
  canManage: boolean;
  onChange: (panel: "view" | "settings") => void;
}) {
  if (!canManage) return null;

  return (
    <div className={cn(HUB_SEGMENTED_SHELL_CLASS, "inline-flex gap-0.5 p-0.5")}>
      {(
        [
          { id: "view" as const, label: "看分析" },
          { id: "settings" as const, label: "包设置" },
        ] as const
      ).map((item) => (
        <button
          key={item.id}
          type="button"
          className={cn(
            HUB_SEGMENTED_BUTTON_CLASS,
            "rounded-md px-3 text-theme-xs font-medium transition-colors",
            panel === item.id
              ? "bg-gray-100 text-gray-900 dark:bg-white/[0.08] dark:text-white"
              : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/[0.04]",
          )}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function StandardAnalysisPage() {
  const { user } = useAuth();
  const caps = resolveEffectiveCapabilities(user);
  const canManage = matchesCapability(caps, "report:manage");
  const editor = useStandardAnalysisEditor();
  const {
    packsQuery,
    packs,
    panel,
    setPanel,
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
  } = editor;

  const [selectedPackKey, setSelectedPackKey] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<AnalysisTheme | null>(null);
  const [viewMode, setViewMode] = useState<"live" | "compare">("live");

  const activePack = useMemo(() => {
    const key = selectedPackKey ?? editingKey ?? packs[0]?.packKey ?? null;
    return packs.find((pack) => pack.packKey === key) ?? packs[0] ?? null;
  }, [editingKey, packs, selectedPackKey]);

  const activeTheme = selectedTheme ?? activePack?.enabledThemes[0] ?? null;
  const showSettings = panel === "settings" && canManage;

  const runQuery = useStandardRun(
    !showSettings && viewMode === "live" ? activePack?.packKey ?? null : null,
    activeTheme,
  );
  const compareQuery = useStandardCompare(
    !showSettings && viewMode === "compare" ? activePack?.packKey ?? null : null,
    activeTheme,
  );

  const handlePanelChange = (next: "view" | "settings") => {
    if (next === "settings" && activePack) {
      selectPack(activePack.packKey);
    }
    setPanel(next);
  };

  const handleSelectPack = (key: string) => {
    setSelectedPackKey(key);
    setSelectedTheme(null);
    if (panel === "settings") {
      selectPack(key);
    }
  };

  return (
    <AdminPageShell
      layout="list"
      icon={
        <AdminPageHeaderIcon>
          <TrendingUp className="size-6" aria-hidden />
        </AdminPageHeaderIcon>
      }
      title="标准分析"
      description="面向业务对象的决策分析：查看现状并与上期快照对比。"
      actions={
        canManage ? (
          <Button type="button" variant="outline" size="sm" onClick={startCreate}>
            <Plus className="size-4" aria-hidden />
            新建分析包
          </Button>
        ) : null
      }
    >
      <ReportCenterTabNav />
      {packs.length === 0 && !packsQuery.isLoading ? (
        <ListGhostEmptyState
          title="暂无分析包"
          description={canManage ? "点击「新建分析包」创建第一个标准分析包。" : "请联系管理员配置标准分析包。"}
          action={
            canManage ? (
              <Button size="sm" type="button" onClick={startCreate}>
                新建分析包
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ListPageSection className="min-h-0 flex-1">
          {packsQuery.isError ? (
            <div className="shrink-0 border-b border-gray-100 px-5 py-3 dark:border-white/[0.06]">
              <PageErrorBanner message={mapApiError(packsQuery.error)} onRetry={() => packsQuery.refetch()} />
            </div>
          ) : null}

          <div className="border-b border-gray-200 px-4 py-3 xl:hidden dark:border-gray-800">
            <Select
              value={showSettings && isCreating ? "__create__" : activePack?.packKey ?? ""}
              onValueChange={(value) => {
                if (value === "__create__") {
                  startCreate();
                  return;
                }
                handleSelectPack(value);
              }}
            >
              <SelectTrigger aria-label="选择分析包" className="h-11">
                <SelectValue placeholder="选择分析包" />
              </SelectTrigger>
              <SelectContent>
                {canManage ? <SelectItem value="__create__">新建分析包</SelectItem> : null}
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
                activePackKey={showSettings ? activePackKey : activePack?.packKey ?? null}
                isLoading={packsQuery.isLoading}
                onSelect={handleSelectPack}
                emptyHint="暂无分析包"
                headerAction={
                  canManage ? (
                    <Button type="button" variant="outline" size="sm" className="h-8 px-2.5" onClick={startCreate}>
                      <Plus className="size-4" aria-hidden />
                      新建
                    </Button>
                  ) : undefined
                }
              />
            </div>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <div className="shrink-0 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
                <StandardPanelModeSwitch panel={panel} canManage={canManage} onChange={handlePanelChange} />
              </div>

              {showSettings ? (
                <StandardAnalysisConfigForm
                  draft={draft}
                  isCreating={isCreating}
                  editingKey={editingKey}
                  columnOptions={columnOptions}
                  saving={upsert.isPending}
                  deleting={remove.isPending}
                  onChange={(updater) => setDraft((current) => updater(current))}
                  onSave={() => void onSave()}
                  onDelete={() => setDeleteOpen(true)}
                />
              ) : activePack && activeTheme ? (
                <StandardAnalysisResultPanel
                  pack={activePack}
                  activeTheme={activeTheme}
                  viewMode={viewMode}
                  onThemeChange={setSelectedTheme}
                  onViewModeChange={setViewMode}
                  runQuery={runQuery}
                  compareQuery={compareQuery}
                  mapError={mapApiError}
                />
              ) : null}
            </div>
          </div>
        </ListPageSection>
      )}

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
