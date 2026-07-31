import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageErrorBanner } from "@/components/ui/page-error-banner";
import { mapApiError } from "@/lib/apiError";
import { parseCronToWizard, type ScheduleWizardState } from "@/lib/scheduleCronWizard";
import {
  canRetryExecution,
  localizeExecutionStatus,
  localizeScheduleStatus,
  SCHEDULE_ACTION_LABELS,
  useReportScheduleMutations,
  useReportSchedulesList,
  useScheduleExecutions,
} from "../useReportSchedules";
import { cronFromWizard, describeCron, ScheduleWizard } from "./ScheduleWizard";

type DashboardSchedulePanelProps = {
  sourceId: string;
  sourceType: "dashboard" | "data_screen";
  sourceName: string;
  readOnly?: boolean;
};

const DEFAULT_WIZARD: ScheduleWizardState = {
  frequency: "daily",
  hour: 8,
  minute: 0,
  weekday: 1,
  dayOfMonth: 1,
};

export function DashboardSchedulePanel({
  sourceId,
  sourceType,
  sourceName,
  readOnly = false,
}: DashboardSchedulePanelProps) {
  const filter = { sourceId, sourceType };
  const listQuery = useReportSchedulesList(filter);
  const schedule = listQuery.data?.items[0] ?? null;
  const historyQuery = useScheduleExecutions(schedule?.id ?? null);
  const { createSchedule, transitionSchedule, executeSchedule, retryExecution } =
    useReportScheduleMutations(filter);

  const [wizard, setWizard] = useState<ScheduleWizardState>(
    parseCronToWizard("0 8 * * *") ?? DEFAULT_WIZARD,
  );
  const [cron, setCron] = useState("0 8 * * *");
  const [showAdvancedCron, setShowAdvancedCron] = useState(false);
  const [recipientRole, setRecipientRole] = useState("admin");
  const [timezone, setTimezone] = useState("Asia/Shanghai");

  const label = sourceType === "data_screen" ? "大屏" : "看板";

  const handleCreate = async () => {
    try {
      await createSchedule.mutateAsync({
        sourceType,
        sourceId,
        cron: showAdvancedCron ? cron : cronFromWizard(wizard),
        timezone,
        recipients: [{ type: "role", value: recipientRole }],
        attachmentFormats: ["pdf"],
      });
      toast.success("定时报告已创建");
    } catch (err) {
      toast.error(mapApiError(err));
    }
  };

  const handleActivate = async () => {
    if (!schedule) return;
    try {
      await transitionSchedule.mutateAsync({ id: schedule.id, action: "schedule" });
      toast.success("定时报告已激活");
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
  const isPending =
    createSchedule.isPending || transitionSchedule.isPending || executeSchedule.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-title-sm">
          <Clock className="size-4" aria-hidden />
          定时报告
        </CardTitle>
        <CardDescription>
          为「{sourceName}」{label}按日/周/月自动生成 PDF 并邮件投递，对标 DataEase 看板定时推送。
          <Link
            to="/admin/reports/schedules"
            className="ml-1 text-brand-500 hover:underline"
          >
            查看全部调度
          </Link>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!schedule ? (
          <>
            <ScheduleWizard
              value={wizard}
              onChange={(next) => {
                setWizard(next);
                setCron(cronFromWizard(next));
              }}
              disabled={readOnly}
              showAdvancedCron={showAdvancedCron}
              cron={cron}
              onCronChange={setCron}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="dash-schedule-recipient">接收角色</Label>
                <Select
                  value={recipientRole}
                  onValueChange={setRecipientRole}
                  disabled={readOnly}
                >
                  <SelectTrigger id="dash-schedule-recipient">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">管理员</SelectItem>
                    <SelectItem value="analyst">分析师</SelectItem>
                    <SelectItem value="viewer">查看者</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dash-schedule-tz">时区</Label>
                <Select value={timezone} onValueChange={setTimezone} disabled={readOnly}>
                  <SelectTrigger id="dash-schedule-tz">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Shanghai">Asia/Shanghai</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {!readOnly ? (
                <Button
                  type="button"
                  variant="primary"
                  disabled={isPending}
                  onClick={() => void handleCreate()}
                >
                  {createSchedule.isPending ? "创建中…" : "创建定时报告"}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvancedCron((v) => !v)}
              >
                {showAdvancedCron ? "隐藏高级 Cron" : "高级 Cron"}
              </Button>
            </div>
          </>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <p className="text-theme-sm text-gray-600 dark:text-gray-400">
                {describeCron(schedule.cron)} · {localizeScheduleStatus(schedule.status)}
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
                {!readOnly && schedule.status === "draft" ? (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={isPending}
                    onClick={() => void handleActivate()}
                  >
                    激活定时报告
                  </Button>
                ) : null}
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
              {history.length === 0 && !historyQuery.isLoading ? (
                <p className="py-4 text-center text-theme-sm text-gray-500">暂无执行记录</p>
              ) : null}
              {history.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>状态</TableHead>
                      <TableHead>时间</TableHead>
                      <TableHead className="w-16" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((row) => (
                      <TableRow key={row.executionId}>
                        <TableCell className="text-theme-sm">
                          {localizeExecutionStatus(row.status)}
                        </TableCell>
                        <TableCell className="text-theme-sm">{row.executedAt}</TableCell>
                        <TableCell>
                          {!readOnly && canRetryExecution(row.status) ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={retryExecution.isPending}
                              onClick={() =>
                                void retryExecution
                                  .mutateAsync({
                                    executionId: row.executionId,
                                    scheduleId: schedule.id,
                                  })
                                  .then(() => toast.success("已提交重试"))
                                  .catch((err) => toast.error(mapApiError(err)))
                              }
                            >
                              重试
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : null}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
