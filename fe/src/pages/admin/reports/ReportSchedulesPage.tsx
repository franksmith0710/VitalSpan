import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ListPageBody,
  ListPageSection,
  ListPageTableFrame,
  PageErrorBanner,
  RowActions,
} from "@/components/layout/list-page-kit";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mapApiError } from "@/lib/apiError";
import { fetchAllCatalogTemplates } from "@/lib/reportCatalogUtils";
import { describeCron } from "@/lib/scheduleCronWizard";
import {
  filterSchedulesByTab,
  formatAttachmentLabels,
  localizeSourceType,
  scheduleSourceHref,
  sourceTypeBadgeColor,
  summarizeRecipients,
  type ScheduleTabFilter,
} from "@/lib/scheduleSourceMeta";
import {
  SCHEDULE_ACTION_LABELS,
  localizeScheduleStatus,
  scheduleStatusColor,
  useReportScheduleMutations,
  useReportSchedulesList,
  useScheduleExecutions,
  type ReportScheduleRow,
} from "./useReportSchedules";
import { ScheduleHistoryTable } from "./components/ScheduleHistoryTable";

function ScheduleHistoryPanel({
  schedule,
  readOnly,
}: {
  schedule: ReportScheduleRow;
  readOnly: boolean;
}) {
  const historyQuery = useScheduleExecutions(schedule.id);
  const { executeSchedule, retryExecution } = useReportScheduleMutations();

  return (
    <div className="space-y-3 border-t border-gray-100 bg-gray-50/60 px-4 py-4 dark:border-gray-800 dark:bg-white/[0.02]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-theme-xs font-medium text-gray-600 dark:text-gray-400">执行历史</p>
        {!readOnly ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={schedule.status !== "scheduled" || executeSchedule.isPending}
            onClick={() => {
              executeSchedule.mutate(schedule.id, {
                onSuccess: () => toast.success("已触发执行"),
                onError: (err) => toast.error(mapApiError(err)),
              });
            }}
          >
            <RefreshCw className="size-3.5" aria-hidden />
            立即执行
          </Button>
        ) : null}
      </div>
      {historyQuery.isLoading ? <Skeleton className="h-20 w-full" /> : null}
      {!historyQuery.isLoading ? (
        <ScheduleHistoryTable
          rows={historyQuery.data?.items ?? []}
          readOnly={readOnly}
          retryPending={retryExecution.isPending}
          onRetry={(executionId) =>
            retryExecution.mutate(
              { executionId, scheduleId: schedule.id },
              {
                onSuccess: () => toast.success("已提交重试"),
                onError: (err) => toast.error(mapApiError(err)),
              },
            )
          }
        />
      ) : null}
    </div>
  );
}

function emptyMessage(tab: ScheduleTabFilter): string {
  if (tab === "template") {
    return "暂无模板调度。请在「报表模板」详情页的调度 Tab 中创建。";
  }
  if (tab === "dashboard") {
    return "暂无看板/大屏定时报告。请进入看板或大屏的分享页，在底部「定时报告」卡片中创建。";
  }
  return "暂无调度任务。可从模板详情或看板分享页创建定时报告。";
}

function ScheduleRow({
  schedule,
  templateName,
  readOnly,
  expanded,
  onToggle,
}: {
  schedule: ReportScheduleRow;
  templateName: string;
  readOnly: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { transitionSchedule } = useReportScheduleMutations();
  const sourceHref = scheduleSourceHref(schedule);

  return (
    <>
      <tr className="border-b border-gray-100 dark:border-gray-800">
        <td className="px-4 py-3">
          <Badge variant="light" color={sourceTypeBadgeColor(schedule.sourceType)} size="sm">
            {localizeSourceType(schedule.sourceType)}
          </Badge>
        </td>
        <td className="px-4 py-3">
          <button
            type="button"
            className="inline-flex items-center gap-1 text-left text-theme-sm font-medium text-gray-800 dark:text-white/90"
            onClick={onToggle}
            aria-expanded={expanded}
          >
            {expanded ? (
              <ChevronDown className="size-4 shrink-0 text-gray-400" aria-hidden />
            ) : (
              <ChevronRight className="size-4 shrink-0 text-gray-400" aria-hidden />
            )}
            {templateName}
          </button>
        </td>
        <td className="px-4 py-3 text-theme-sm text-gray-600 dark:text-gray-400">
          {describeCron(schedule.cron)}
        </td>
        <td className="max-w-[180px] px-4 py-3 text-theme-xs text-gray-600 dark:text-gray-400">
          {summarizeRecipients(schedule.recipients)}
        </td>
        <td className="px-4 py-3 text-theme-xs text-gray-600 dark:text-gray-400">
          {formatAttachmentLabels(schedule.attachmentFormats)}
        </td>
        <td className="px-4 py-3">
          <Badge variant="light" color={scheduleStatusColor(schedule.status)} size="sm">
            {localizeScheduleStatus(schedule.status)}
          </Badge>
        </td>
        <td className="px-4 py-3">
          <RowActions>
            <Button type="button" variant="ghost" size="sm" asChild>
              <Link to={sourceHref}>
                <ExternalLink className="size-3.5" aria-hidden />
                查看源
              </Link>
            </Button>
            {!readOnly
              ? schedule.allowedActions.map((action) => (
                  <Button
                    key={action}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={transitionSchedule.isPending}
                    onClick={() =>
                      transitionSchedule.mutate(
                        { id: schedule.id, action },
                        {
                          onSuccess: () => toast.success("调度状态已更新"),
                          onError: (err) => toast.error(mapApiError(err)),
                        },
                      )
                    }
                  >
                    {SCHEDULE_ACTION_LABELS[action] ?? action}
                  </Button>
                ))
              : null}
          </RowActions>
        </td>
      </tr>
      {expanded ? (
        <tr>
          <td colSpan={7} className="p-0">
            <ScheduleHistoryPanel schedule={schedule} readOnly={readOnly} />
          </td>
        </tr>
      ) : null}
    </>
  );
}

export function ReportSchedulesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get("tab") as ScheduleTabFilter) || "all";
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
  const items = filterSchedulesByTab(allItems, tab);

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
                {emptyMessage(tab)}
              </p>
            </ListPageBody>
          ) : (
            <div className="overflow-x-only">
              <table className="min-w-[960px] w-full text-left text-theme-sm">
                <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
                  <tr>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">源类型</th>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">调度源</th>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">频率</th>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">接收人</th>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">附件</th>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">状态</th>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((schedule) => (
                    <ScheduleRow
                      key={schedule.id}
                      schedule={schedule}
                      templateName={
                        schedule.sourceLabel ??
                        nameByNodeId.get(schedule.catalogNodeId ?? schedule.sourceId ?? "") ??
                        (schedule.sourceType === "dashboard"
                          ? "看板定时报告"
                          : schedule.sourceType === "data_screen"
                            ? "大屏定时报告"
                            : "报表模板")
                      }
                      readOnly={readOnly}
                      expanded={expandedId === schedule.id}
                      onToggle={() =>
                        setExpandedId((prev) => (prev === schedule.id ? null : schedule.id))
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ListPageTableFrame>
      </ListPageSection>
    </AdminPageShell>
  );
}
