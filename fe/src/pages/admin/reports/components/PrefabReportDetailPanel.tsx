import { useState } from "react";
import { BarChart3, Database, Lock, MousePointerClick, Play, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { PanelEmptyState } from "@/components/ui/panel-empty-state";
import { PageErrorBanner } from "@/components/ui/page-error-banner";
import { mapApiError } from "@/lib/apiError";
import { ApiRequestError } from "@/lib/api";
import { PrefabBindingForm } from "./PrefabBindingForm";
import { PrefabResultExportCard } from "./PrefabResultExportCard";
import { ReportResultTable } from "./ReportResultTable";
import {
  TemplateEmptyState,
  TemplateMetaGrid,
  TemplateMetaItem,
  TemplatePanelHeader,
  TemplatePanelSection,
  TemplateTabShell,
} from "./templatePanelUi";
import type { PrefabBinding, PrefabRunResult } from "../usePrefabReports";
import type { UseMutationResult } from "@tanstack/react-query";

const ANALYSIS_LABELS: Record<string, string> = {
  lifecycle: "生命周期",
  activity: "活跃度",
  trend: "趋势",
  distribution: "分布",
};

function analysisLabel(type: string): string {
  return ANALYSIS_LABELS[type] ?? type;
}

type RunMutation = UseMutationResult<PrefabRunResult, Error, string, unknown>;
type DeleteMutation = UseMutationResult<void, Error, string, unknown>;

type Props = {
  binding: PrefabBinding | null;
  canManage: boolean;
  isCreating?: boolean;
  runningKey: string | null;
  onRun: (bindingKey: string) => void;
  runMutation: RunMutation;
  deleteBinding?: DeleteMutation;
  lastRunBindingRef: React.MutableRefObject<string | null>;
  bindingFromUrl: string | null;
  onCancelCreate?: () => void;
  onBindingSaved?: (bindingKey: string) => void;
  onBindingDeleted?: () => void;
  createDraftKey?: string;
  existingBindingKeys?: string[];
};

export function PrefabReportDetailPanel({
  binding,
  canManage,
  isCreating = false,
  runningKey,
  onRun,
  runMutation,
  deleteBinding,
  lastRunBindingRef,
  bindingFromUrl,
  onCancelCreate,
  onBindingSaved,
  onBindingDeleted,
  createDraftKey,
  existingBindingKeys = [],
}: Props) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (isCreating) {
    return (
      <div className="flex flex-col">
        <TemplatePanelHeader
          title="新建预制绑定"
          kindLabel="配置"
          templateKey="new-binding"
          icon={Settings2}
        />
        <div className="flex flex-col gap-4 p-4 md:p-6">
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">
            填写绑定键、实体类型与分析模型；保存后可在左侧列表运行。实体须已在元数据中注册物理表。
          </p>
          <PrefabBindingForm
            key={createDraftKey}
            suggestedBindingKey={createDraftKey}
            existingKeys={existingBindingKeys}
            onSaved={onBindingSaved}
          />
          <div className="flex justify-end">
            <Button type="button" variant="outline" className="h-11" onClick={onCancelCreate}>
              取消
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!binding) {
    return (
      <TemplateEmptyState
        title="选择预制报表"
        description="从左侧列表选择一项，在此查看运行结果与配置。"
        action={
          <MousePointerClick className="size-8 text-gray-400 dark:text-gray-500" aria-hidden />
        }
      />
    );
  }

  const isRunning = runningKey === binding.bindingKey;
  const section = runMutation.data?.renderSpec.sections[0];
  const runForbidden =
    runMutation.isError &&
    runMutation.error instanceof ApiRequestError &&
    runMutation.error.code === "RPT_PREFAB_RUN_FORBIDDEN";
  const runEntityNotReady =
    runMutation.isError &&
    runMutation.error instanceof ApiRequestError &&
    runMutation.error.code === "RPT_PREFAB_ENTITY_NOT_READY";
  const showRunPanel =
    runMutation.isPending ||
    Boolean(section) ||
    runForbidden ||
    runEntityNotReady ||
    (runMutation.isError && !runForbidden && !runEntityNotReady);

  const handleDelete = () => {
    if (!deleteBinding) return;
    deleteBinding.mutate(binding.bindingKey, {
      onSuccess: () => {
        toast.success("预制绑定已删除");
        setDeleteOpen(false);
        onBindingDeleted?.();
      },
      onError: (err) => toast.error(mapApiError(err)),
    });
  };

  const runTab = (
    <TemplateTabShell>
      {!showRunPanel ? (
        <TemplateEmptyState
          title="尚未运行"
          description="点击右上角「运行分析」拉取数据预览；也可在左侧列表快速运行。"
        />
      ) : (
        <>
          {runForbidden ? (
            <PanelEmptyState
              icon={<Lock className="size-7" aria-hidden />}
              title="无权运行预制报表"
              description="当前账号没有运行该报表的权限，请联系管理员调整角色或绑定范围。"
              variant="framed"
              size="sm"
            />
          ) : null}

          {runEntityNotReady ? (
            <PanelEmptyState
              icon={<Database className="size-7" aria-hidden />}
              title="实体数据尚未就绪"
              description={
                canManage
                  ? "当前实体类型尚无物理表，无法运行预制分析。请在元数据中注册实体表，或联系管理员启用演示数据。"
                  : "当前实体类型的物理表尚未配置，请联系管理员完成元数据注册或启用演示数据。"
              }
              variant="framed"
              size="sm"
            />
          ) : null}

          {runMutation.isError && !runForbidden && !runEntityNotReady ? (
            <PageErrorBanner
              message={mapApiError(runMutation.error)}
              onRetry={() => {
                const key = lastRunBindingRef.current ?? bindingFromUrl;
                if (key) runMutation.mutate(key);
                else runMutation.reset();
              }}
            />
          ) : null}

          {runMutation.isPending ? <Skeleton className="h-[220px] w-full rounded-xl" /> : null}

          {section ? (
            <TemplatePanelSection
              title="数据预览"
              description="当前绑定下的分析结果；可导出为 PDF / Word / Excel。"
              icon={BarChart3}
            >
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
                <ReportResultTable columns={section.columns} rows={section.rows} />
              </div>
              <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
                <PrefabResultExportCard bindingKey={binding.bindingKey} disabled={!section} />
              </div>
            </TemplatePanelSection>
          ) : null}
        </>
      )}
    </TemplateTabShell>
  );

  const configTab = (
    <TemplateTabShell>
      <TemplatePanelSection
        title="绑定配置"
        description="维护实体类型、分析模型与维度映射；修改后将影响 Hub 与运行时。"
        icon={Settings2}
      >
        <TemplateMetaGrid columns={2}>
          <TemplateMetaItem label="绑定键">
            <span className="font-mono text-theme-xs">{binding.bindingKey}</span>
          </TemplateMetaItem>
          <TemplateMetaItem label="分析维度">
            {binding.dimensionCodes.join("、") || "—"}
          </TemplateMetaItem>
        </TemplateMetaGrid>
        <div className="mt-5">
          <PrefabBindingForm binding={binding} existingKeys={existingBindingKeys} onSaved={onBindingSaved} />
        </div>
        {deleteBinding ? (
          <div className="mt-6 flex justify-end border-t border-gray-100 pt-4 dark:border-gray-800">
            <Button
              type="button"
              variant="outline"
              className="h-11 text-error-600 hover:text-error-700 dark:text-error-400"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="size-4" aria-hidden />
              删除绑定
            </Button>
          </div>
        ) : null}
      </TemplatePanelSection>
    </TemplateTabShell>
  );

  return (
    <div className="flex flex-col">
      <TemplatePanelHeader
        title={binding.displayName}
        kindLabel={analysisLabel(binding.analysisType)}
        templateKey={binding.bindingKey}
        icon={BarChart3}
      />
      <div className="flex flex-col p-4 md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-theme-xs text-gray-500 dark:text-gray-400">
            实体类型{" "}
            <span className="font-mono font-medium text-gray-700 dark:text-gray-300">
              {binding.entityTypeCode}
            </span>
          </p>
          <Button
            type="button"
            variant="primary"
            className="h-11"
            disabled={isRunning}
            onClick={() => onRun(binding.bindingKey)}
          >
            <Play className="size-4" aria-hidden />
            {isRunning ? "运行中…" : "运行分析"}
          </Button>
        </div>

        {canManage ? (
          <Tabs defaultValue="result" className="flex min-h-0 flex-1 flex-col">
            <TabsList variant="enclosed" size="sm" className="w-full shrink-0 justify-start">
              <TabsTrigger value="result" variant="enclosed" size="sm">
                运行结果
              </TabsTrigger>
              <TabsTrigger value="config" variant="enclosed" size="sm">
                绑定配置
              </TabsTrigger>
            </TabsList>
            <div className="min-h-0 flex-1 overflow-y-auto pt-5">
              <TabsContent value="result" className="mt-0">
                {runTab}
              </TabsContent>
              <TabsContent value="config" className="mt-0">
                {configTab}
              </TabsContent>
            </div>
          </Tabs>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto">{runTab}</div>
        )}
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除预制绑定？</AlertDialogTitle>
            <AlertDialogDescription>
              将删除「{binding.displayName}」（{binding.bindingKey}）。删除后 Hub 与列表不再显示该项；开发环境重启后内置演示绑定可能重新写入。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-error-600 hover:bg-error-700"
              disabled={deleteBinding?.isPending}
              onClick={(event) => {
                event.preventDefault();
                handleDelete();
              }}
            >
              {deleteBinding?.isPending ? "删除中…" : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
