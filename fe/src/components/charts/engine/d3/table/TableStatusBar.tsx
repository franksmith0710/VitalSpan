import { dwTableMeta } from "@/components/dashboard/dashboardWidgetTypography";
import { cn } from "@/lib/utils";

type TableStatusBarProps = {
  totalRows: number;
  scrollMode?: boolean;
  className?: string;
};

/** 表格底栏：下拉模式显示滚动提示；翻页模式由 TablePaginationBar 承担 */
export function TableStatusBar({ totalRows, scrollMode, className }: TableStatusBarProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-between border-t border-[var(--dashboard-table-border,#f2f4f7)]",
        "bg-[var(--dashboard-table-footer-bg,var(--dashboard-table-header-bg,#f9fafb))] px-3 py-1.5",
        className,
      )}
      data-testid="table-status-bar"
    >
      <span className={dwTableMeta}>共 {totalRows.toLocaleString("zh-CN")} 条</span>
      {scrollMode ? (
        <span className={cn(dwTableMeta, "text-[var(--dashboard-table-pagination-fg,inherit)]")}>
          下拉滚动浏览
        </span>
      ) : null}
    </div>
  );
}
