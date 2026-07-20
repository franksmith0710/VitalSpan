import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/button";
import { dwTableMeta } from "@/components/dashboard/dashboardWidgetTypography";
import type { ChartDeTableStyle } from "@/lib/chartDeTableStyle";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/lib/chartDeTableStyle";

type TablePaginationBarProps = {
  page: number;
  totalPages: number;
  pageSize: number;
  totalRows: number;
  tableStyle?: ChartDeTableStyle;
  onPageChange: (page: number) => void;
};

/** 对标 DataEase 表格分页器：精简 / 常规两种风格 */
export function TablePaginationBar({
  page,
  totalPages,
  pageSize,
  totalRows,
  tableStyle = {},
  onPageChange,
}: TablePaginationBarProps) {
  const paginationVariant = tableStyle.paginationVariant ?? "compact";
  const paginationFontSize = tableStyle.paginationFontSize;
  const fontStyle = paginationFontSize != null ? { fontSize: `${paginationFontSize}px` } : undefined;

  if (paginationVariant === "compact") {
    return (
      <div
        className="flex shrink-0 items-center justify-between gap-1 border-t border-[var(--dashboard-table-border,#f2f4f7)] px-2 py-1.5 text-[var(--dashboard-table-pagination-fg,inherit)]"
        style={fontStyle}
        data-testid="table-pagination-compact"
      >
        <IconButton
          type="button"
          variant="ghost"
          size="sm"
          className="size-8"
          disabled={page <= 1}
          aria-label="上一页"
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-4" />
        </IconButton>
        <span className={dwTableMeta}>
          {page}/{totalPages} · {pageSize || DEFAULT_TABLE_PAGE_SIZE}条/页
        </span>
        <IconButton
          type="button"
          variant="ghost"
          size="sm"
          className="size-8"
          disabled={page >= totalPages}
          aria-label="下一页"
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="size-4" />
        </IconButton>
      </div>
    );
  }

  return (
    <div
      className="mt-1 flex shrink-0 flex-wrap items-center gap-1.5 border-t border-[var(--dashboard-table-border,#f2f4f7)] px-2 py-1.5 text-[var(--dashboard-table-pagination-fg,inherit)]"
      style={fontStyle}
      data-testid="table-pagination-normal"
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 px-2.5 text-theme-sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        上一页
      </Button>
      <span className={dwTableMeta}>
        第 {page}/{totalPages} 页，共 {totalRows} 条
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 px-2.5 text-theme-sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        下一页
      </Button>
    </div>
  );
}
