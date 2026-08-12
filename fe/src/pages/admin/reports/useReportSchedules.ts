import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { randomId } from "@/lib/randomId";
import { queryKeys } from "@/lib/queryKeys";

export type ScheduleRecipient = { type: "role" | "user" | "email"; value: string };

export type ReportScheduleRow = {
  id: string;
  name?: string | null;
  catalogNodeId?: string | null;
  sourceType?: string;
  sourceId?: string;
  sourceKey?: string;
  sourceLabel?: string | null;
  recipients?: ScheduleRecipient[];
  attachmentFormats?: string[];
  deliveryChannels?: string[];
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
  artifactKind?: string | null;
  executedAt: string;
  errorMessage?: string | null;
  parentExecutionId?: string | null;
};

export type ReportScheduleListFilter = {
  catalogNodeId?: string;
  sourceId?: string;
  sourceKey?: string;
  sourceType?: string;
};

function scheduleListQuery(filter?: ReportScheduleListFilter): string {
  const params = new URLSearchParams();
  if (filter?.catalogNodeId) params.set("catalogNodeId", filter.catalogNodeId);
  if (filter?.sourceId) params.set("sourceId", filter.sourceId);
  if (filter?.sourceKey) params.set("sourceKey", filter.sourceKey);
  if (filter?.sourceType) params.set("sourceType", filter.sourceType);
  const q = params.toString();
  return q ? `?${q}` : "";
}

export function useReportSchedulesList(filter?: ReportScheduleListFilter) {
  return useQuery({
    queryKey: queryKeys.reportSchedules(filter),
    queryFn: () =>
      apiFetch<{ items: ReportScheduleRow[]; total: number }>(
        `/api/v1/reports/schedules${scheduleListQuery(filter)}`,
      ),
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

export function useReportScheduleMutations(filter?: ReportScheduleListFilter) {
  const qc = useQueryClient();
  const listKey = queryKeys.reportSchedules(filter);

  const invalidate = (scheduleId?: string) => {
    void qc.invalidateQueries({ queryKey: listKey });
    if (scheduleId) {
      void qc.invalidateQueries({ queryKey: ["reports", "schedule-executions", scheduleId] });
    }
    void qc.invalidateQueries({ queryKey: ["reports", "schedules"] });
    void qc.invalidateQueries({ queryKey: ["reports", "schedules", "recent-failures"] });
  };

  const createSchedule = useMutation({
    mutationFn: (body: {
      catalogNodeId?: string;
      sourceType?: string;
      sourceId?: string;
      sourceKey?: string;
      name?: string;
      cron: string;
      timezone: string;
      recipients?: ScheduleRecipient[];
      attachmentFormats?: string[];
      deliveryChannels?: string[];
    }) =>
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
          "Idempotency-Key": randomId(),
          "X-Rpt-Semi-Real": "1",
        },
      }),
    onSuccess: (_data, id) => invalidate(id),
  });

  const retryExecution = useMutation({
    mutationFn: ({ executionId, scheduleId }: { executionId: string; scheduleId: string }) =>
      apiFetch(`/api/v1/reports/schedules/executions/${executionId}/retry`, {
        method: "POST",
        headers: { "Idempotency-Key": randomId() },
      }).then((result) => ({ result, scheduleId })),
    onSuccess: (_data, vars) => invalidate(vars.scheduleId),
  });

  const dismissFailure = useMutation({
    mutationFn: (executionId: string) =>
      apiFetch(`/api/v1/reports/schedules/executions/${executionId}/dismiss`, {
        method: "POST",
      }),
    onSuccess: () => invalidate(),
  });

  const dismissAllFailures = useMutation({
    mutationFn: (executionIds: string[]) =>
      apiFetch("/api/v1/reports/schedules/executions/recent-failures/dismiss-all", {
        method: "POST",
        body: JSON.stringify({ executionIds }),
      }),
    onSuccess: () => invalidate(),
  });

  const updateSchedule = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiFetch<ReportScheduleRow>(`/api/v1/reports/schedules/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: (_data, vars) => invalidate(vars.id),
  });

  return {
    createSchedule,
    updateSchedule,
    transitionSchedule,
    executeSchedule,
    retryExecution,
    dismissFailure,
    dismissAllFailures,
    invalidate,
  };
}

export const SCHEDULE_ACTION_LABELS: Record<string, string> = {
  schedule: "激活",
  pause: "暂停",
  resume: "恢复",
  cancel: "取消调度",
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
  semi_real_succeeded: "成功",
  semi_real_failed: "失败",
  semi_real_delivery_degraded: "已生成未投递",
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
