import { Link } from "react-router";
import { ChevronDown, ChevronRight, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RowActions } from "@/components/layout/list-page-kit";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { mapApiError } from "@/lib/apiError";
import { describeCron } from "@/lib/scheduleCronWizard";
import {
  formatAttachmentLabels,
  localizeSourceType,
  scheduleSourceHref,
  sourceTypeBadgeColor,
  summarizeRecipients,
} from "@/lib/scheduleSourceMeta";
import {
  SCHEDULE_ACTION_LABELS,
  localizeScheduleStatus,
  scheduleStatusColor,
  useReportScheduleMutations,
  useScheduleExecutions,
  type ReportScheduleRow,
} from "../useReportSchedules";
import { ScheduleHistoryTable } from "./ScheduleHistoryTable";

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
      {historyQuery.isLoading ? (
        <p className="text-theme-xs text-gray-500">加载中…</p>
      ) : (
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
      )}
    </div>
  );
}

function ScheduleDataRow({
  schedule,
  sourceLabel,
  readOnly,
  expanded,
  onToggle,
}: {
  schedule: ReportScheduleRow;
  sourceLabel: string;
  readOnly: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { transitionSchedule } = useReportScheduleMutations();
  const sourceHref = scheduleSourceHref(schedule);

  return (
    <>
      <TableRow className="border-gray-100 dark:border-gray-800">
        <TableCell className="px-4 py-3">
          <Badge variant="light" color={sourceTypeBadgeColor(schedule.sourceType)} size="sm">
            {localizeSourceType(schedule.sourceType)}
          </Badge>
        </TableCell>
        <TableCell className="px-4 py-3">
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
            {sourceLabel}
          </button>
        </TableCell>
        <TableCell className="px-4 py-3 text-theme-sm text-gray-600 dark:text-gray-400">
          {describeCron(schedule.cron)}
        </TableCell>
        <TableCell className="max-w-[180px] px-4 py-3 text-theme-xs text-gray-600 dark:text-gray-400">
          {summarizeRecipients(schedule.recipients)}
        </TableCell>
        <TableCell className="px-4 py-3 text-theme-xs text-gray-600 dark:text-gray-400">
          {formatAttachmentLabels(schedule.attachmentFormats)}
        </TableCell>
        <TableCell className="px-4 py-3">
          <Badge variant="light" color={scheduleStatusColor(schedule.status)} size="sm">
            {localizeScheduleStatus(schedule.status)}
          </Badge>
        </TableCell>
        <TableCell className="px-4 py-3">
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
        </TableCell>
      </TableRow>
      {expanded ? (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={7} className="p-0">
            <ScheduleHistoryPanel schedule={schedule} readOnly={readOnly} />
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}

type ScheduleListTableProps = {
  items: ReportScheduleRow[];
  nameByNodeId: Map<string, string>;
  readOnly: boolean;
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
};

export function resolveScheduleSourceLabel(
  schedule: ReportScheduleRow,
  nameByNodeId: Map<string, string>,
): string {
  return (
    schedule.sourceLabel ??
    nameByNodeId.get(schedule.catalogNodeId ?? schedule.sourceId ?? "") ??
    (schedule.sourceType === "dashboard"
      ? "看板定时报告"
      : schedule.sourceType === "data_screen"
        ? "大屏定时报告"
        : "报表模板")
  );
}

export function ScheduleListTable({
  items,
  nameByNodeId,
  readOnly,
  expandedId,
  onToggleExpand,
}: ScheduleListTableProps) {
  return (
    <div className="overflow-x-only rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <Table className="min-w-[960px] text-theme-sm">
        <TableHeader>
          <TableRow className="border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
            <TableHead className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">源类型</TableHead>
            <TableHead className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">调度源</TableHead>
            <TableHead className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">频率</TableHead>
            <TableHead className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">接收人</TableHead>
            <TableHead className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">附件</TableHead>
            <TableHead className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">状态</TableHead>
            <TableHead className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((schedule) => (
            <ScheduleDataRow
              key={schedule.id}
              schedule={schedule}
              sourceLabel={resolveScheduleSourceLabel(schedule, nameByNodeId)}
              readOnly={readOnly}
              expanded={expandedId === schedule.id}
              onToggle={() => onToggleExpand(schedule.id)}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
