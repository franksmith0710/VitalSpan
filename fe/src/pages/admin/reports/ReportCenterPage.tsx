import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { FileBarChart, LayoutTemplate, Search } from "lucide-react";
import { AdminPageShell, AdminPageHeaderIcon } from "@/components/layout/admin-page-shell";
import {
  DataTable,
  ListPageSection,
  ListPageTableFrame,
  ListPageToolbar,
  PageErrorBanner,
} from "@/components/layout/list-page-kit";
import { Button } from "@/components/ui/button";
import { SearchField } from "@/components/ui/search-field";
import { apiFetch } from "@/lib/api";
import { matchesCapability, resolveEffectiveCapabilities } from "@/lib/capabilities";
import { resolveDefaultReportTemplateNodeId } from "@/lib/defaultViewResolve";
import { mapApiError } from "@/lib/apiError";
import { fetchAllCatalogTemplates, filterCatalogTemplates } from "@/lib/reportCatalogUtils";
import { queryKeys } from "@/lib/queryKeys";
import type { TemplateReadiness } from "@/lib/reportTemplateReadiness";
import {
  readPinnedPrefabKeys,
  sortPrefabsByPin,
  togglePinnedPrefabKey,
} from "@/lib/reportCenterPrefs";
import { useAuth } from "@/context/auth-context";
import {
  ReportCenterHeaderActions,
  ReportCenterMetrics,
  ReportCenterMetricsSkeleton,
} from "./components/ReportCenterOverview";
import { ReportCenterPrefabPanel } from "./components/ReportCenterPrefabPanel";
import { buildReportCenterTemplateRows } from "./components/ReportCenterTemplateTable";

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
  const { user } = useAuth();
  const caps = resolveEffectiveCapabilities(user);
  const roleCodes = user?.roles ?? [];
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<TemplateKindFilter>("all");
  const [pinnedPrefabs, setPinnedPrefabs] = useState<string[]>(() => readPinnedPrefabKeys());

  const templatesQuery = useQuery({
    queryKey: ["reports", "center", "templates"],
    queryFn: fetchAllCatalogTemplates,
  });

  const prefabQuery = useQuery({
    queryKey: queryKeys.reports.prefabBindings,
    queryFn: () =>
      apiFetch<{ items: PrefabBinding[]; total: number }>("/api/v1/reports/prefab/bindings"),
    enabled: matchesCapability(caps, "report:read"),
  });

  const defaultReportQuery = useQuery({
    queryKey: ["reports", "center", "default-report", roleCodes.join(",")],
    queryFn: () => resolveDefaultReportTemplateNodeId(roleCodes),
    enabled: roleCodes.length > 0,
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

  const defaultReportId = defaultReportQuery.data;
  const defaultReportNode = templates.find((node) => node.id === defaultReportId);
  const defaultLoading =
    defaultReportQuery.isLoading || (Boolean(defaultReportId) && templatesQuery.isLoading);
  const hasTemplates = templates.length > 0;
  const hasFilters = Boolean(search.trim()) || kindFilter !== "all";
  const isLoading = templatesQuery.isLoading;
  const isEmpty = !isLoading && filteredTemplates.length === 0;

  const templateRows = useMemo(
    () => buildReportCenterTemplateRows(filteredTemplates, readinessByNodeId),
    [filteredTemplates, readinessByNodeId],
  );

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      <ReportCenterHeaderActions canManage={canManage} />
      {canManage ? (
        <Button type="button" variant="outline" size="sm" asChild>
          <Link to="/admin/reports/templates">
            <LayoutTemplate className="size-4" aria-hidden />
            管理模板
          </Link>
        </Button>
      ) : null}
    </div>
  );

  return (
    <AdminPageShell
      layout="list"
      className="gap-2 md:gap-2"
      title="全部报表"
      icon={
        <AdminPageHeaderIcon>
          <FileBarChart className="size-6" aria-hidden />
        </AdminPageHeaderIcon>
      }
      description="浏览授权模板、运行预制分析，或打开角色默认报表。"
      actions={headerActions}
    >
      {templatesQuery.isError ? (
        <PageErrorBanner
          message={mapApiError(templatesQuery.error)}
          onRetry={() => void templatesQuery.refetch()}
        />
      ) : null}

      <ListPageSection className="min-h-0 flex-1">
        <ListPageToolbar
          className="py-2.5"
          filters={
            isLoading ? (
              <ReportCenterMetricsSkeleton />
            ) : (
              <ReportCenterMetrics
                templateCount={templates.length}
                prefabCount={prefabItems.length}
                defaultReport={
                  defaultReportNode ? { id: defaultReportNode.id, name: defaultReportNode.name } : null
                }
                defaultReportStale={Boolean(defaultReportId && !defaultReportNode)}
                defaultLoading={defaultLoading}
              />
            )
          }
          actions={
            hasTemplates ? (
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
            ) : null
          }
        />

        {hasTemplates ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-gray-100 bg-gray-50/50 px-4 py-2 dark:border-gray-800 dark:bg-white/[0.02]">
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder="搜索名称或 Key…"
              className="w-full max-w-xs"
              aria-label="搜索报表"
              disabled={isLoading}
            />
            {!isLoading ? (
              <span className="ml-auto text-theme-xs tabular-nums text-gray-500 dark:text-gray-400">
                共 {filteredTemplates.length} 条
              </span>
            ) : null}
          </div>
        ) : null}

        <ListPageTableFrame className="!flex-none shrink-0 overflow-visible p-0">
          <DataTable
            loading={isLoading}
            empty={isEmpty}
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
              title: hasFilters ? "无匹配报表" : "暂无授权报表",
              description: hasFilters
                ? "请调整搜索词或格式筛选。"
                : "管理员可在「报表模板」中创建；或运行下方预制分析。",
              action: hasFilters ? undefined : (
                <Button type="button" variant="primary" size="sm" asChild>
                  <Link to="/admin/reports">浏览预制报表</Link>
                </Button>
              ),
            }}
          />
        </ListPageTableFrame>

        {!prefabQuery.isLoading && prefabItems.length > 0 ? (
          <div className="shrink-0 border-t border-gray-100 px-4 py-2 dark:border-gray-800">
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
