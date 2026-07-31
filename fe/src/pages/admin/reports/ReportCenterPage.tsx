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
import { Label } from "@/components/ui/label";
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
import { ReportCenterOverview, ReportCenterOverviewSkeleton } from "./components/ReportCenterOverview";
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

  const headerActions = canManage ? (
    <Button type="button" variant="outline" size="sm" asChild>
      <Link to="/admin/reports/templates">
        <LayoutTemplate className="size-4" aria-hidden />
        管理模板
      </Link>
    </Button>
  ) : undefined;

  return (
    <AdminPageShell
      layout="list"
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

      {isLoading ? (
        <ReportCenterOverviewSkeleton />
      ) : (
        <ReportCenterOverview
          templateCount={templates.length}
          prefabCount={prefabItems.length}
          canManage={canManage}
          defaultReport={
            defaultReportNode ? { id: defaultReportNode.id, name: defaultReportNode.name } : null
          }
          defaultReportStale={Boolean(defaultReportId && !defaultReportNode)}
          defaultLoading={defaultLoading}
        />
      )}

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-stretch">
        <ListPageSection>
          <ListPageToolbar
            filters={
              hasTemplates ? (
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
                  <p className="shrink-0 text-theme-sm font-semibold text-gray-800 dark:text-white/90">
                    授权模板
                  </p>
                  <div className="grid w-full min-w-[200px] max-w-xs flex-1 gap-2 sm:max-w-sm">
                    <Label className="sr-only">搜索报表</Label>
                    <SearchField
                      value={search}
                      onChange={setSearch}
                      placeholder="搜索名称或 Key…"
                      aria-label="搜索报表"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">授权模板</p>
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
                  {hasFilters ? (
                    <span className="ml-1 text-theme-sm tabular-nums text-gray-500 dark:text-gray-400">
                      {filteredTemplates.length} 条
                    </span>
                  ) : null}
                </div>
              ) : undefined
            }
          />

          <ListPageTableFrame className={isEmpty && !isLoading ? "px-0 py-0" : "px-0 py-0"}>
            <DataTable
              loading={isLoading}
              empty={isEmpty}
              lastColumnAlign="right"
              loadingRows={5}
              headers={["报表名称", "格式", "数据", "操作"]}
              rows={templateRows}
              emptyState={{
                icon: hasFilters ? (
                  <Search className="size-7" aria-hidden />
                ) : (
                  <FileBarChart className="size-7" aria-hidden />
                ),
                title: hasFilters ? "无匹配报表" : "暂无授权报表",
                description: hasFilters
                  ? "请调整搜索词或格式筛选。"
                  : "管理员可在「报表模板」中创建；或从右侧运行预制分析。",
                action: hasFilters ? undefined : (
                  <Button type="button" variant="primary" size="sm" asChild>
                    <Link to="/admin/reports">浏览预制报表</Link>
                  </Button>
                ),
              }}
            />
          </ListPageTableFrame>
        </ListPageSection>

        <ListPageSection>
          <ListPageToolbar
            filters={
              <div className="min-w-0">
                <p className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">预制分析</p>
                <p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
                  固定常用项后优先展示
                </p>
              </div>
            }
            actions={
              <Button type="button" variant="ghost" size="sm" asChild>
                <Link to="/admin/reports">全部</Link>
              </Button>
            }
          />
          <ListPageTableFrame className="px-5 py-4">
            {prefabQuery.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100 dark:bg-white/[0.04]" />
                ))}
              </div>
            ) : (
              <ReportCenterPrefabPanel
                items={sortedPrefabItems}
                pinnedKeys={pinnedPrefabs}
                onTogglePin={(key) => setPinnedPrefabs(togglePinnedPrefabKey(key))}
              />
            )}
          </ListPageTableFrame>
        </ListPageSection>
      </div>
    </AdminPageShell>
  );
}
