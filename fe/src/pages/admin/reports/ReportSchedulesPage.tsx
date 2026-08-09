import { useMemo, useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, LayoutTemplate, Monitor, Search } from "lucide-react";
import { AdminPageShell, AdminPageHeaderIcon } from "@/components/layout/admin-page-shell";
import { Button } from "@/components/ui/button";
import {
  ListPageSection,
  ListPageTableFrame,
  ListPageToolbar,
  PageErrorBanner,
} from "@/components/layout/list-page-kit";
import { PanelEmptyState } from "@/components/ui/panel-empty-state";
import { SearchField } from "@/components/ui/search-field";
import { Skeleton } from "@/components/ui/skeleton";
import { mapApiError } from "@/lib/apiError";
import { describeCron } from "@/lib/scheduleCronWizard";
import { fetchAllCatalogTemplates } from "@/lib/reportCatalogUtils";
import {
  dashboardsListForScheduleCreate,
  filterSchedulesByTab,
  parseScheduleTabParam,
  summarizeRecipients,
  type ScheduleTabFilter,
} from "@/lib/scheduleSourceMeta";
import { useReportSchedulesList, useReportScheduleMutations } from "./useReportSchedules";
import {
  resolveScheduleSourceLabel,
  ScheduleListTable,
} from "./components/ScheduleListTable";
import { ScheduleRecentFailuresPanel } from "./components/ScheduleRecentFailuresPanel";
import {
  SchedulePageOverview,
  SchedulePageOverviewSkeleton,
} from "./components/SchedulePageOverview";
import { DOC_TEMPLATE_SCHEDULE_HINT } from "@/lib/reportCenterNav";

const TAB_OPTIONS: { id: ScheduleTabFilter; label: string }[] = [
  { id: "dashboard", label: "看板/大屏" },
  { id: "all", label: "全部" },
  { id: "template", label: "文档模板" },
];

function emptyTitle(tab: ScheduleTabFilter, hasSearch: boolean): string {
  if (hasSearch) return "无匹配调度";
  if (tab === "template") return "暂无模板调度";
  if (tab === "dashboard") return "暂无看板/大屏调度";
  return "暂无调度任务";
}

function emptyDescription(tab: ScheduleTabFilter, hasSearch: boolean): string {
  if (hasSearch) return "请调整搜索词，或切换上方分类筛选。";
  if (tab === "template") {
    return DOC_TEMPLATE_SCHEDULE_HINT;
  }
  if (tab === "dashboard") {
    return "进入看板或数据大屏编辑页，点击「定时推送」创建定时报告。";
  }
  return "推荐从看板/大屏编辑页「定时推送」创建可视化 PDF 定时报告。";
}

