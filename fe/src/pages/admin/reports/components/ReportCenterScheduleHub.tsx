import type { ReactNode } from "react";
import { Link } from "react-router";
import { CalendarClock, Monitor, LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { describeCron } from "@/lib/scheduleCronWizard";
import {
  filterSchedulesByTab,
  localizeSourceType,
  summarizeRecipients,
} from "@/lib/scheduleSourceMeta";
import {
  localizeScheduleStatus,
  scheduleStatusColor,
  type ReportScheduleRow,
} from "../useReportSchedules";
import { Badge } from "@/components/ui/badge";

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="min-w-[5.5rem] rounded-md bg-gray-50/90 px-2.5 py-1.5 dark:bg-white/[0.03]">
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className="text-theme-sm font-semibold tabular-nums text-gray-900 dark:text-white">{value}</p>
      {hint ? <p className="truncate text-[10px] text-gray-400">{hint}</p> : null}
    </div>
  );
}

function CreateEntryCard({
  title,
  description,
  to,
  icon,
  primary,
}: {
  title: string;
  description: string;
  to: string;
  icon: ReactNode;
  primary?: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "group flex items-start gap-3 rounded-xl border p-4 shadow-theme-xs transition-colors",
        primary
          ? "border-brand-200 bg-brand-50/40 hover:bg-brand-50/70 dark:border-brand-500/30 dark:bg-brand-500/5"
          : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-white/[0.02]",
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          primary
            ? "bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400"
            : "bg-gray-100 text-gray-600 dark:bg-white/[0.06] dark:text-gray-400",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-theme-sm font-semibold text-gray-800 dark:text-white/90">{title}</span>
        <span className="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400">{description}</span>
      </span>
    </Link>
  );
}

function ScheduleMiniRow({ schedule }: { schedule: ReportScheduleRow }) {
  const label =
    schedule.sourceLabel ??
    (schedule.sourceType === "dashboard" || schedule.sourceType === "data_screen"
      ? `${localizeSourceType(schedule.sourceType)} ${schedule.sourceId?.slice(0, 8) ?? ""}`
      : "模板调度");

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2 dark:border-gray-800">
      <div className="min-w-0">
        <p className="truncate text-theme-sm font-medium text-gray-800 dark:text-white/90">{label}</p>
        <p className="text-theme-xs text-gray-500">
          {describeCron(schedule.cron)} · {summarizeRecipients(schedule.recipients)}
        </p>
      </div>
      <Badge variant="light" color={scheduleStatusColor(schedule.status)} size="sm">
        {localizeScheduleStatus(schedule.status)}
      </Badge>
    </li>
  );
}

type Props = {
  schedules: ReportScheduleRow[];
  loading?: boolean;
  canManage?: boolean;
};

/** 报表中心主区：定时报告运维入口 */
export function ReportCenterScheduleHub({ schedules, loading, canManage }: Props) {
  const dashboardSchedules = filterSchedulesByTab(schedules, "dashboard");
  const active = schedules.filter((s) => s.status === "scheduled").length;
  const failedRecent = schedules.filter((s) => s.status === "paused").length;

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-full max-w-xl rounded-md" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Metric label="定时报告" value={schedules.length} hint="看板/大屏 + 模板" />
        <Metric label="运行中" value={active} />
        <Metric label="看板/大屏" value={dashboardSchedules.length} hint="主路径" />
        {failedRecent > 0 ? <Metric label="已暂停" value={failedRecent} /> : null}
        {canManage ? (
          <Button type="button" variant="primary" size="sm" className="ml-auto h-8" asChild>
            <Link to="/admin/reports/schedules?tab=dashboard">
              <CalendarClock className="size-3.5" aria-hidden />
              管理全部定时报告
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <CreateEntryCard
          primary
          title="从看板/大屏创建"
          description="在分享页配置定时 PDF 报告（推荐主路径）"
          to="/admin/dashboards"
          icon={<Monitor className="size-5" aria-hidden />}
        />
        <CreateEntryCard
          title="文档模板调度"
          description="固定版式文档报表（后续能力，非默认路径）"
          to="/admin/reports/templates"
          icon={<LayoutTemplate className="size-5" aria-hidden />}
        />
      </div>

      {dashboardSchedules.length > 0 ? (
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">我的看板定时报告</p>
            <Button type="button" variant="ghost" size="sm" asChild>
              <Link to="/admin/reports/schedules?tab=dashboard">查看全部</Link>
            </Button>
          </div>
          <ul className="space-y-1.5">
            {dashboardSchedules.slice(0, 5).map((schedule) => (
              <ScheduleMiniRow key={schedule.id} schedule={schedule} />
            ))}
          </ul>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center text-theme-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
          暂无看板/大屏定时报告。打开看板 → 分享 → 创建定时报告。
        </p>
      )}
    </div>
  );
}

export function ReportCenterMetricsSkeleton() {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-24 rounded-md" />
      ))}
    </div>
  );
}

/** 页头次要操作 */
export function ReportCenterHeaderActions({ canManage }: { canManage: boolean }) {
  if (!canManage) return null;
  return (
    <Button type="button" variant="outline" size="sm" asChild>
      <Link to="/admin/reports/schedules">
        <CalendarClock className="size-4" aria-hidden />
        定时报告
      </Link>
    </Button>
  );
}
