import { useEffect, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageErrorBanner } from "@/components/ui/page-error-banner";
import { mapApiError } from "@/lib/apiError";
import { summarizeRecipients } from "@/lib/scheduleSourceMeta";
import { scheduleRowToForm } from "../scheduleFormUtils";
import {
  localizeScheduleStatus,
  SCHEDULE_ACTION_LABELS,
  useReportScheduleMutations,
  useReportSchedulesList,
  useScheduleExecutions,
  type ReportScheduleRow,
} from "../useReportSchedules";
import { describeCron } from "./ScheduleWizard";
import {
  DEFAULT_SCHEDULE_FORM,
  isScheduleFormSubmittable,
  resolveScheduleCron,
  ScheduleFormFields,
  type ScheduleFormValue,
} from "./ScheduleFormFields";
import { isLayoutInventoryArtifact } from "@/lib/scheduleArtifactMeta";
import { ScheduleArtifactNotice } from "./ScheduleArtifactNotice";
import { ScheduleHistoryTable } from "./ScheduleHistoryTable";
import { ScheduleActivationBanner } from "./ScheduleActivationBanner";
import { SchedulePrecheckPanel, useSchedulePrecheckItems, canCreateDashboardSchedule } from "./SchedulePrecheckPanel";
import { Badge } from "@/components/ui/badge";

type DashboardSchedulePanelProps = {
  sourceId: string;
  sourceType: "dashboard" | "data_screen";
  sourceName: string;
  widgetCount?: number;
  readOnly?: boolean;
  embedded?: boolean;
};

