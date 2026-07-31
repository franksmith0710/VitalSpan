import { Link } from "react-router";
import { CalendarClock, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function Metric({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: number | string;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("min-w-[5.5rem] rounded-md bg-gray-50/90 px-2.5 py-1.5 dark:bg-white/[0.03]", className)}>
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className="text-theme-sm font-semibold tabular-nums text-gray-900 dark:text-white">{value}</p>
      {hint ? <p className="truncate text-[10px] text-gray-400">{hint}</p> : null}
    </div>
  );
}

type Props = {
  templateCount: number;
  prefabCount: number;
  defaultReport?: { id: string; name: string } | null;
  defaultReportStale?: boolean;
  defaultLoading?: boolean;
};

/** 单行概览，嵌在工具栏区 */
export function ReportCenterMetrics({
  templateCount,
  prefabCount,
  defaultReport,
  defaultReportStale,
  defaultLoading,
}: Props) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <Metric label="授权模板" value={templateCount} />
      <Metric label="预制分析" value={prefabCount} />
      {defaultLoading ? (
        <Skeleton className="h-12 w-28 rounded-md" />
      ) : defaultReport ? (
        <div className="flex min-w-0 items-center gap-2 rounded-md border border-brand-200 bg-brand-50/50 px-2.5 py-1.5 dark:border-brand-500/30 dark:bg-brand-500/5">
          <Star className="size-3.5 shrink-0 text-brand-600 dark:text-brand-400" aria-hidden />
          <div className="min-w-0">
            <p className="text-[11px] text-gray-500">角色默认</p>
            <p className="max-w-[8rem] truncate text-theme-sm font-medium text-gray-800 dark:text-white/90">
              {defaultReport.name}
            </p>
          </div>
          <Button type="button" size="sm" variant="primary" className="h-8 px-2.5" asChild>
            <Link to={`/admin/reports/view/${defaultReport.id}`}>打开</Link>
          </Button>
        </div>
      ) : defaultReportStale ? (
        <Metric label="角色默认" value="未同步" className="border border-amber-200 bg-amber-50/50 dark:border-amber-500/30" />
      ) : (
        <Metric label="角色默认" value="未设置" />
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

/** 页头次要操作（管理员） */
export function ReportCenterHeaderActions({ canManage }: { canManage: boolean }) {
  if (!canManage) return null;
  return (
    <Button type="button" variant="outline" size="sm" asChild>
      <Link to="/admin/reports/schedules">
        <CalendarClock className="size-4" aria-hidden />
        定时调度
      </Link>
    </Button>
  );
}
