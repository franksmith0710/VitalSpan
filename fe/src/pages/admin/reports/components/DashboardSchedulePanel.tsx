import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageErrorBanner } from "@/components/ui/page-error-banner";
import { mapApiError } from "@/lib/apiError";
import { summarizeRecipients } from "@/lib/scheduleSourceMeta";
import {
  localizeScheduleStatus,
  SCHEDULE_ACTION_LABELS,
  useReportScheduleMutations,
  useReportSchedulesList,
  useScheduleExecutions,
} from "../useReportSchedules";
import { describeCron } from "./ScheduleWizard";
import {
  DEFAULT_SCHEDULE_FORM,
  isScheduleFormSubmittable,
  resolveScheduleCron,
  ScheduleFormFields,
  type ScheduleFormValue,
} from "./ScheduleFormFields";
import { ScheduleHistoryTable } from "./ScheduleHistoryTable";

type DashboardSchedulePanelProps = {
  sourceId: string;
  sourceType: "dashboard" | "data_screen";
  sourceName: string;
  readOnly?: boolean;
};

export function DashboardSchedulePanel({
  sourceId,
  sourceType,
  sourceName,
  readOnly = false,
}: DashboardSchedulePanelProps) {
  const filter = { sourceId, sourceType };
  const listQuery = useReportSchedulesList(filter);
  const schedule = listQuery.data?.items?.[0] ?? null;
  const historyQuery = useScheduleExecutions(schedule?.id ?? null);
  const { createSchedule, transitionSchedule, executeSchedule, retryExecution } =
    useReportScheduleMutations(filter);

  const [form, setForm] = useState<ScheduleFormValue>({
    ...DEFAULT_SCHEDULE_FORM,
    attachmentFormats: ["pdf"],
  });

  const label = sourceType === "data_screen" ? "大屏" : "看板";
  const isPending =
    createSchedule.isPending || transitionSchedule.isPending || executeSchedule.isPending;

  const handleCreate = async () => {
    if (!isScheduleFormSubmittable(form)) {
      toast.error("请配置至少一位有效接收人");
      return;
    }
    try {
      await createSchedule.mutateAsync({
        sourceType,
        sourceId,
        cron: resolveScheduleCron(form),
        timezone: form.timezone,
        recipients: form.recipients.filter((r) => r.value.trim()),
        attachmentFormats: form.attachmentFormats,
      });
      toast.success("定时报告已创建");
    } catch (err) {
      toast.error(mapApiError(err));
    }
  };

  if (listQuery.isError) {
    return (
      <PageErrorBanner message={mapApiError(listQuery.error)} onRetry={() => void listQuery.refetch()} />
    );
  }

  if (listQuery.isLoading) {
    return <Skeleton className="h-40 w-full" />;
  }

  const history = historyQuery.data?.items ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-title-sm">
          <Clock className="size-4" aria-hidden />
          定时报告
        </CardTitle>
        <CardDescription>
          为「{sourceName}」{label}按日/周/月自动生成 PDF 并邮件投递。
          <Link to="/admin/reports/schedules?tab=dashboard" className="ml-1 text-brand-500 hover:underline">
            查看全部调度
          </Link>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!schedule ? (
          <>
            <ScheduleFormFields
              value={form}
              onChange={setForm}
              disabled={readOnly}
              showAttachments
              idPrefix="dash-schedule"
            />
            {!readOnly ? (
              <Button
                type="button"
                variant="primary"
                disabled={isPending || !isScheduleFormSubmittable(form)}
                onClick={() => void handleCreate()}
              >
                {createSchedule.isPending ? "创建中…" : "创建定时报告"}
              </Button>
            ) : null}
          </>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <p className="text-theme-sm text-gray-600 dark:text-gray-400">
                {describeCron(schedule.cron)} · {localizeScheduleStatus(schedule.status)}
              </p>
              <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                接收人：{summarizeRecipients(schedule.recipients)}
              </p>
              <div className="flex flex-wrap gap-2">
                {schedule.allowedActions.map((action) => (
                  <Button
                    key={action}
                    type="button"
                    variant={action === "schedule" || action === "resume" ? "primary" : "outline"}
                    size="sm"
                    disabled={readOnly || transitionSchedule.isPending}
                    onClick={() =>
                      void transitionSchedule
                        .mutateAsync({ id: schedule.id, action })
                        .then(() => toast.success("状态已更新"))
                        .catch((err) => toast.error(mapApiError(err)))
                    }
                  >
                    {SCHEDULE_ACTION_LABELS[action] ?? action}
                  </Button>
                ))}
                {!readOnly && schedule.status === "scheduled" ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={executeSchedule.isPending}
                    onClick={() =>
                      void executeSchedule
                        .mutateAsync(schedule.id)
                        .then(() => toast.success("已触发执行"))
                        .catch((err) => toast.error(mapApiError(err)))
                    }
                  >
                    {executeSchedule.isPending ? "执行中…" : "立即执行"}
                  </Button>
                ) : null}
              </div>
            </div>
            <div>
              {historyQuery.isLoading ? <Skeleton className="h-24 w-full" /> : null}
              {!historyQuery.isLoading ? (
                <ScheduleHistoryTable
                  rows={history}
                  compact
                  readOnly={readOnly}
                  retryPending={retryExecution.isPending}
                  onRetry={(executionId) =>
                    void retryExecution
                      .mutateAsync({ executionId, scheduleId: schedule.id })
                      .then(() => toast.success("已提交重试"))
                      .catch((err) => toast.error(mapApiError(err)))
                  }
                />
              ) : null}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
