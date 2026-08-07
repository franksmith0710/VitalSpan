import { BarChart3, Database, Lock, MousePointerClick, Play, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PanelEmptyState } from "@/components/ui/panel-empty-state";
import { PageErrorBanner } from "@/components/ui/page-error-banner";
import { mapApiError } from "@/lib/apiError";
import { ApiRequestError } from "@/lib/api";
import { PrefabBindingForm } from "./PrefabBindingForm";
import { ReportExportCard } from "./ReportExportCard";
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

type Props = {
  binding: PrefabBinding | null;
  canManage: boolean;
  runningKey: string | null;
  onRun: (bindingKey: string) => void;
  runMutation: RunMutation;
  lastRunBindingRef: React.MutableRefObject<string | null>;
  bindingFromUrl: string | null;
};

export function PrefabReportDetailPanel({
  binding,
  canManage,
  runningKey,
  onRun,
  runMutation,
  lastRunBindingRef,
  bindingFromUrl,
}: Props) {
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
              description="当前绑定下的分析结果摘要，完整导出请使用下方导出区。"
              icon={BarChart3}
            >
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
                <ReportResultTable columns={section.columns} rows={section.rows} />
              </div>
              {canManage ? (
                <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
                  <ReportExportCard embedded showTemplateIdField disabled={!section} />
                </div>
              ) : null}
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
          <PrefabBindingForm binding={binding} />
        </div>
      </TemplatePanelSection>
    </TemplateTabShell>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <TemplatePanelHeader
        title={binding.displayName}
        kindLabel={analysisLabel(binding.analysisType)}
        templateKey={binding.bindingKey}
        icon={BarChart3}
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4 md:p-6">
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
    </div>
  );
}