function emptyAction(tab: ScheduleTabFilter, hasSearch: boolean) {
  if (hasSearch) return undefined;
  if (tab === "template") {
    return (
      <Button type="button" variant="outline" size="sm" asChild>
        <Link to="/admin/reports/templates">
          <LayoutTemplate className="size-3.5" aria-hidden />
          前往文档模板
        </Link>
      </Button>
    );
  }
  if (tab === "dashboard") {
    return (
      <Button type="button" variant="primary" size="sm" asChild>
        <Link to={dashboardsListForScheduleCreate()}>
          <Monitor className="size-3.5" aria-hidden />
          前往看板列表
        </Link>
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap justify-center gap-2">
      <Button type="button" variant="primary" size="sm" asChild>
        <Link to={dashboardsListForScheduleCreate()}>从看板创建</Link>
      </Button>
      <Button type="button" variant="outline" size="sm" asChild>
        <Link to="/admin/reports/templates">从文档模板创建</Link>
      </Button>
    </div>
  );
}

function matchesSearch(
  schedule: Parameters<typeof resolveScheduleSourceLabel>[0],
  nameByNodeId: Map<string, string>,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const label = resolveScheduleSourceLabel(schedule, nameByNodeId).toLowerCase();
  const recipients = summarizeRecipients(schedule.recipients).toLowerCase();
  const cron = describeCron(schedule.cron).toLowerCase();
  return label.includes(q) || recipients.includes(q) || cron.includes(q);
}

function summarizeStats(items: { status?: string }[]) {
  const active = items.filter((item) => item.status === "scheduled").length;
  const inactive = items.filter(
    (item) => item.status === "paused" || item.status === "cancelled" || item.status === "draft",
  ).length;
  return { total: items.length, active, inactive };
}

export function ReportSchedulesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = parseScheduleTabParam(searchParams.get("tab"));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const readOnly = false;

  useEffect(() => {
    const expand = searchParams.get("expand");
    if (expand) setExpandedId(expand);
  }, [searchParams]);

  const schedulesQuery = useReportSchedulesList();
  const { retryExecution } = useReportScheduleMutations();
  const templatesQuery = useQuery({
    queryKey: ["reports", "center", "templates"],
    queryFn: fetchAllCatalogTemplates,
  });

  const nameByNodeId = useMemo(() => {
    const map = new Map<string, string>();
    for (const node of templatesQuery.data ?? []) {
      map.set(node.id, node.name);
    }
    return map;
  }, [templatesQuery.data]);

  const allItems = schedulesQuery.data?.items ?? [];
  const stats = useMemo(() => summarizeStats(allItems), [allItems]);
  const items = useMemo(() => {
    const tabbed = filterSchedulesByTab(allItems, tab);
    return tabbed.filter((schedule) => matchesSearch(schedule, nameByNodeId, search));
  }, [allItems, tab, search, nameByNodeId]);

  const hasSearch = Boolean(search.trim());
  const isLoading = schedulesQuery.isLoading;

  const setTab = (next: ScheduleTabFilter) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", next);
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <AdminPageShell
      layout="list"
      title="定时报告"
      icon={
        <AdminPageHeaderIcon>
          <CalendarClock className="size-6" aria-hidden />
        </AdminPageHeaderIcon>
      }
      description="管理看板/大屏可视化 PDF 定时投递、执行历史与失败重试。"
    >
      {schedulesQuery.isError ? (
        <PageErrorBanner
          message={mapApiError(schedulesQuery.error)}
          onRetry={() => void schedulesQuery.refetch()}
        />
      ) : null}

      {isLoading ? <SchedulePageOverviewSkeleton /> : <SchedulePageOverview stats={stats} />}

      {!isLoading ? (
        <ScheduleRecentFailuresPanel
          schedules={allItems}
          onSelectSchedule={(id) => setExpandedId(id)}
          onRetry={(executionId, scheduleId) =>
            void retryExecution
              .mutateAsync({ executionId, scheduleId })
              .then(() => setExpandedId(scheduleId))
          }
          retryPending={retryExecution.isPending}
          retryPendingExecutionId={
            retryExecution.isPending ? retryExecution.variables?.executionId : undefined
          }
        />
      ) : null}

      <ListPageSection className="min-h-0 flex-1">
        <ListPageToolbar
          filters={
            <>
              <div className="flex flex-wrap items-center gap-1.5">
                {TAB_OPTIONS.map((option) => (
                  <Button
                    key={option.id}
                    type="button"
                    size="sm"
                    variant={tab === option.id ? "primary" : "outline"}
                    aria-pressed={tab === option.id}
                    onClick={() => setTab(option.id)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              <SearchField
                value={search}
                onChange={setSearch}
                placeholder="搜索调度源、接收人或频率…"
                className="w-full max-w-md"
                aria-label="搜索调度"
                disabled={isLoading}
              />
            </>
          }
          actions={
            !isLoading ? (
              <span className="text-theme-xs tabular-nums text-gray-500 dark:text-gray-400">
                共 {items.length} 条
              </span>
            ) : null
          }
        />

        <ListPageTableFrame className="py-0">
          {isLoading ? (
            <div className="space-y-2 py-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="py-6">
              <PanelEmptyState
                layout="inline"
                variant="framed"
                icon={
                  hasSearch ? (
                    <Search className="size-5" aria-hidden />
                  ) : (
                    <CalendarClock className="size-5" aria-hidden />
                  )
                }
                title={emptyTitle(tab, hasSearch)}
                description={emptyDescription(tab, hasSearch)}
                action={emptyAction(tab, hasSearch)}
              />
            </div>
          ) : (
            <ScheduleListTable
              items={items}
              nameByNodeId={nameByNodeId}
              readOnly={readOnly}
              expandedId={expandedId}
              onToggleExpand={(id) => setExpandedId((prev) => (prev === id ? null : id))}
            />
          )}
        </ListPageTableFrame>
      </ListPageSection>
    </AdminPageShell>
  );
}
