import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { parseCronToWizard } from "@/lib/scheduleCronWizard";
import { summarizeRecipients } from "@/lib/scheduleSourceMeta";
import { PageErrorBanner } from "@/components/ui/page-error-banner";
import { pickActiveSchedule, scheduleRowToForm } from "../scheduleFormUtils";
import { describeCron } from "./ScheduleWizard";
import {
  DEFAULT_SCHEDULE_FORM,
  isScheduleFormSubmittable,
  resolveScheduleCron,
  ScheduleFormFields,
  type ScheduleFormValue,
} from "./ScheduleFormFields";
import { ScheduleHistoryTable } from "./ScheduleHistoryTable";
import type { ReportScheduleRow, ScheduleExecutionRow } from "../useReportSchedules";

const ACTION_LABELS: Record<string, string> = {
  schedule: "激活调度",
  pause: "暂停",
  resume: "恢复",
  cancel: "取消调度",
};

export function SchedulePanel({ catalogNodeId, readOnly }: { catalogNodeId: string; readOnly: boolean }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<ScheduleFormValue>(DEFAULT_SCHEDULE_FORM);
  const [clonePending, setClonePending] = useState(false);

  const listQuery = useQuery({
    queryKey: ["reports", "schedules", catalogNodeId],
    queryFn: () =>
      apiFetch<{ items: ReportScheduleRow[]; total: number }>(
        `/api/v1/reports/schedules?catalogNodeId=${encodeURIComponent(catalogNodeId)}`,
      ),
  });

  const schedule = pickActiveSchedule(listQuery.data?.items ?? []);

  const historyQuery = useQuery({
    queryKey: ["reports", "schedule-executions", schedule?.id],
    queryFn: () =>
      apiFetch<{ items: ScheduleExecutionRow[]; total: number }>(
        `/api/v1/reports/schedules/${schedule!.id}/executions`,
      ),
    enabled: Boolean(schedule?.id),
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["reports", "schedules", catalogNodeId] });
    if (schedule?.id) {
      void qc.invalidateQueries({ queryKey: ["reports", "schedule-executions", schedule.id] });
    }
  };

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<ReportScheduleRow>("/api/v1/reports/schedules", {
        method: "POST",
        body: JSON.stringify({
          catalogNodeId,
          cron: resolveScheduleCron(form),
          timezone: form.timezone,
          recipients: form.recipients.filter((r) => r.value.trim()),
          attachmentFormats: form.attachmentFormats,
        }),
      }),
    onSuccess: () => {
      toast.success("调度已创建");
      invalidate();
    },
    onError: (err) => toast.error(mapApiError(err)),
  });

  const transitionMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      apiFetch<ReportScheduleRow>(`/api/v1/reports/schedules/${id}/transition`, {
        method: "POST",
        body: JSON.stringify({ action }),
      }),
    onSuccess: () => {
      toast.success("调度状态已更新");
      invalidate();
    },
    onError: (err) => toast.error(mapApiError(err)),
  });

  const executeMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/v1/reports/schedules/${id}/execute`, {
        method: "POST",
        headers: {
          "Idempotency-Key": crypto.randomUUID(),
          "X-Rpt-Semi-Real": "1",
        },
      }),
    onSuccess: () => {
      toast.success("已触发执行");
      invalidate();
    },
    onError: (err) => toast.error(mapApiError(err)),
  });

  const retryMutation = useMutation({
    mutationFn: (executionId: string) =>
      apiFetch(`/api/v1/reports/schedules/executions/${executionId}/retry`, {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
      }),
    onSuccess: () => {
      toast.success("已提交重试");
      invalidate();
    },
    onError: (err) => toast.error(mapApiError(err)),
  });

  const handleCreate = () => {
    if (!isScheduleFormSubmittable(form)) {
      toast.error("请配置至少一位有效接收人");
      return;
    }
    createMutation.mutate();
  };

  const handleCloneConfig = async () => {
    if (!schedule || readOnly) return;
    setClonePending(true);
    try {
      const cloned = scheduleRowToForm(schedule);
      if (schedule.allowedActions.includes("cancel")) {
        await transitionMutation.mutateAsync({ id: schedule.id, action: "cancel" });
      }
      setForm(cloned);
      toast.success("已复制配置，请编辑后创建新调度");
    } catch (err) {
      toast.error(mapApiError(err));
    } finally {
      setClonePending(false);
    }
  };

  if (listQuery.isError) {
    return (
      <PageErrorBanner message={mapApiError(listQuery.error)} onRetry={() => void listQuery.refetch()} />
    );
  }

  if (listQuery.isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!schedule) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-title-sm">新建调度</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ScheduleFormFields
            value={form}
            onChange={setForm}
            disabled={readOnly}
            showAttachments
            idPrefix="template-schedule"
          />
          {!readOnly ? (
            <Button
              type="button"
              variant="primary"
              disabled={createMutation.isPending || !isScheduleFormSubmittable(form)}
              onClick={handleCreate}
            >
              {createMutation.isPending ? "创建中…" : "创建调度"}
            </Button>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  const displayForm: ScheduleFormValue = {
    ...form,
    wizard: parseCronToWizard(schedule.cron) ?? DEFAULT_SCHEDULE_FORM.wizard,
    cron: schedule.cron,
    timezone: schedule.timezone,
    attachmentFormats: (schedule.attachmentFormats?.length
      ? schedule.attachmentFormats
      : form.attachmentFormats) as ScheduleFormValue["attachmentFormats"],
    recipients: schedule.recipients?.length
      ? schedule.recipients.map((r) => ({
          type: r.type as ScheduleFormValue["recipients"][0]["type"],
          value: r.value,
        }))
      : form.recipients,
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-title-sm">调度配置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ScheduleFormFields
            value={displayForm}
            onChange={setForm}
            disabled={readOnly || schedule.status !== "draft"}
            showAttachments
            idPrefix="template-schedule-edit"
          />
          {schedule.status !== "draft" && !readOnly ? (
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">
              调度已激活后无法直接修改配置。可「复制配置新建」，或先「取消调度」后重建。
            </p>
          ) : null}
          <p className="text-theme-xs text-gray-500 dark:text-gray-400">
            {describeCron(schedule.cron)} · 接收人：{summarizeRecipients(schedule.recipients)}
          </p>
          <div className="flex flex-wrap gap-2">
            {schedule.status !== "draft" && !readOnly ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={clonePending || transitionMutation.isPending}
                onClick={() => void handleCloneConfig()}
              >
                {clonePending ? "处理中…" : "复制配置新建"}
              </Button>
            ) : null}
            {schedule.allowedActions.map((action) => (
              <Button
                key={action}
                type="button"
                variant={action === "schedule" || action === "resume" ? "primary" : "outline"}
                size="sm"
                disabled={readOnly || transitionMutation.isPending}
                onClick={() => transitionMutation.mutate({ id: schedule.id, action })}
              >
                {ACTION_LABELS[action] ?? action}
              </Button>
            ))}
            {!readOnly && schedule.status === "scheduled" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={executeMutation.isPending}
                onClick={() => executeMutation.mutate(schedule.id)}
                aria-label="手动执行报表调度"
              >
                {executeMutation.isPending ? "执行中…" : "立即执行"}
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-title-sm">执行历史</CardTitle>
        </CardHeader>
        <CardContent>
          {historyQuery.isLoading ? <Skeleton className="h-32 w-full" /> : null}
          {!historyQuery.isLoading ? (
            <ScheduleHistoryTable
              rows={historyQuery.data?.items ?? []}
              readOnly={readOnly}
              retryPending={retryMutation.isPending}
              onRetry={(executionId) => retryMutation.mutate(executionId)}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
