import { useMemo, useState } from "react";
import { Link } from "react-router";
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
import { localizeApiMessage, mapApiError } from "@/lib/apiError";
import { fetchAllCatalogTemplates } from "@/lib/reportCatalogUtils";
import {
  SCHEDULE_ACTION_LABELS,
  canRetryExecution,
  scheduleStatusColor,
  useReportScheduleMutations,
  useReportSchedulesList,
  useScheduleExecutions,
  type ReportScheduleRow,
} from "./useReportSchedules";

function ScheduleHistoryPanel({
  schedule,
  readOnly,
}: {
  schedule: ReportScheduleRow;
  readOnly: boolean;
}) {
  const historyQuery = useScheduleExecutions(schedule.id);
  const { executeSchedule, retryExecution } = useReportScheduleMutations();

  const history = historyQuery.data?.items ?? [];

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
      {history.length === 0 && !historyQuery.isLoading ? (
        <p className="py-2 text-center text-theme-xs text-gray-500">暂无执行记录</p>
      ) : null}
      {history.length > 0 ? (
        <div className="overflow-x-only rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <table className="min-w-[640px] w-full text-left text-theme-xs">
            <thead className="border-b border-gray-100 dark:border-gray-800">
              <tr>
                <th className="px-3 py-2 font-medium text-gray-500">状态</th>
                <th className="px-3 py-2 font-medium text-gray-500">执行时间</th>
                <th className="px-3 py-2 font-medium text-gray-500">错误信息</th>
                <th className="px-3 py-2 font-medium text-gray-500 w-16" />
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={row.executionId} className="border-b border-gray-50 dark:border-gray-800/60">
                  <td className="px-3 py-2">{row.status}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{row.executedAt}</td>
                  <td className="max-w-[200px] truncate px-3 py-2 text-gray-600 dark:text-gray-400" title={row.errorMessage ? localizeApiMessage(row.errorMessage) : undefined}>
                    {row.errorMessage ? localizeApiMessage(row.errorMessage) : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {!readOnly && canRetryExecution(row.status) ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={retryExecution.isPending}
                        onClick={() =>
                          retryExecution.mutate(
                            { executionId: row.executionId, scheduleId: schedule.id },
                            {
                              onSuccess: () => toast.success("已提交重试"),
                              onError: (err) => toast.error(mapApiError(err)),
                            },
                          )
                        }
                      >
                        重试
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
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

  return (
    <>
      <tr className="border-b border-gray-100 dark:border-gray-800">
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
        <td className="px-4 py-3 font-mono text-theme-xs text-gray-600 dark:text-gray-400">
          {schedule.cron}
        </td>
        <td className="px-4 py-3 text-theme-sm text-gray-600 dark:text-gray-400">{schedule.timezone}</td>
        <td className="px-4 py-3">
          <Badge variant="light" color={scheduleStatusColor(schedule.status)} size="sm">
            {schedule.status}
          </Badge>
        </td>
        <td className="px-4 py-3">
          <RowActions>
            <Button type="button" variant="ghost" size="sm" asChild>
              <Link to={`/admin/reports/templates/${schedule.catalogNodeId}`}>
                <ExternalLink className="size-3.5" aria-hidden />
                模板
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
          <td colSpan={5} className="p-0">
            <ScheduleHistoryPanel schedule={schedule} readOnly={readOnly} />
          </td>
        </tr>
      ) : null}
    </>
  );
}

export function ReportSchedulesPage() {
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

  const items = schedulesQuery.data?.items ?? [];

  return (
    <AdminPageShell
      title="报表调度"
      description="管理报表定时任务、查看执行历史与失败重试（RPT-005）。"
      actions={
        <Button type="button" variant="outline" size="sm" asChild>
          <Link to="/admin/reports/templates">在模板中新建调度</Link>
        </Button>
      }
    >
      {schedulesQuery.isError ? (
        <PageErrorBanner
          message={mapApiError(schedulesQuery.error)}
          onRetry={() => void schedulesQuery.refetch()}
        />
      ) : null}

      <ListPageSection>
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
                暂无调度任务。请在「报表模板」详情页的调度 Tab 中创建。
              </p>
            </ListPageBody>
          ) : (
            <div className="overflow-x-only">
              <table className="min-w-[720px] w-full text-left text-theme-sm">
                <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
                  <tr>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">报表模板</th>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Cron</th>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">时区</th>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">状态</th>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((schedule) => (
                    <ScheduleRow
                      key={schedule.id}
                      schedule={schedule}
                      templateName={nameByNodeId.get(schedule.catalogNodeId) ?? schedule.catalogNodeId.slice(0, 8)}
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
