import type { CSSProperties } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/button";
import { dwTableCell, dwTableMeta } from "@/components/dashboard/dashboardWidgetTypography";
import { cn } from "@/lib/utils";
import type { NumberFormatConfig } from "@/components/dashboard/dashboardStyleConfig";
import type { ChartDeTableStyle } from "@/lib/chartDeTableStyle";
import { formatTableCellValue } from "@/lib/chartValueFormat";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/lib/chartDeTableStyle";
import { withBackgroundAlpha } from "@/lib/widgetSurfaceBackground";

type EmbeddedChartTableProps = {
  columns: string[];
  displayCols: string[];
  rows: unknown[][];
  page: number;
  onPageChange: (page: number) => void;
  panel?: boolean;
  tableStyle?: ChartDeTableStyle;
  valueFormat?: NumberFormatConfig;
};

function scrollbarStyle(color?: string): CSSProperties | undefined {
  if (!color) return undefined;
  return {
    ["--dashboard-scroll-thumb" as string]: color,
    ["--dashboard-scroll-thumb-hover" as string]: color,
    scrollbarColor: `${color} var(--dashboard-scroll-track, transparent)`,
  };
}

/**
 * 看板内嵌表格：对标 DataEase 明细表样式与分页
 */
export function EmbeddedChartTable({
  columns,
  displayCols,
  rows,
  page,
  onPageChange,
  panel = false,
  tableStyle = {},
  valueFormat,
}: EmbeddedChartTableProps) {
  const pageSize = tableStyle.pageSize ?? DEFAULT_TABLE_PAGE_SIZE;
  const paginationMode = tableStyle.paginationMode ?? "page";
  const paginationVariant = tableStyle.paginationVariant ?? "compact";
  const wordWrap = tableStyle.wordWrap ?? false;
  const rowHover = tableStyle.rowHover !== false;
  const opacity = tableStyle.opacity != null ? tableStyle.opacity / 100 : 1;
  const borderColor = tableStyle.borderColor;
  const panelBackground =
    opacity < 1
      ? withBackgroundAlpha("var(--dashboard-widget-surface)", opacity)
      : undefined;

  const usePagination = paginationMode === "page" && rows.length > pageSize;
  const pageRows = usePagination
    ? rows.slice((page - 1) * pageSize, page * pageSize)
    : rows;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const columnWidthMode = tableStyle.columnWidthMode ?? "auto";
  const useFixedLayout = columnWidthMode === "fixed" || columnWidthMode === "custom";
  const equalPct = displayCols.length > 0 ? 100 / displayCols.length : 100;

  const resolveColWidth = (col: string): string | undefined => {
    if (columnWidthMode === "custom") {
      const custom = tableStyle.columnWidths?.[col];
      if (custom != null && custom > 0) return `${custom}%`;
      return `${equalPct}%`;
    }
    if (columnWidthMode === "fixed") return `${equalPct}%`;
    return undefined;
  };
  const cellClass = cn(
    dwTableCell,
    wordWrap ? "whitespace-normal break-words" : "truncate",
  );

  return (
    <div
      className={cn("flex min-h-0 w-full min-w-0 flex-col", panel ? undefined : "h-full")}
      style={{
        ...(panelBackground ? { backgroundColor: panelBackground } : null),
        ...(borderColor ? { border: `1px solid ${borderColor}`, borderRadius: 4 } : null),
      }}
    >
      <div
        className={cn(
          "dashboard-scroll min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain",
          panel && "overflow-x-only",
        )}
        style={scrollbarStyle(tableStyle.scrollbarColor)}
      >
        <table
          className={cn(
            "dashboard-chart-table w-full text-left",
            useFixedLayout ? "table-fixed min-w-full" : "table-auto min-w-0",
            panel ? "min-w-[320px]" : "w-full",
          )}
        >
          {useFixedLayout ? (
            <colgroup>
              {displayCols.map((c) => {
                const width = resolveColWidth(c);
                return <col key={c} style={width ? { width } : undefined} />;
              })}
            </colgroup>
          ) : null}
          <thead className="sticky top-0 z-[1] bg-[var(--dashboard-table-header-bg,#f9fafb)]">
            <tr>
              {displayCols.map((c) => (
                <th
                  key={c}
                  title={c}
                  className={cn(cellClass, "font-medium text-[var(--dashboard-table-header-fg,#667085)]")}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <tr
                key={i}
                className={cn(
                  "border-t border-[var(--dashboard-table-border,#f2f4f7)]",
                  rowHover && "hover:bg-black/[0.03] dark:hover:bg-white/[0.04]",
                )}
              >
                {displayCols.map((c) => {
                  const idx = columns.indexOf(c);
                  const raw = idx >= 0 ? row[idx] : "";
                  const text = formatTableCellValue(raw, valueFormat);
                  return (
                    <td key={c} title={text} className={cn(cellClass, "text-[var(--dashboard-table-body-fg,#344054)]")}>
                      {text}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {usePagination ? (
        paginationVariant === "compact" ? (
          <div className="flex shrink-0 items-center justify-between gap-1 border-t border-[var(--dashboard-table-border,#f2f4f7)] px-2 py-1.5">
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
              {page}/{totalPages} · {pageSize}条/页
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
        ) : (
          <div className="mt-1 flex shrink-0 flex-wrap items-center gap-1.5 border-t border-[var(--dashboard-table-border,#f2f4f7)] px-2 py-1.5">
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
              第 {page}/{totalPages} 页，共 {rows.length} 条
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
        )
      ) : null}
    </div>
  );
}
