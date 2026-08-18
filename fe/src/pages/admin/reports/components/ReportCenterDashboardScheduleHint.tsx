import { Link } from "react-router";
import { Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dashboardsListForScheduleCreate } from "@/lib/scheduleSourceMeta";
import { VISUAL_SCHEDULE_PRODUCT_LINE } from "@/lib/reportCenterNav";

type Props = {
  canManageSchedules?: boolean;
};

/** 工作台主栏：指路看板/大屏 PDF 定时主路径（创建在分享页，运维在调度页） */
export function ReportCenterDashboardScheduleHint({ canManageSchedules }: Props) {
  return (
    <section
      aria-label="看板与大屏 PDF 定时说明"
      className="rounded-2xl border border-brand-200/80 bg-brand-50/40 p-4 shadow-theme-xs dark:border-brand-500/25 dark:bg-brand-500/5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
          <Monitor className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
            看板/大屏 PDF 定时
          </h2>
          <p className="mt-1 text-theme-xs leading-relaxed text-gray-600 dark:text-gray-400">
            {VISUAL_SCHEDULE_PRODUCT_LINE}创建后可在「调度与投递」统一管理执行与失败重试。
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" asChild>
              <Link to={dashboardsListForScheduleCreate()}>去看板创建</Link>
            </Button>
            {canManageSchedules ? (
              <Button type="button" variant="outline" size="sm" asChild>
                <Link to="/admin/reports/schedules?tab=dashboard">管理看板调度</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
