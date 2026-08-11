import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import { ChevronDown, ChevronRight, FileBarChart, LayoutTemplate, Search } from "lucide-react";
import { AdminPageShell, AdminPageHeaderIcon } from "@/components/layout/admin-page-shell";
import {
  DataTable,
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
  canRetryReportSchedules,
  DOC_TEMPLATE_PRODUCT_LINE,
  localizeCenterResourceType,
  resolveCenterRecentHref,
} from "@/lib/reportCenterNav";
import { sortStandardByPin } from "@/lib/reportCenterPrefs";
import {
  toggleFavorite,
  useReportCenterPreferenceMutations,
  useReportCenterPreferences,
} from "./useReportCenterPrefs";
import { useAuth } from "@/context/auth-context";
import {
  ReportCenterHeaderActions,
  ReportCenterQuickAside,
  ReportCenterScheduleList,
} from "./components/ReportCenterScheduleHub";
import { ReportCenterStandardPanel } from "./components/ReportCenterStandardPanel";
import { buildReportCenterTemplateRows } from "./components/ReportCenterTemplateTable";
import { ScheduleRecentFailuresPanel } from "./components/ScheduleRecentFailuresPanel";
import { useReportSchedulesList, useReportScheduleMutations } from "./useReportSchedules";

type AnalysisPackSummary = {
  packKey: string;
  displayName: string;
  enabledThemes: string[];
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
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const centerPrefsQuery = useReportCenterPreferences();
  const { saveFavorites } = useReportCenterPreferenceMutations();

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

  const standardQuery = useQuery({
    queryKey: queryKeys.reports.standardPacks,
    queryFn: () =>
      apiFetch<{ items: AnalysisPackSummary[]; total: number }>("/api/v1/reports/standard/packs"),
    enabled: matchesCapability(caps, "report:read"),
  });

  const canManage = matchesCapability(caps, "report:manage");
  const canRetrySchedules = canRetryReportSchedules(caps);
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

  const serverPinnedStandard = useMemo(
    () =>
      (centerPrefsQuery.data?.favorites ?? [])
        .filter((f) => f.resourceType === "standard")
        .map((f) => f.resourceId),
    [centerPrefsQuery.data],
  );
  const effectivePinned = serverPinnedStandard;
  const recentViews = centerPrefsQuery.data?.recent ?? [];
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

  const standardItems = standardQuery.data?.items ?? [];
  const sortedStandardItems = useMemo(
    () => sortStandardByPin(standardItems, effectivePinned),
    [standardItems, effectivePinned],
  );

  const handleTogglePin = (key: string) => {
    const favorites = centerPrefsQuery.data?.favorites ?? effectivePinned.map((id) => ({
      resourceType: "standard",
      resourceId: id,
    }));
    const next = toggleFavorite(favorites, "standard", key);
    void saveFavorites.mutateAsync(next);
  };

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
      title="报表中心"
      icon={
        <AdminPageHeaderIcon>
          <FileBarChart className="size-6" aria-hidden />
        </AdminPageHeaderIcon>
      }
      description="统一工作台：定时报告、标准分析、文档模板与最近访问。"
      actions={headerActions}
    >
      {schedulesQuery.isError ? (
        <PageErrorBanner
          message={mapApiError(schedulesQuery.error)}
          onRetry={() => void schedulesQuery.refetch()}
        />
      ) : null}

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="order-2 min-w-0 space-y-6 xl:order-1">
          <ReportCenterScheduleList
            schedules={schedulesQuery.data?.items ?? []}
            loading={schedulesQuery.isLoading}
            canManage={canManage}
          />

          <ScheduleRecentFailuresPanel
            schedules={schedulesQuery.data?.items ?? []}
            onSelectSchedule={(id) => navigate(`/admin/reports/schedules?tab=all&expand=${id}`)}
            onRetry={
              canRetrySchedules
                ? (executionId, scheduleId) =>
                    void retryExecution.mutateAsync({ executionId, scheduleId })
                : undefined
            }
            retryPending={retryExecution.isPending}
            retryPendingExecutionId={
              retryExecution.isPending ? retryExecution.variables?.executionId : undefined
            }
          />

          {recentViews.length > 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
              <p className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">最近访问</p>
              <ul className="mt-3 space-y-2">
                {recentViews.slice(0, 8).map((item) => (
                  <li key={`${item.resourceType}-${item.resourceId}`}>
                    <Link
                      to={resolveCenterRecentHref(item)}
                      className="flex flex-wrap items-baseline gap-2 rounded-lg px-2 py-1.5 text-theme-xs text-gray-700 transition-colors hover:bg-gray-50 hover:text-brand-600 dark:text-gray-300 dark:hover:bg-white/[0.04] dark:hover:text-brand-400"
                    >
                      <span className="font-medium text-gray-800 dark:text-white/90">
                        {item.resourceLabel || item.resourceId}
                      </span>
                      <span className="text-gray-400">
                        {localizeCenterResourceType(item.resourceType)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <button
            type="button"
            data-testid="report-center-templates-toggle"
            className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-gray-50/80 dark:hover:bg-white/[0.02]"
            onClick={() => setTemplatesOpen((v) => !v)}
            aria-expanded={templatesOpen}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600 dark:bg-white/[0.06] dark:text-gray-400">
              <LayoutTemplate className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
                  文档模板
                </span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-white/[0.06] dark:text-gray-400">
                  文档模板
                </span>
              </span>
              <span className="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400">
                {DOC_TEMPLATE_PRODUCT_LINE}
              </span>
            </span>
            {hasTemplates ? (
              <span className="shrink-0 rounded-lg bg-gray-50 px-2.5 py-1 text-theme-xs tabular-nums text-gray-600 dark:bg-white/[0.04] dark:text-gray-400">
                {templates.length} 个
              </span>
            ) : null}
            {templatesOpen ? (
              <ChevronDown className="size-4 shrink-0 text-gray-400" aria-hidden />
            ) : (
              <ChevronRight className="size-4 shrink-0 text-gray-400" aria-hidden />
            )}
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

        {!standardQuery.isLoading && standardItems.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p
                  className="text-theme-sm font-semibold text-gray-800 dark:text-white/90"
                  data-testid="report-center-standard-heading"
                >
                  标准分析
                </p>
                <p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
                  面向业务对象的决策分析，支持周期快照对比。
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" className="shrink-0" asChild>
                <Link to="/admin/reports/standard">查看全部</Link>
              </Button>
            </div>
            <ReportCenterStandardPanel
              items={sortedStandardItems}
              pinnedKeys={effectivePinned}
              onTogglePin={handleTogglePin}
            />
          </div>
        ) : null}
        </div>

        <div className="order-1 min-w-0 xl:order-2 xl:sticky xl:top-0 xl:self-start">
          <ReportCenterQuickAside
            schedules={schedulesQuery.data?.items ?? []}
            loading={schedulesQuery.isLoading}
            canManage={canManage}
          />
        </div>
      </div>
    </AdminPageShell>
  );
}
