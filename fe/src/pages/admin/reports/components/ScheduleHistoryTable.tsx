import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TruncateHint } from "@/components/ui/hint-tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { localizeApiMessage } from "@/lib/apiError";
import {
  canRetryExecution,
  localizeExecutionStatus,
  type ScheduleExecutionRow,
} from "../useReportSchedules";
import { localizeArtifactKind } from "@/lib/scheduleArtifactMeta";

type ScheduleHistoryTableProps = {
  rows: ScheduleExecutionRow[];
  readOnly?: boolean;
  onRetry?: (executionId: string) => void;
  retryPending?: boolean;
  compact?: boolean;
  /** 嵌套在展开面板内：去掉外层卡片边框 */
  embedded?: boolean;
};

export function ScheduleHistoryTable({
  rows,
  readOnly,
  onRetry,
  retryPending,
  compact,
  embedded = false,
}: ScheduleHistoryTableProps) {
  if (rows.length === 0) {
    return (
      <p className={`text-center text-theme-sm text-gray-500 ${compact ? "py-4" : "py-6"}`}>
        暂无执行记录
      </p>
    );
  }

  return (
    <div
      className={
        embedded
          ? "overflow-x-only rounded-lg border border-gray-200/80 bg-white dark:border-gray-800 dark:bg-gray-900/40"
          : "overflow-x-only rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
      }
    >
      <Table size="compact" wrapperClassName="min-w-[480px] border-0 shadow-none">
        <TableHeader>
          <TableRow className="border-gray-100 dark:border-gray-800">
            <TableHead className="px-3 py-2">状态</TableHead>
            <TableHead className="px-3 py-2">产物</TableHead>
            <TableHead className="px-3 py-2">执行时间</TableHead>
            {!compact ? <TableHead className="px-3 py-2">错误信息</TableHead> : null}
            <TableHead className="w-16 px-3 py-2" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.executionId} className="border-gray-50 dark:border-gray-800/60">
              <TableCell className="px-3 py-2">{localizeExecutionStatus(row.status)}</TableCell>
              <TableCell className="px-3 py-2">
                {localizeArtifactKind(row.artifactKind) ? (
                  <Badge variant="outline" className="text-[10px] font-normal">
                    {localizeArtifactKind(row.artifactKind)}
                  </Badge>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell className="px-3 py-2 text-gray-600 dark:text-gray-400">
                {row.executedAt}
              </TableCell>
              {!compact ? (
                <TableCell className="max-w-[200px] px-3 py-2 text-gray-600 dark:text-gray-400">
                  {row.errorMessage ? (
                    <TruncateHint title={localizeApiMessage(row.errorMessage)}>
                      <span className="line-clamp-2">{localizeApiMessage(row.errorMessage)}</span>
                    </TruncateHint>
                  ) : (
                    "—"
                  )}
                </TableCell>
              ) : null}
              <TableCell className="px-3 py-2">
                {!readOnly && canRetryExecution(row.status) && onRetry ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={retryPending}
                    onClick={() => onRetry(row.executionId)}
                  >
                    重试
                  </Button>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
