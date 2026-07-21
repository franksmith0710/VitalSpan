import { useCallback, useEffect, useMemo, useRef, type CSSProperties } from "react";
import { Table2 } from "lucide-react";
import { useScrollTop, useTableVirtualRows } from "@/components/charts/engine/d3/table/useTableVirtualRows";
import { useEmbeddedChartLiveResize } from "@/hooks/useEmbeddedChartLiveResize";
import { dwTableCell } from "@/components/dashboard/dashboardWidgetTypography";
import { cn } from "@/lib/utils";
import type { ColorScheme } from "@/components/dashboard/dashboardStyleConfig";
import type { NumberFormatConfig } from "@/components/dashboard/dashboardStyleConfig";
import type { ChartDeTableStyle } from "@/lib/chartDeTableStyle";
import type { DepthVisualLevel } from "@/components/charts/engine/d3/core/chartVisualTokens";
import {
  computeTableSummaryValues,
  DEFAULT_TABLE_PAGE_SIZE,
  resolveTableSummaryColumns,
  resolveTableZebraBg,
} from "@/lib/chartDeTableStyle";
import { formatTableCellValue } from "@/lib/chartValueFormat";
import { withBackgroundAlpha } from "@/lib/widgetSurfaceBackground";
import { TablePaginationBar } from "@/components/charts/adapters/TablePaginationBar";
import { resolveEffectiveColumnWidthMode } from "@/components/charts/engine/d3/table/resolveTableLayoutMode";
import { columnAlignClass, resolveColumnAlign } from "@/components/charts/engine/d3/table/tableColumnAlign";
import { sortTableRows, useTableClientSort } from "@/components/charts/engine/d3/table/tableClientSort";
import { SortableHeaderCell } from "@/components/charts/engine/d3/table/SortableHeaderCell";
import { TableScrollRegion } from "@/components/charts/engine/d3/table/TableScrollRegion";
import { TableStatusBar } from "@/components/charts/engine/d3/table/TableStatusBar";
import { TableResizeHandle } from "@/components/charts/engine/d3/table/TableResizeHandle";
import { TableResizeGuide } from "@/components/charts/engine/d3/table/TableResizeGuide";
import { useTableLayoutResize } from "@/components/charts/engine/d3/table/useTableLayoutResize";
import type { TableColumnMeta } from "@/components/charts/engine/d3/table/types";

export type VitalSpanTableProps = {
  columns: string[];
  columnMeta?: TableColumnMeta[];
  displayCols: string[];
  rows: unknown[][];
  page: number;
  onPageChange: (page: number) => void;
  panel?: boolean;
  tableStyle?: ChartDeTableStyle;
  themeVars?: Record<string, string>;
  surfaceScheme?: ColorScheme;
  valueFormat?: NumberFormatConfig;
  drillField?: string;
  onDrillCellClick?: (field: string, value: string) => void;
  metricFields?: string[];
  embedded?: boolean;
  showSeriesNumber?: boolean;
  /** 启用 AntV 式行列拖拽（默认开启） */
  layoutInteractive?: boolean;
  onTableStylePatch?: (patch: Partial<ChartDeTableStyle>) => void;
  testId?: string;
  depthVisual?: DepthVisualLevel;
};

const SERIES_FIELD = "__vs_series__";

function headerLabel(field: string, columnMeta?: TableColumnMeta[]): string {
  return columnMeta?.find((m) => m.field === field)?.label ?? field;
}

function scrollbarStyle(
  color: string | undefined,
  themeVars?: Record<string, string>,
): CSSProperties | undefined {
  if (themeVars && Object.keys(themeVars).length > 0) return themeVars as CSSProperties;
  if (!color) return undefined;
  return {
    ["--dashboard-scroll-thumb" as string]: color,
    ["--dashboard-scroll-thumb-hover" as string]: color,
    scrollbarColor: `${color} var(--dashboard-scroll-track, transparent)`,
  };
}

