import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import { ChevronDown, ChevronRight, FileBarChart, LayoutTemplate, Search } from "lucide-react";
import { AdminPageShell, AdminPageHeaderIcon } from "@/components/layout/admin-page-shell";
import {
  DataTable,
  ListPageSection,
  ListPageTableFrame,
  PageErrorBanner,
} from "@/components/layout/list-page-kit";
import { Button } from "@/components/ui/button";
import { SearchField } from "@/components/ui/search-field";
import { apiFetch } from "@/lib/api";
import { matchesCapability, resolveEffectiveCapabilities } from "@/lib/capabilities";
import { mapApiError } from "@/lib/apiError";
import { fetchAllCatalogNodes, fetchAllCatalogTemplates, filterCatalogTemplates } from "@/lib/reportCatalogUtils";
import { queryKeys } from "@/lib/queryKeys";
import type { TemplateReadiness } from "@/lib/reportTemplateReadiness";
import {
  readPinnedPrefabKeys,
  sortPrefabsByPin,
  togglePinnedPrefabKey,
} from "@/lib/reportCenterPrefs";
import { useAuth } from "@/context/auth-context";
import { ReportCenterHeaderActions, ReportCenterScheduleHub } from "./components/ReportCenterScheduleHub";
import { ReportCenterPrefabPanel } from "./components/ReportCenterPrefabPanel";
import { buildReportCenterTemplateRows } from "./components/ReportCenterTemplateTable";
import { ScheduleRecentFailuresPanel } from "./components/ScheduleRecentFailuresPanel";
import { useReportSchedulesList, useReportScheduleMutations } from "./useReportSchedules";

type PrefabBinding = {
  bindingKey: string;
  displayName: string;
  analysisType: string;
};

type TemplateKindFilter = "all" | "word" | "excel" | "pdf";

const KIND_FILTERS: { id: TemplateKindFilter; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "pdf", label: "PDF" },
  { id: "word", label: "Word" },
  { id: "excel", label: "Excel" },
];

