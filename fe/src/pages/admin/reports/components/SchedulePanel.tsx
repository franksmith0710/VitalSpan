import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { TruncateHint } from "@/components/ui/hint-tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { apiFetch } from "@/lib/api";
import { localizeApiMessage, mapApiError } from "@/lib/apiError";
import { parseCronToWizard, type ScheduleWizardState } from "@/lib/scheduleCronWizard";
import { PageErrorBanner } from "@/components/ui/page-error-banner";
import { cronFromWizard, describeCron, ScheduleWizard } from "./ScheduleWizard";

type ScheduleRow = {
  id: string;
  catalogNodeId?: string | null;
  sourceType?: string;
  sourceId?: string;
  cron: string;
  timezone: string;
  status: string;
  allowedActions: string[];
  recipients?: { type: string; value: string }[];
};

type HistoryRow = {
  executionId: string;
  scheduleId: string;
  status: string;
  artifactRef: string;
  executedAt: string;
  errorMessage?: string | null;
  parentExecutionId?: string | null;
};

const ACTION_LABELS: Record<string, string> = {
  schedule: "激活调度",
  pause: "暂停",
  resume: "恢复",
  cancel: "取消调度",
};

export function SchedulePanel({ catalogNodeId, readOnly }: { catalogNodeId: string; readOnly: boolean }) {
  const qc = useQueryClient();
  const [wizard, setWizard] = useState<ScheduleWizardState>(
    parseCronToWizard("0 8 * * *") ?? {
      frequency: "daily",
      hour: 8,
      minute: 0,
      weekday: 1,
      dayOfMonth: 1,
    },
  );
  const [cron, setCron] = useState("0 8 * * *");
  const [showAdvancedCron, setShowAdvancedCron] = useState(false);
  const [recipientRole, setRecipientRole] = useState("admin");
  const [timezone, setTimezone] = useState("Asia/Shanghai");

  const listQuery = useQuery({
    queryKey: ["reports", "schedules", catalogNodeId],
    queryFn: () =>
      apiFetch<{ items: ScheduleRow[]; total: number }>(
        `/api/v1/reports/schedules?catalogNodeId=${encodeURIComponent(catalogNodeId)}`,
      ),
  });

  const schedule = listQuery.data?.items[0] ?? null;

  const historyQuery = useQuery({
    queryKey: ["reports", "schedule-executions", schedule?.id],
    queryFn: () =>
      apiFetch<{ items: HistoryRow[]; total: number }>(
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
      apiFetch<ScheduleRow>("/api/v1/reports/schedules", {
        method: "POST",
        body: JSON.stringify({
          catalogNodeId,
          cron: showAdvancedCron ? cron : cronFromWizard(wizard),
          timezone,
          recipients: [{ type: "role", value: recipientRole }],
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
      apiFetch<ScheduleRow>(`/api/v1/reports/schedules/${id}/transition`, {
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

  const handleSave = () => {
    if (!schedule) {
      createMutation.mutate();
      return;
    }
    if (schedule.status === "draft") {
      transitionMutation.mutate({ id: schedule.id, action: "schedule" });
    }
  };

  const isLoading = listQuery.isLoading;
  const history = historyQuery.data?.items ?? [];

  if (listQuery.isError) {
    return (
      <PageErrorBanner message={mapApiError(listQuery.error)} onRetry={() => void listQuery.refetch()} />
    );
  }

  if (isLoading) {
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
          <div className="grid gap-2">
            <Label htmlFor="schedule-recipient-role">接收角色</Label>
            <Select value={recipientRole} onValueChange={setRecipientRole} disabled={readOnly}>
              <SelectTrigger id="schedule-recipient-role">
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
            <Label htmlFor="schedule-tz-new">时区</Label>
            <Select value={timezone} onValueChange={setTimezone} disabled={readOnly}>
              <SelectTrigger id="schedule-tz-new">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Asia/Shanghai">Asia/Shanghai</SelectItem>
                <SelectItem value="UTC">UTC</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            {!readOnly ? (
              <Button type="button" variant="primary" disabled={createMutation.isPending} onClick={handleSave}>
                {createMutation.isPending ? "创建中…" : "创建调度"}
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
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-title-sm">调度配置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ScheduleWizard
            value={parseCronToWizard(cron) ?? wizard}
            onChange={(next) => {
              setWizard(next);
              setCron(cronFromWizard(next));
            }}
            disabled={readOnly || schedule.status !== "draft"}
            showAdvancedCron={showAdvancedCron}
            cron={cron}
            onCronChange={setCron}
          />
          <p className="text-theme-xs text-gray-500">{describeCron(cron)}</p>
          <div className="grid gap-2">
            <Label htmlFor="schedule-tz">时区</Label>
            <Select value={timezone} onValueChange={setTimezone} disabled={readOnly}>
              <SelectTrigger id="schedule-tz">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Asia/Shanghai">Asia/Shanghai</SelectItem>
                <SelectItem value="UTC">UTC</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
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
          </div>
          <div className="flex flex-wrap gap-2">
            {!readOnly ? (
              <Button
                type="button"
                variant="primary"
                disabled={createMutation.isPending || transitionMutation.isPending}
                onClick={handleSave}
              >
                保存调度
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              disabled={readOnly || schedule.status !== "scheduled" || executeMutation.isPending}
              onClick={() => executeMutation.mutate(schedule.id)}
              aria-label="手动执行报表调度"
            >
              {executeMutation.isPending ? "执行中…" : "立即执行"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-title-sm">执行历史</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-only">
          {historyQuery.isLoading ? <Skeleton className="h-32 w-full" /> : null}
          {history.length === 0 && !historyQuery.isLoading ? (
            <p className="py-6 text-center text-theme-sm text-gray-500">暂无执行记录</p>
          ) : null}
          {history.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>状态</TableHead>
                  <TableHead>执行时间</TableHead>
                  <TableHead>错误</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((row) => {
                  const canRetry =
                    !readOnly &&
                    (row.status.includes("degraded") || row.status.includes("failed"));
                  return (
                    <TableRow key={row.executionId}>
                      <TableCell className="text-theme-sm">{row.status}</TableCell>
                      <TableCell className="text-theme-sm">{row.executedAt}</TableCell>
                      <TableCell className="max-w-[160px] text-theme-sm text-gray-600 dark:text-gray-400">
                        {row.errorMessage ? (
                          <TruncateHint title={localizeApiMessage(row.errorMessage)}>
                            <span className="line-clamp-2">
                              {localizeApiMessage(row.errorMessage)}
                            </span>
                          </TruncateHint>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {canRetry ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={retryMutation.isPending}
                            onClick={() => retryMutation.mutate(row.executionId)}
                          >
                            重试
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
