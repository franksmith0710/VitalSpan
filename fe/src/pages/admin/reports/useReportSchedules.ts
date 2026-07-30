import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";

export type ReportScheduleRow = {
  id: string;
  catalogNodeId: string;
  cron: string;
  timezone: string;
  status: string;
  allowedActions: string[];
};

export type ScheduleExecutionRow = {
  executionId: string;
  scheduleId: string;
  status: string;
  artifactRef: string;
  executedAt: string;
  errorMessage?: string | null;
  parentExecutionId?: string | null;
};

export function useReportSchedulesList(catalogNodeId?: string) {
  return useQuery({
    queryKey: queryKeys.reportSchedules(catalogNodeId),
    queryFn: () => {
      const q = catalogNodeId
        ? `?catalogNodeId=${encodeURIComponent(catalogNodeId)}`
        : "";
      return apiFetch<{ items: ReportScheduleRow[]; total: number }>(
        `/api/v1/reports/schedules${q}`,
      );
    },
  });
}

export function useScheduleExecutions(scheduleId: string | null) {
  return useQuery({
    queryKey: ["reports", "schedule-executions", scheduleId],
    queryFn: () =>
      apiFetch<{ items: ScheduleExecutionRow[]; total: number }>(
        `/api/v1/reports/schedules/${scheduleId}/executions`,
      ),
    enabled: Boolean(scheduleId),
  });
}

export function useReportScheduleMutations(catalogNodeId?: string) {
  const qc = useQueryClient();
  const listKey = queryKeys.reportSchedules(catalogNodeId);

  const invalidate = (scheduleId?: string) => {
    void qc.invalidateQueries({ queryKey: listKey });
    if (scheduleId) {
      void qc.invalidateQueries({ queryKey: ["reports", "schedule-executions", scheduleId] });
    }
    void qc.invalidateQueries({ queryKey: queryKeys.reportSchedules() });
  };

  const createSchedule = useMutation({
    mutationFn: (body: { catalogNodeId: string; cron: string; timezone: string }) =>
      apiFetch<ReportScheduleRow>("/api/v1/reports/schedules", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => invalidate(),
  });

  const transitionSchedule = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      apiFetch<ReportScheduleRow>(`/api/v1/reports/schedules/${id}/transition`, {
        method: "POST",
        body: JSON.stringify({ action }),
      }),
    onSuccess: (_data, vars) => invalidate(vars.id),
  });

  const executeSchedule = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/v1/reports/schedules/${id}/execute`, {
        method: "POST",
        headers: {
          "Idempotency-Key": crypto.randomUUID(),
          "X-Rpt-Semi-Real": "1",
        },
      }),
    onSuccess: (_data, id) => invalidate(id),
  });

  const retryExecution = useMutation({
    mutationFn: ({ executionId, scheduleId }: { executionId: string; scheduleId: string }) =>
      apiFetch(`/api/v1/reports/schedules/executions/${executionId}/retry`, {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
      }).then((result) => ({ result, scheduleId })),
    onSuccess: (_data, vars) => invalidate(vars.scheduleId),
  });

  return {
    createSchedule,
    transitionSchedule,
    executeSchedule,
    retryExecution,
    invalidate,
  };
}

export const SCHEDULE_ACTION_LABELS: Record<string, string> = {
  schedule: "激活",
  pause: "暂停",
  resume: "恢复",
  cancel: "取消",
};

export const SCHEDULE_STATUS_LABELS: Record<string, string> = {
  scheduled: "已调度",
  paused: "已暂停",
  draft: "草稿",
  cancelled: "已取消",
};

export const EXECUTION_STATUS_LABELS: Record<string, string> = {
  pending: "进行中",
  succeeded: "成功",
  failed: "失败",
  semi_real_succeeded: "执行成功",
  semi_real_failed: "执行失败",
  semi_real_delivery_degraded: "已生成（投递降级）",
};

export function localizeScheduleStatus(status: string): string {
  return SCHEDULE_STATUS_LABELS[status] ?? status;
}

export function localizeExecutionStatus(status: string): string {
  if (EXECUTION_STATUS_LABELS[status]) return EXECUTION_STATUS_LABELS[status];
  if (status.includes("failed")) return "失败";
  if (status.includes("degraded")) return "部分成功";
  if (status.includes("succeeded")) return "成功";
  return status;
}

export function scheduleStatusColor(status: string): "primary" | "success" | "warning" | "error" {
  if (status === "scheduled") return "success";
  if (status === "paused" || status === "draft") return "warning";
  if (status === "cancelled") return "error";
  return "primary";
}

export function canRetryExecution(status: string): boolean {
  return status.includes("degraded") || status.includes("failed");
}