export function ReportCenterPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const caps = resolveEffectiveCapabilities(user);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<TemplateKindFilter>("all");
  const [pinnedPrefabs, setPinnedPrefabs] = useState<string[]>(() => readPinnedPrefabKeys());
  const [templatesOpen, setTemplatesOpen] = useState(false);

  const schedulesQuery = useReportSchedulesList();
  const { retryExecution } = useReportScheduleMutations();

  const templatesQuery = useQuery({
    queryKey: ["reports", "center", "templates"],
    queryFn: fetchAllCatalogTemplates,
  });
  const allNodesQuery = useQuery({
    queryKey: queryKeys.reports.catalogAllNodes,
    queryFn: fetchAllCatalogNodes,
  });

  const prefabQuery = useQuery({
    queryKey: queryKeys.reports.prefabBindings,
    queryFn: () =>
      apiFetch<{ items: PrefabBinding[]; total: number }>("/api/v1/reports/prefab/bindings"),
    enabled: matchesCapability(caps, "report:read"),
  });

  const canManage = matchesCapability(caps, "report:manage");
  const templates = templatesQuery.data ?? [];
  const templateIdsKey = templates.map((node) => node.id).join(",");
  const readinessQuery = useQuery({
    queryKey: ["reports", "template-readiness", templateIdsKey],
    queryFn: () =>
      apiFetch<{ items: { nodeId: string; readiness: TemplateReadiness }[] }>(
        "/api/v1/reports/catalog/templates/readiness",
        {
          method: "POST",
          body: JSON.stringify({ nodeIds: templates.map((node) => node.id) }),
        },
      ),
    enabled: templates.length > 0,
  });
  const readinessByNodeId = useMemo(() => {
    const map = new Map<string, TemplateReadiness>();
    for (const item of readinessQuery.data?.items ?? []) {
      map.set(item.nodeId, item.readiness);
    }
    return map;
  }, [readinessQuery.data]);

  const prefabItems = prefabQuery.data?.items ?? [];
  const sortedPrefabItems = useMemo(
    () => sortPrefabsByPin(prefabItems, pinnedPrefabs),
    [prefabItems, pinnedPrefabs],
  );
  const filteredTemplates = useMemo(
    () => filterCatalogTemplates(templates, search, kindFilter),
    [templates, search, kindFilter],
  );

  const hasTemplates = templates.length > 0;
  const hasFilters = Boolean(search.trim()) || kindFilter !== "all";
  const isLoadingTemplates = templatesQuery.isLoading;
  const isEmptyTemplates = !isLoadingTemplates && filteredTemplates.length === 0;

  const templateRows = useMemo(
    () => buildReportCenterTemplateRows(filteredTemplates, readinessByNodeId, allNodesQuery.data ?? []),
    [filteredTemplates, readinessByNodeId, allNodesQuery.data],
  );

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      <ReportCenterHeaderActions canManage={canManage} />
      {canManage ? (
        <Button type="button" variant="ghost" size="sm" asChild>
          <Link to="/admin/reports/templates">
            <LayoutTemplate className="size-4" aria-hidden />
            文档模板
          </Link>
        </Button>
      ) : null}
    </div>
  );

  return (
    <AdminPageShell
      layout="list"
      className="gap-2 md:gap-2"
      title="报表中心"
      icon={
        <AdminPageHeaderIcon>
          <FileBarChart className="size-6" aria-hidden />
        </AdminPageHeaderIcon>
      }
      description="管理看板/大屏定时 PDF 报告，查看执行记录与失败重试。文档型模板为后续固定版式能力。"
      actions={headerActions}
    >
      {schedulesQuery.isError ? (
        <PageErrorBanner
          message={mapApiError(schedulesQuery.error)}
          onRetry={() => void schedulesQuery.refetch()}
        />
      ) : null}

      <ListPageSection className="min-h-0 flex-1 space-y-4">
        <ReportCenterScheduleHub
          schedules={schedulesQuery.data?.items ?? []}
          loading={schedulesQuery.isLoading}
          canManage={canManage}
        />

        <ScheduleRecentFailuresPanel
          schedules={schedulesQuery.data?.items ?? []}
          onSelectSchedule={(id) => navigate(`/admin/reports/schedules?tab=all&expand=${id}`)}
          onRetry={(executionId, scheduleId) =>
            void retryExecution.mutateAsync({ executionId, scheduleId })
          }
          retryPending={retryExecution.isPending}
          retryPendingExecutionId={
            retryExecution.isPending ? retryExecution.variables?.executionId : undefined
          }
        />

        <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-4 py-3 text-left"
            onClick={() => setTemplatesOpen((v) => !v)}
            aria-expanded={templatesOpen}
          >
            {templatesOpen ? (
              <ChevronDown className="size-4 text-gray-400" aria-hidden />
            ) : (
              <ChevronRight className="size-4 text-gray-400" aria-hidden />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
                文档模板（后续能力）
              </p>
              <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                Word/Excel 固定版式报表，非当前默认定时报告主路径。
              </p>
            </div>
            {hasTemplates ? (
              <span className="text-theme-xs tabular-nums text-gray-400">{templates.length} 个</span>
            ) : null}
          </button>

          {templatesOpen ? (
            <div className="border-t border-gray-100 dark:border-gray-800">
              {templatesQuery.isError ? (
                <div className="p-4">
                  <PageErrorBanner
                    message={mapApiError(templatesQuery.error)}
                    onRetry={() => void templatesQuery.refetch()}
                  />
                </div>
              ) : null}

              {hasTemplates ? (
                <>
                  <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 bg-gray-50/50 px-4 py-2 dark:border-gray-800 dark:bg-white/[0.02]">
                    <SearchField
                      value={search}
                      onChange={setSearch}
                      placeholder="搜索名称或 Key…"
                      className="w-full max-w-xs"
                      aria-label="搜索文档模板"
                      disabled={isLoadingTemplates}
                    />
                    <div className="flex flex-wrap items-center gap-1.5">
                      {KIND_FILTERS.map((item) => (
                        <Button
                          key={item.id}
                          type="button"
                          size="sm"
                          variant={kindFilter === item.id ? "primary" : "outline"}
                          onClick={() => setKindFilter(item.id)}
                        >
                          {item.label}
                        </Button>
                      ))}
                    </div>
                    {!isLoadingTemplates ? (
                      <span className="ml-auto text-theme-xs tabular-nums text-gray-500 dark:text-gray-400">
                        共 {filteredTemplates.length} 条
                      </span>
                    ) : null}
                  </div>
                  <ListPageTableFrame className="!flex-none shrink-0 overflow-visible p-0">
                    <DataTable
                      loading={isLoadingTemplates}
                      empty={isEmptyTemplates}
                      size="compact"
                      lastColumnAlign="right"
                      loadingRows={2}
                      headers={["报表名称", "格式", "数据", "操作"]}
                      rows={templateRows}
                      emptyState={{
                        icon: hasFilters ? (
                          <Search className="size-6" aria-hidden />
                        ) : (
                          <FileBarChart className="size-6" aria-hidden />
                        ),
                        layout: "table",
                        density: "compact",
                        rows: 2,
                        title: hasFilters ? "无匹配模板" : "暂无文档模板",
                        description: hasFilters
                          ? "请调整搜索词或格式筛选。"
                          : "管理员可在「文档模板」中维护固定版式报表目录。",
                        action: hasFilters ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSearch("");
                              setKindFilter("all");
                            }}
                          >
                            清除筛选
                          </Button>
                        ) : undefined,
                      }}
                    />
                  </ListPageTableFrame>
                </>
              ) : !isLoadingTemplates ? (
                <p className="px-4 py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400">
                  暂无文档模板。当前主路径为看板/大屏定时 PDF 报告。
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        {!prefabQuery.isLoading && prefabItems.length > 0 ? (
          <div className="shrink-0 rounded-2xl border border-gray-200 px-4 py-3 dark:border-gray-800">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p
                className="text-theme-sm font-semibold text-gray-800 dark:text-white/90"
                data-testid="report-center-prefab-heading"
              >
                预制分析
              </p>
              <Button type="button" variant="ghost" size="sm" asChild>
                <Link to="/admin/reports">全部</Link>
              </Button>
            </div>
            <ReportCenterPrefabPanel
              items={sortedPrefabItems}
              pinnedKeys={pinnedPrefabs}
              onTogglePin={(key) => setPinnedPrefabs(togglePinnedPrefabKey(key))}
            />
          </div>
        ) : null}
      </ListPageSection>
    </AdminPageShell>
  );
}