export function DashboardSchedulePanel({
  sourceId,
  sourceType,
  sourceName,
  widgetCount,
  readOnly = false,
  embedded = false,
}: DashboardSchedulePanelProps) {
  const filter = { sourceId, sourceType };
  const listQuery = useReportSchedulesList(filter);
  const schedules = (listQuery.data?.items ?? []).filter((s) => s.status !== "cancelled");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = schedules.find((s) => s.id === selectedId) ?? schedules[0] ?? null;
  const draftSelected = selected?.status === "draft";

  useEffect(() => {
    if (selected && schedules.some((s) => s.id === selected.id)) return;
    setSelectedId(schedules[0]?.id ?? null);
  }, [schedules, selected]);

  const historyQuery = useScheduleExecutions(selected?.id ?? null);
  const { createSchedule, updateSchedule, transitionSchedule, executeSchedule, retryExecution } =
    useReportScheduleMutations(filter);

  const [form, setForm] = useState<ScheduleFormValue>({
    ...DEFAULT_SCHEDULE_FORM,
    attachmentFormats: ["pdf"],
  });
  const [showCreate, setShowCreate] = useState(false);
  const [showActivationBanner, setShowActivationBanner] = useState(false);
  const [pendingActivateId, setPendingActivateId] = useState<string | null>(null);
  const [clonePending, setClonePending] = useState(false);

  useEffect(() => {
    if (selected && draftSelected) {
      setForm(scheduleRowToForm(selected));
    }
  }, [selected?.id, draftSelected, selected]);

  const label = sourceType === "data_screen" ? "大屏" : "看板";
  const precheck = useSchedulePrecheckItems({
    sourceLabel: sourceName,
    widgetCount,
    requireVisualExport: form.attachmentFormats[0] !== "excel",
  });
  const canCreate = canCreateDashboardSchedule({
    widgetCount,
    exportStatus: precheck.items.find((i) => i.id === "export")?.ok ? "available" : "unavailable",
    loading: precheck.loading,
  }) && isScheduleFormSubmittable(form);
  const isPending =
    createSchedule.isPending ||
    updateSchedule.isPending ||
    transitionSchedule.isPending ||
    executeSchedule.isPending ||
    clonePending;

  const handleCreate = async () => {
    if (!isScheduleFormSubmittable(form)) {
      toast.error("请配置至少一位有效接收人");
      return;
    }
    if (!canCreate) {
      const blocked = precheck.items.find((item) => item.blocking && !item.ok);
      toast.error(blocked?.detail ?? "前置检查未通过，请修复后再创建");
      return;
    }
    try {
      const created = await createSchedule.mutateAsync({
        sourceType,
        sourceId,
        cron: resolveScheduleCron(form),
        timezone: form.timezone,
        recipients: form.recipients.filter((r) => r.value.trim()),
        attachmentFormats: form.attachmentFormats,
        deliveryChannels: form.deliveryChannels,
      });
      setShowCreate(false);
      setSelectedId(created.id);
      if (created.allowedActions.includes("schedule")) {
        setPendingActivateId(created.id);
        setShowActivationBanner(true);
      }
      toast.success("定时报告已创建");
    } catch (err) {
      toast.error(mapApiError(err));
    }
  };

  const handleSaveDraft = async () => {
    if (!selected || selected.status !== "draft") return;
    try {
      await updateSchedule.mutateAsync({
        id: selected.id,
        body: {
          cron: resolveScheduleCron(form),
          timezone: form.timezone,
          recipients: form.recipients.filter((r) => r.value.trim()),
          attachmentFormats: form.attachmentFormats,
          deliveryChannels: form.deliveryChannels,
        },
      });
      toast.success("草稿已保存");
    } catch (err) {
      toast.error(mapApiError(err));
    }
  };

  const handleActivate = async (scheduleId: string) => {
    try {
      await transitionSchedule.mutateAsync({ id: scheduleId, action: "schedule" });
      setShowActivationBanner(false);
      setPendingActivateId(null);
      toast.success("定时报告已激活，将按配置时间发送");
    } catch (err) {
      toast.error(mapApiError(err));
    }
  };

  const handleCloneConfig = async (schedule: ReportScheduleRow) => {
    if (readOnly) return;
    setClonePending(true);
    try {
      const cloned = scheduleRowToForm(schedule);
      if (schedule.allowedActions.includes("cancel")) {
        await transitionSchedule.mutateAsync({ id: schedule.id, action: "cancel" });
      }
      setForm(cloned);
      setShowCreate(true);
      setSelectedId(null);
      toast.success("已复制配置，请编辑后创建新定时报告");
    } catch (err) {
      toast.error(mapApiError(err));
    } finally {
      setClonePending(false);
    }
  };

  const handleTestSend = async (scheduleId: string) => {
    try {
      await executeSchedule.mutateAsync(scheduleId);
      toast.success("已触发试发，请查收邮箱");
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
  const showLegacyNotice = history.some((row) => isLayoutInventoryArtifact(row.artifactKind));

  const inner = (
    <div className="space-y-4">
      <ScheduleArtifactNotice show={showLegacyNotice} />
      {readOnly ? (
        <p className="text-theme-sm text-gray-500">
          您没有管理定时报告的权限。请联系管理员开通「看板定时推送」或「报表管理」权限。
        </p>
      ) : null}
      {showActivationBanner && pendingActivateId ? (
        <ScheduleActivationBanner
          onActivate={() => void handleActivate(pendingActivateId)}
          activating={transitionSchedule.isPending}
          disabled={readOnly}
        />
      ) : null}
      {schedules.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {schedules.map((s) => (
            <Button
              key={s.id}
              type="button"
              variant={selected?.id === s.id ? "primary" : "outline"}
              size="sm"
              onClick={() => setSelectedId(s.id)}
            >
              {s.name || describeCron(s.cron)}
              <Badge variant="outline" className="ml-1 text-[10px]">
                {localizeScheduleStatus(s.status)}
              </Badge>
            </Button>
          ))}
          {!readOnly ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreate(true)}>
              + 新建
            </Button>
          ) : null}
        </div>
      ) : null}
      {showCreate || schedules.length === 0 ? (
        <>
          {!readOnly ? (
            <SchedulePrecheckPanel
              sourceLabel={sourceName}
              widgetCount={widgetCount}
              requireVisualExport={form.attachmentFormats[0] !== "excel"}
            />
          ) : null}
          <ScheduleFormFields
            value={form}
            onChange={setForm}
            disabled={readOnly}
            showAttachments
            showDeliveryChannels
            idPrefix="dash-schedule"
          />
          {!readOnly ? (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="primary"
                disabled={isPending || !canCreate}
                onClick={() => void handleCreate()}
              >
                {createSchedule.isPending ? "创建中…" : "创建定时报告"}
              </Button>
              {schedules.length > 0 ? (
                <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>
                  取消
                </Button>
              ) : null}
            </div>
          ) : null}
        </>
      ) : selected ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            {draftSelected ? (
              <>
                <ScheduleFormFields
                  value={form}
                  onChange={setForm}
                  disabled={readOnly}
                  showAttachments
                  showDeliveryChannels
                  idPrefix="dash-schedule-edit"
                />
                {!readOnly ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={() => void handleSaveDraft()}
                  >
                    {updateSchedule.isPending ? "保存中…" : "保存草稿"}
                  </Button>
                ) : null}
              </>
            ) : (
              <>
                <p className="text-theme-sm text-gray-600 dark:text-gray-400">
                  {describeCron(selected.cron)} · {localizeScheduleStatus(selected.status)}
                </p>
                <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                  接收人：{summarizeRecipients(selected.recipients)}
                </p>
                {!readOnly ? (
                  <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                    已激活后无法直接修改。可「复制配置新建」或先「取消」后重建。
                  </p>
                ) : null}
              </>
            )}
            <div className="flex flex-wrap gap-2">
              {selected.status !== "draft" && !readOnly ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => void handleCloneConfig(selected)}
                >
                  {clonePending ? "处理中…" : "复制配置新建"}
                </Button>
              ) : null}
              {selected.allowedActions.map((action) => (
                <Button
                  key={action}
                  type="button"
                  variant={action === "schedule" || action === "resume" ? "primary" : "outline"}
                  size="sm"
                  disabled={readOnly || transitionSchedule.isPending}
                  onClick={() =>
                    void transitionSchedule
                      .mutateAsync({ id: selected.id, action })
                      .then(() => toast.success("状态已更新"))
                      .catch((err) => toast.error(mapApiError(err)))
                  }
                >
                  {SCHEDULE_ACTION_LABELS[action] ?? action}
                </Button>
              ))}
              {!readOnly && selected.status === "scheduled" ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={executeSchedule.isPending}
                    onClick={() => void handleTestSend(selected.id)}
                  >
                    {executeSchedule.isPending ? "发送中…" : "试发邮件"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={executeSchedule.isPending}
                    onClick={() =>
                      void executeSchedule
                        .mutateAsync(selected.id)
                        .then(() => toast.success("已触发执行"))
                        .catch((err) => toast.error(mapApiError(err)))
                    }
                  >
                    立即执行
                  </Button>
                </>
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
                    .mutateAsync({ executionId, scheduleId: selected.id })
                    .then(() => toast.success("已提交重试"))
                    .catch((err) => toast.error(mapApiError(err)))
                }
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );

  if (embedded) {
    return inner;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-title-sm">
          <Clock className="size-4" aria-hidden />
          定时报告
        </CardTitle>
        <CardDescription>
          主路径：为「{sourceName}」{label}定时生成可视化 PDF 并投递。复用看板已保存的查询与筛选。
          <Link to="/admin/reports/schedules?tab=dashboard" className="ml-1 text-brand-500 hover:underline">
            查看全部定时报告
          </Link>
        </CardDescription>
      </CardHeader>
      <CardContent>{inner}</CardContent>
    </Card>
  );
}