function bodyCellClass(wordWrap: boolean): string {
  return cn(
    "vs-table-td",
    dwTableCell,
    wordWrap ? "whitespace-normal break-words" : "truncate",
    "align-middle",
  );
}

/**
 * VitalSpan 自研表格（D3 引擎域）：对标 DataEase 明细/汇总表视觉与交互
 */
export function VitalSpanTable({
  columns,
  columnMeta,
  displayCols,
  rows,
  page,
  onPageChange,
  panel = false,
  tableStyle = {},
  themeVars,
  surfaceScheme: _surfaceScheme = "light",
  valueFormat,
  drillField,
  onDrillCellClick,
  metricFields,
  embedded = false,
  showSeriesNumber = false,
  layoutInteractive = true,
  onTableStylePatch,
  testId = "d3-table-chart",
  depthVisual,
}: VitalSpanTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const { sort, toggle: toggleSort } = useTableClientSort();
  const remeasureLayout = useCallback(() => {
    void containerRef.current?.getBoundingClientRect();
  }, []);
  useEmbeddedChartLiveResize(embedded, containerRef, remeasureLayout);

  const pageSize = tableStyle.pageSize ?? DEFAULT_TABLE_PAGE_SIZE;
  const paginationMode = tableStyle.paginationMode ?? "page";
  const wordWrap = tableStyle.wordWrap ?? false;
  const rowHover = tableStyle.rowHover !== false;
  const density = tableStyle.paginationVariant === "compact" ? "compact" : "comfortable";
  const zebraBg =
    resolveTableZebraBg(tableStyle) ??
    (typeof themeVars?.["--dashboard-table-zebra-bg"] === "string"
      ? themeVars["--dashboard-table-zebra-bg"]
      : undefined);
  const opacity = tableStyle.opacity != null ? tableStyle.opacity / 100 : 1;
  const borderColor = tableStyle.borderColor;
  const panelBackground =
    opacity < 1 ? withBackgroundAlpha("var(--dashboard-widget-surface)", opacity) : undefined;

  const sortedRows = useMemo(() => sortTableRows(rows, columns, sort), [columns, rows, sort]);
  const skipSortPageReset = useRef(true);

  useEffect(() => {
    if (skipSortPageReset.current) {
      skipSortPageReset.current = false;
      return;
    }
    onPageChange(1);
  }, [sort, onPageChange]);

  const usePagination = paginationMode === "page" && sortedRows.length > pageSize;
  const scrollMode = paginationMode === "scroll";
  const pageRows = usePagination
    ? sortedRows.slice((page - 1) * pageSize, page * pageSize)
    : sortedRows;
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));

  const layoutColumnCount = displayCols.length + (showSeriesNumber ? 1 : 0);
  const columnWidthMode = resolveEffectiveColumnWidthMode(tableStyle.columnWidthMode, layoutColumnCount);

  const handleLayoutCommit = useCallback(
    (patch: Parameters<typeof onTableStylePatch>[0]) => {
      onTableStylePatch?.({
        ...patch,
        columnWidthMode: "custom",
      });
    },
    [onTableStylePatch],
  );

  const {
    layout: pixelLayout,
    pixelActive,
    guide,
    startColumnResize,
    startSeriesResize,
    startRowResize,
    autoFitColumn,
    setAutoFitContext,
  } = useTableLayoutResize({
    columns: displayCols,
    showSeriesNumber,
    initial: {
      columnWidthsPx: tableStyle.columnWidthsPx,
      seriesColumnWidthPx: tableStyle.seriesColumnWidthPx,
      rowHeightPx: tableStyle.rowHeightPx,
    },
    enabled: layoutInteractive,
    tableRef,
    onCommit: onTableStylePatch ? handleLayoutCommit : undefined,
  });

  useEffect(() => {
    if (!layoutInteractive) {
      setAutoFitContext(null);
      return;
    }
    setAutoFitContext({
      columns,
      displayCols,
      rows: sortedRows,
      showSeriesNumber,
      headerLabel: (field) => headerLabel(field, columnMeta),
      formatCell: (value) => formatTableCellValue(value, valueFormat),
    });
  }, [
    columnMeta,
    columns,
    displayCols,
    layoutInteractive,
    setAutoFitContext,
    showSeriesNumber,
    sortedRows,
    valueFormat,
  ]);

  const usePixelLayout = pixelActive || guide != null;
  const useFixedLayout = usePixelLayout || columnWidthMode === "auto" || columnWidthMode === "custom";
  const useContentLayout = usePixelLayout || columnWidthMode === "fixed";
  const freezeLead = useContentLayout && layoutColumnCount > 1;
  const applyRowHeight = usePixelLayout;

  const { scrollTop, viewportHeight } = useScrollTop(scrollRef);
  const virtual = useTableVirtualRows({
    rowCount: pageRows.length,
    rowHeightPx: pixelLayout.rowHeightPx,
    scrollTop,
    viewportHeight,
    enabled: scrollMode,
  });
  const visibleRows = virtual.active ? pageRows.slice(virtual.start, virtual.end) : pageRows;
  const virtualOffset = virtual.active ? virtual.start : 0;

  const cellClass = bodyCellClass(wordWrap);
  const rowStyle = applyRowHeight
    ? { height: pixelLayout.rowHeightPx, maxHeight: pixelLayout.rowHeightPx }
    : undefined;
  const mergedThemeStyle = (themeVars ?? {}) as CSSProperties;

  const equalPct = layoutColumnCount > 0 ? 100 / layoutColumnCount : 100;
  const resolveColWidth = (col: string): string | undefined => {
    if (usePixelLayout) {
      if (col === SERIES_FIELD) {
        return showSeriesNumber ? `${pixelLayout.seriesColumnWidthPx}px` : undefined;
      }
      const px = pixelLayout.columnWidthsPx[col];
      return px != null ? `${px}px` : undefined;
    }
    if (col === SERIES_FIELD) return showSeriesNumber ? `${Math.min(equalPct, 8)}%` : undefined;
    if (columnWidthMode === "custom") {
      const custom = tableStyle.columnWidths?.[col];
      if (custom != null && custom > 0) return `${custom}%`;
      return `${equalPct}%`;
    }
    if (columnWidthMode === "auto") return `${equalPct}%`;
    return undefined;
  };

  const summaryColumns = resolveTableSummaryColumns(columns, displayCols, sortedRows, {
    metricFields,
    showSummary: tableStyle.showSummary,
  });
  const summaryValues =
    summaryColumns.length > 0
      ? computeTableSummaryValues(columns, displayCols, sortedRows, summaryColumns)
      : null;
  const summaryLabelCol =
    summaryValues &&
    displayCols.find((col) => !summaryColumns.includes(col) || summaryValues[col] == null);

  if (rows.length === 0) {
    return (
      <div
        ref={containerRef}
        className={cn(
          "embedded-chart-table-host flex min-h-0 w-full min-w-0 flex-col items-center justify-center gap-2 px-3 py-8 text-center",
          embedded ? "absolute inset-0" : panel ? undefined : "h-full",
        )}
        style={{
          ...mergedThemeStyle,
          ...(panelBackground ? { backgroundColor: panelBackground } : null),
          color: "var(--dashboard-table-empty-fg, #98a2b3)",
        }}
        data-testid={testId}
      >
        <Table2 className="size-8 opacity-40" aria-hidden />
        <p className="text-theme-sm">暂无数据</p>
      </div>
    );
  }

  const seriesOffset = showSeriesNumber ? (page - 1) * pageSize : 0;
  const tableStyleVars = {
    ...mergedThemeStyle,
    ["--vs-table-sticky-offset" as string]: showSeriesNumber
      ? `${pixelLayout.seriesColumnWidthPx}px`
      : "0px",
  } as CSSProperties;

  return (
    <div
      ref={containerRef}
      className={cn(
        "embedded-chart-table-host vs-chart-table-host flex min-h-0 w-full min-w-0 flex-col overflow-hidden",
        embedded ? "absolute inset-0 rounded-none" : "h-full rounded-xl",
        panel && "rounded-lg",
      )}
      style={{
        ...tableStyleVars,
        ...(panelBackground ? { backgroundColor: panelBackground } : null),
        border: embedded
          ? undefined
          : borderColor
            ? `1px solid ${borderColor}`
            : "1px solid var(--dashboard-table-border, #f2f4f7)",
      }}
      data-testid={testId}
      {...(layoutInteractive ? { "data-pixel-no-drag": true } : {})}
    >
      <TableResizeGuide guide={guide} />
      <TableScrollRegion
        ref={scrollRef}
        className={panel ? "overflow-x-only" : undefined}
        style={scrollbarStyle(tableStyle.scrollbarColor, themeVars)}
        edgeDeps={[displayCols.length, pageRows.length, freezeLead, virtual.active]}
      >
        <table
          ref={tableRef}
          className={cn(
            "dashboard-chart-table vs-chart-table w-full border-separate border-spacing-0 text-left",
            useFixedLayout
              ? cn("table-fixed", useContentLayout ? "w-max min-w-full" : "min-w-full")
              : useContentLayout
                ? "table-auto w-max min-w-full"
                : cn("table-auto", embedded ? "w-max min-w-full" : "min-w-0"),
          )}
          data-layout-interactive={layoutInteractive ? "" : undefined}
          data-row-hover={rowHover ? "" : undefined}
          data-density={density}
          data-zebra={zebraBg ? "" : undefined}
          data-freeze-lead={freezeLead ? "" : undefined}
          data-depth-visual={depthVisual !== "off" && depthVisual ? depthVisual : undefined}
          style={tableStyleVars}
        >
          {useFixedLayout ? (
            <colgroup>
              {showSeriesNumber ? (
                <col key={SERIES_FIELD} style={{ width: resolveColWidth(SERIES_FIELD) }} />
              ) : null}
              {displayCols.map((c) => (
                <col key={c} style={resolveColWidth(c) ? { width: resolveColWidth(c) } : undefined} />
              ))}
            </colgroup>
          ) : null}
          <thead className="relative">
            <tr className="relative">
              {showSeriesNumber ? (
                <SortableHeaderCell
                  label="#"
                  field={SERIES_FIELD}
                  align="center"
                  sort={sort}
                  sortable={false}
                  sticky={freezeLead ? "lead" : false}
                  resizable={layoutInteractive}
                  className={cn(cellClass)}
                  onSort={toggleSort}
                  onColumnResize={startSeriesResize}
                  onColumnAutoFit={layoutInteractive ? autoFitColumn : undefined}
                />
              ) : null}
              {displayCols.map((c, colIndex) => {
                const idx = columns.indexOf(c);
                const align = resolveColumnAlign(c, sortedRows, idx);
                const sticky =
                  freezeLead && colIndex === 0 ? (showSeriesNumber ? "first" : "lead") : false;
                return (
                  <SortableHeaderCell
                    key={c}
                    label={headerLabel(c, columnMeta)}
                    field={c}
                    align={align}
                    sort={sort}
                    sortable
                    sticky={sticky}
                    resizable={layoutInteractive}
                    className={cn(cellClass, useContentLayout && "min-w-[5.5rem]")}
                    onSort={toggleSort}
                    onColumnResize={(event) => startColumnResize(c, event)}
                    onColumnAutoFit={layoutInteractive ? autoFitColumn : undefined}
                  />
                );
              })}
            </tr>
            {layoutInteractive ? (
              <tr className="vs-table-row-resize pointer-events-none" aria-hidden>
                <td colSpan={Math.max(layoutColumnCount, 1)} className="relative h-0 border-0 p-0">
                  <TableResizeHandle
                    orientation="row"
                    className="pointer-events-auto -top-1"
                    onPointerDown={startRowResize}
                  />
                </td>
              </tr>
            ) : null}
          </thead>
          <tbody style={virtual.active ? { height: virtual.totalHeight } : undefined}>
            {virtual.active ? (
              <tr aria-hidden style={{ height: virtual.offsetY, border: 0 }}>
                <td colSpan={Math.max(layoutColumnCount, 1)} className="border-0 p-0" />
              </tr>
            ) : null}
            {visibleRows.map((row, i) => (
              <tr key={`${page}-${virtualOffset + i}`}>
                {showSeriesNumber ? (
                  <td
                    data-sticky={freezeLead ? "lead" : undefined}
                    className={cn(
                      cellClass,
                      "vs-table-index text-[var(--dashboard-table-index-fg,#667085)]",
                      columnAlignClass("center"),
                      freezeLead && "vs-table-sticky-col vs-table-sticky-lead",
                    )}
                    style={rowStyle}
                  >
                    {seriesOffset + virtualOffset + i + 1}
                  </td>
                ) : null}
                {displayCols.map((c, colIndex) => {
                  const idx = columns.indexOf(c);
                  const raw = idx >= 0 ? row[idx] : "";
                  const text = formatTableCellValue(raw, valueFormat);
                  const align = resolveColumnAlign(c, sortedRows, idx);
                  const drillable = drillField === c && onDrillCellClick && text !== "";
                  const sticky =
                    freezeLead && colIndex === 0 ? (showSeriesNumber ? "first" : "lead") : undefined;
                  return (
                    <td
                      key={c}
                      data-sticky={sticky}
                      title={text}
                      className={cn(
                        cellClass,
                        columnAlignClass(align),
                        "text-[var(--dashboard-table-body-fg,#344054)]",
                        useContentLayout && "min-w-[5.5rem] whitespace-nowrap",
                        sticky === "lead" && "vs-table-sticky-col vs-table-sticky-lead",
                        sticky === "first" && "vs-table-sticky-col vs-table-sticky-first",
                        drillable && "vs-table-drillable",
                      )}
                      style={rowStyle}
                      onClick={
                        drillable
                          ? (event) => {
                              event.stopPropagation();
                              onDrillCellClick(c, String(raw ?? ""));
                            }
                          : undefined
                      }
                    >
                      {text}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          {summaryValues ? (
            <tfoot>
              <tr className="vs-table-summary-row">
                {showSeriesNumber ? (
                  <td
                    data-sticky={freezeLead ? "lead" : undefined}
                    className={cn(cellClass, freezeLead && "vs-table-sticky-col vs-table-sticky-lead")}
                  />
                ) : null}
                {displayCols.map((c, colIndex) => {
                  const raw = summaryValues[c];
                  const isLabelCell = c === summaryLabelCol && raw == null;
                  const text = isLabelCell
                    ? "合计"
                    : raw != null
                      ? formatTableCellValue(raw, valueFormat)
                      : "";
                  const idx = columns.indexOf(c);
                  const align = resolveColumnAlign(c, sortedRows, idx);
                  const sticky =
                    freezeLead && colIndex === 0 ? (showSeriesNumber ? "first" : "lead") : undefined;
                  return (
                    <td
                      key={c}
                      data-sticky={sticky}
                      title={text}
                      className={cn(
                        cellClass,
                        "font-semibold",
                        columnAlignClass(align),
                        sticky === "lead" && "vs-table-sticky-col vs-table-sticky-lead",
                        sticky === "first" && "vs-table-sticky-col vs-table-sticky-first",
                      )}
                    >
                      {text}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          ) : null}
        </table>
      </TableScrollRegion>
      {usePagination ? (
        <TablePaginationBar
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalRows={sortedRows.length}
          tableStyle={tableStyle}
          onPageChange={onPageChange}
        />
      ) : (
        <TableStatusBar totalRows={sortedRows.length} />
      )}
    </div>
  );
}
