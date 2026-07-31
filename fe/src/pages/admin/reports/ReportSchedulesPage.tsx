import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { Button } from "@/components/ui/button";
import {
  ListPageBody,
  ListPageSection,
  ListPageTableFrame,
  ListPageToolbar,
  PageErrorBanner,
} from "@/components/layout/list-page-kit";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mapApiError } from "@/lib/apiError";
import { describeCron } from "@/lib/scheduleCronWizard";
import { fetchAllCatalogTemplates } from "@/lib/reportCatalogUtils";
import {
  filterSchedulesByTab,
  summarizeRecipients,
  type ScheduleTabFilter,
} from "@/lib/scheduleSourceMeta";
import { useReportSchedulesList } from "./useReportSchedules";
import {
  resolveScheduleSourceLabel,
  ScheduleListTable,
} from "./components/ScheduleListTable";

function emptyMessage(tab: ScheduleTabFilter): string {
  if (tab === "template") {
    return "暂无模板调度。请在「报表模板」详情页的调度 Tab 中创建。";
  }
  if (tab === "dashboard") {
    return "暂无看板/大屏定时报告。请进入看板列表，打开分享页底部的「定时报告」创建。";
  }
  return "暂无调度任务。可从模板详情页或看板分享页创建定时报告。";
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

export function ReportSchedulesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get("tab") as ScheduleTabFilter) || "all";
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const readOnly = false;

  const schedulesQuery = useReportSchedulesList();
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
  const items = useMemo(() => {
    const tabbed = filterSchedulesByTab(allItems, tab);
    return tabbed.filter((schedule) => matchesSearch(schedule, nameByNodeId, search));
  }, [allItems, tab, search, nameByNodeId]);

  const setTab = (next: ScheduleTabFilter) => {
    if (next === "all") {
      searchParams.delete("tab");
    } else {
      searchParams.set("tab", next);
    }
    setSearchParams(searchParams, { replace: true });
  };

  return (
    <AdminPageShell
      title="报表调度"
      description="管理报表定时任务，查看执行历史与失败重试。"
      actions={
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" asChild>
            <Link to="/admin/reports/templates">在模板中新建</Link>
          </Button>
          <Button type="button" variant="primary" size="sm" asChild>
            <Link to="/admin/dashboards">在看板分享页新建</Link>
          </Button>
        </div>
      }
    >
      {schedulesQuery.isError ? (
        <PageErrorBanner
          message={mapApiError(schedulesQuery.error)}
          onRetry={() => void schedulesQuery.refetch()}
        />
      ) : null}

      <ListPageSection>
        <Tabs value={tab} onValueChange={(v) => setTab(v as ScheduleTabFilter)} className="mb-4">
          <TabsList>
            <TabsTrigger value="all">全部</TabsTrigger>
            <TabsTrigger value="template">模板</TabsTrigger>
            <TabsTrigger value="dashboard">看板/大屏</TabsTrigger>
          </TabsList>
        </Tabs>

        <ListPageToolbar
          filters={
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="搜索调度源、接收人或频率…"
              className="max-w-md"
              aria-label="搜索调度"
              disabled={schedulesQuery.isLoading}
            />
          }
        />

        <ListPageTableFrame>
          {schedulesQuery.isLoading ? (
            <ListPageBody>
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="mb-2 h-12 w-full" />
              ))}
            </ListPageBody>
          ) : items.length === 0 ? (
            <ListPageBody>
              <p className="py-10 text-center text-theme-sm text-gray-500 dark:text-gray-400">
                {search.trim() ? "无匹配调度，请调整搜索词。" : emptyMessage(tab)}
              </p>
            </ListPageBody>
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
