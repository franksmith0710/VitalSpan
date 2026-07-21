import { dwTableMeta } from "@/components/dashboard/dashboardWidgetTypography";
import { cn } from "@/lib/utils";

type TableStatusBarProps = {
  totalRows: number;
  page?: number;
  totalPages?: number;
  pageSize?: number;
  className?: string;
};

/** 表格底栏：无分页时显示总行数；有分页时由 TablePaginationBar 承担 */
export function TableStatusBar({ totalRows, className }: TableStatusBarProps) {
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
    </div>
  );
}
