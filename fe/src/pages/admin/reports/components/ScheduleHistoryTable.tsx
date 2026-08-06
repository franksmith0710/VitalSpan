import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TruncateHint } from "@/components/ui/hint-tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/formatDateTime";
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
  retryPendingExecutionId?: string;
  compact?: boolean;
  /** 嵌套在展开面板内：去掉外层卡片边框 */
  embedded?: boolean;
};

export function ScheduleHistoryTable({
  rows,
  readOnly,
  onRetry,
  retryPending,
  retryPendingExecutionId,
  compact,
  embedded = false,
}: ScheduleHistoryTableProps) {
  const [detailRow, setDetailRow] = useState<ScheduleExecutionRow | null>(null);

  if (rows.length === 0) {
    return (
      <p className={`text-center text-theme-sm text-gray-500 ${compact ? "py-4" : "py-6"}`}>
        暂无执行记录
      </p>
    );
  }

  return (
    <>
      <div
        className={
          embedded
            ? "overflow-x-only rounded-lg border border-gray-200/80 bg-white dark:border-gray-800 dark:bg-gray-900/40"
            : "overflow-x-only rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
        }
      >
        <Table size="compact" wrapperClassName="min-w-[520px] border-0 shadow-none">
          <TableHeader>
            <TableRow className="border-gray-100 dark:border-gray-800">
              <TableHead className="px-3 py-2">状态</TableHead>
              <TableHead className="px-3 py-2">产物</TableHead>
              <TableHead className="px-3 py-2">执行时间</TableHead>
              <TableHead className="px-3 py-2">错误信息</TableHead>
              <TableHead className="w-24 px-3 py-2" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const isRetrying = retryPending && retryPendingExecutionId === row.executionId;
              const hasError = Boolean(row.errorMessage);
              return (
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
                  <TableCell className="whitespace-nowrap px-3 py-2 text-gray-600 dark:text-gray-400">
                    {formatDateTime(row.executedAt)}
                  </TableCell>
                  <TableCell className={`max-w-[240px] px-3 py-2 text-gray-600 dark:text-gray-400 ${compact ? "text-theme-xs" : ""}`}>
                    {hasError ? (
                      <TruncateHint title={localizeApiMessage(row.errorMessage)}>
                        <span className={compact ? "line-clamp-2" : "line-clamp-3"}>
                          {localizeApiMessage(row.errorMessage)}
                        </span>
                      </TruncateHint>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {hasError ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-theme-xs"
                          onClick={() => setDetailRow(row)}
                        >
                          详情
                        </Button>
                      ) : null}
                      {!readOnly && canRetryExecution(row.status) && onRetry ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8"
                          disabled={isRetrying}
                          onClick={() => onRetry(row.executionId)}
                        >
                          {isRetrying ? "重试中…" : "重试"}
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={Boolean(detailRow)} onOpenChange={(open) => !open && setDetailRow(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>执行失败详情</DialogTitle>
            <DialogDescription>
              {detailRow ? formatDateTime(detailRow.executedAt) : null}
            </DialogDescription>
          </DialogHeader>
          <p className="max-h-60 overflow-y-auto whitespace-pre-wrap break-words text-theme-sm text-gray-600 dark:text-gray-400">
            {detailRow?.errorMessage ? localizeApiMessage(detailRow.errorMessage) : "无详细错误信息"}
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDetailRow(null)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
