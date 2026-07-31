import type { ReactNode } from "react";
import { Link } from "react-router";
import { CalendarClock, FileBarChart, LayoutTemplate, Monitor, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function StatCard({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="h-full rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-theme-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-title-sm font-semibold tabular-nums text-gray-900 dark:text-white">{value}</p>
      {hint ? (
        <p className="mt-0.5 truncate text-[11px] text-gray-400 dark:text-gray-500">{hint}</p>
      ) : null}
    </div>
  );
}

function EntryCard({
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
        "group flex h-full items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-theme-xs transition-colors",
        "hover:border-brand-200 hover:bg-brand-50/40 dark:border-gray-800 dark:bg-white/[0.02]",
        "dark:hover:border-brand-500/30 dark:hover:bg-brand-500/5",
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-theme-sm font-semibold text-gray-800 dark:text-white/90">{title}</span>
        <span className="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400">{description}</span>
      </span>
    </Link>
  );
}

type Props = {
  templateCount: number;
  prefabCount: number;
  canManage: boolean;
  defaultReport?: { id: string; name: string } | null;
  defaultReportStale?: boolean;
  defaultLoading?: boolean;
};

export function ReportCenterOverview({
  templateCount,
  prefabCount,
  canManage,
  defaultReport,
  defaultReportStale,
  defaultLoading,
}: Props) {
  return (
    <div className="grid shrink-0 gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="授权模板" value={templateCount} hint="可运行与导出" />
        <StatCard label="预制分析" value={prefabCount} hint="系统预置" />
        {defaultLoading ? (
          <Skeleton className="h-[76px] rounded-xl" />
        ) : defaultReport ? (
          <div className="flex h-full flex-col justify-between gap-2 rounded-xl border border-brand-200 bg-brand-50/40 px-4 py-3 dark:border-brand-500/30 dark:bg-brand-500/5">
            <div className="flex min-w-0 items-start gap-2">
              <Star className="mt-0.5 size-4 shrink-0 text-brand-600 dark:text-brand-400" aria-hidden />
              <div className="min-w-0">
                <p className="text-theme-xs text-gray-500 dark:text-gray-400">角色默认</p>
                <p className="mt-0.5 truncate text-theme-sm font-semibold text-gray-800 dark:text-white/90">
                  {defaultReport.name}
                </p>
              </div>
            </div>
            <Button type="button" size="sm" variant="primary" className="w-full" asChild>
              <Link to={`/admin/reports/view/${defaultReport.id}`}>打开默认报表</Link>
            </Button>
          </div>
        ) : defaultReportStale ? (
          <div className="flex h-full items-center rounded-xl border border-amber-200 bg-amber-50/40 px-4 py-3 text-theme-xs text-gray-600 dark:border-amber-500/30 dark:bg-amber-500/5 dark:text-gray-400">
            默认模板未同步到目录，请联系管理员。
          </div>
        ) : (
          <StatCard label="角色默认" value="未设置" hint="按角色配置默认入口" />
        )}
      </div>

      {canManage ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <EntryCard
            title="报表模板"
            description="管理 Word / Excel / PDF 目录"
            to="/admin/reports/templates"
            icon={<LayoutTemplate className="size-5" aria-hidden />}
          />
          <EntryCard
            title="定时调度"
            description="模板生成与看板 PDF 投递"
            to="/admin/reports/schedules"
            icon={<CalendarClock className="size-5" aria-hidden />}
          />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <EntryCard
            title="预制报表"
            description="浏览全部系统预置分析"
            to="/admin/reports"
            icon={<FileBarChart className="size-5" aria-hidden />}
          />
          <EntryCard
            title="看板定时报告"
            description="查看看板与大屏定时推送"
            to="/admin/reports/schedules?tab=dashboard"
            icon={<Monitor className="size-5" aria-hidden />}
          />
        </div>
      )}
    </div>
  );
}

export function ReportCenterOverviewSkeleton() {
  return (
    <div className="grid shrink-0 gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[76px] rounded-xl" />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-[76px] rounded-xl" />
        ))}
      </div>
    </div>
  );
}
