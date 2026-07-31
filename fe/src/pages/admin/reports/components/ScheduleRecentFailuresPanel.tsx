import { useQuery } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { localizeApiMessage } from "@/lib/apiError";
import { localizeExecutionStatus, type ScheduleExecutionRow } from "../useReportSchedules";

type Props = {
  onSelectSchedule?: (scheduleId: string) => void;
  onRetry?: (executionId: string, scheduleId: string) => void;
  retryPending?: boolean;
};

export function ScheduleRecentFailuresPanel({ onSelectSchedule, onRetry, retryPending }: Props) {
  const failuresQuery = useQuery({
    queryKey: ["reports", "schedules", "recent-failures"],
    queryFn: () =>
      apiFetch<{ items: ScheduleExecutionRow[]; total: number }>(
        "/api/v1/reports/schedules/executions/recent-failures?limit=10",
      ),
  });

  const items = failuresQuery.data?.items ?? [];
  if (failuresQuery.isLoading || items.length === 0) return null;

  return (
    <Card className="border-amber-200 bg-amber-50/30 dark:border-amber-500/30 dark:bg-amber-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-title-sm">
          <AlertCircle className="size-4 text-amber-600 dark:text-amber-400" aria-hidden />
          近期失败 / 降级投递（{items.length}）
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((row) => (
          <div
            key={row.executionId}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-100 bg-white/80 px-3 py-2 text-theme-xs dark:border-amber-500/20 dark:bg-white/[0.03]"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium text-gray-800 dark:text-white/90">
                {localizeExecutionStatus(row.status)}
                <span className="ml-2 font-normal text-gray-500">{row.executedAt}</span>
              </p>
              {row.errorMessage ? (
                <p className="mt-0.5 line-clamp-2 text-gray-500">{localizeApiMessage(row.errorMessage)}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 gap-2">
              {onSelectSchedule ? (
                <Button type="button" variant="outline" size="sm" onClick={() => onSelectSchedule(row.scheduleId)}>
                  查看调度
                </Button>
              ) : null}
              {onRetry ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={retryPending}
                  onClick={() => onRetry(row.executionId, row.scheduleId)}
                >
                  重试
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
