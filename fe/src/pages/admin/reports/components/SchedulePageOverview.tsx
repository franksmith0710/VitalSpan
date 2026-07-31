import type { ReactNode } from "react";
import { Link } from "react-router";
import { CalendarClock, LayoutTemplate, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

type ScheduleStat = {
  label: string;
  value: number;
  hint?: string;
};

function ScheduleStatCard({ label, value, hint }: ScheduleStat) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-theme-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-title-sm font-semibold tabular-nums text-gray-900 dark:text-white">
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 truncate text-[11px] text-gray-400 dark:text-gray-500">{hint}</p>
      ) : null}
    </div>
  );
}

function CreateEntryCard({
  title,
  description,
  to,
  icon,
}: {
  title: string;
  description: string;
  to: string;
  icon: ReactNode;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "group flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-theme-xs transition-colors",
        "hover:border-brand-200 hover:bg-brand-50/40 dark:border-gray-800 dark:bg-white/[0.02]",
        "dark:hover:border-brand-500/30 dark:hover:bg-brand-500/5",
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-theme-sm font-semibold text-gray-800 dark:text-white/90">
          {title}
        </span>
        <span className="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400">
          {description}
        </span>
      </span>
    </Link>
  );
}

type SchedulePageOverviewProps = {
  stats: {
    total: number;
    active: number;
    inactive: number;
  };
};

export function SchedulePageOverview({ stats }: SchedulePageOverviewProps) {
  return (
    <div className="grid shrink-0 gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div className="grid gap-3 sm:grid-cols-3">
        <ScheduleStatCard label="全部调度" value={stats.total} hint="模板 + 看板/大屏" />
        <ScheduleStatCard label="运行中" value={stats.active} hint="已调度或执行中" />
        <ScheduleStatCard label="已暂停 / 取消" value={stats.inactive} hint="暂停、草稿或已取消" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <CreateEntryCard
          title="从模板创建"
          description="在报表模板详情页配置定时投递"
          to="/admin/reports/templates"
          icon={<LayoutTemplate className="size-5" aria-hidden />}
        />
        <CreateEntryCard
          title="从看板创建"
          description="在看板分享页底部添加定时报告"
          to="/admin/dashboards"
          icon={<Monitor className="size-5" aria-hidden />}
        />
      </div>
    </div>
  );
}

export function SchedulePageOverviewSkeleton() {
  return (
    <div className="grid shrink-0 gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-[76px] animate-pulse rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-white/[0.04]"
          />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="h-[76px] animate-pulse rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-white/[0.04]"
          />
        ))}
      </div>
    </div>
  );
}
