import { useCallback, useMemo, useRef, type CSSProperties } from "react";
import { useEmbeddedChartLiveResize } from "@/hooks/useEmbeddedChartLiveResize";
import { dwTableCell } from "@/components/dashboard/dashboardWidgetTypography";
import { cn } from "@/lib/utils";
import type { ChartDeTableStyle } from "@/lib/chartDeTableStyle";
import { resolveTableZebraBg } from "@/lib/chartDeTableStyle";
import { formatTableCellValue } from "@/lib/chartValueFormat";
import type { NumberFormatConfig } from "@/components/dashboard/dashboardStyleConfig";
import {
  resolveTableHostBorder,
  resolveTableHostOpacity,
  resolveTableScrollbarStyle,
} from "@/lib/chartSurfaceTheme";
import {
  buildTableColumnWidthPlan,
  resolveEffectiveColumnWidthMode,
} from "@/components/charts/engine/d3/table/resolveTableLayoutMode";
import { TABLE_DEFAULT_COL_PX } from "@/components/charts/engine/d3/table/tableLayoutConstants";
import { TableResizeHandle } from "@/components/charts/engine/d3/table/TableResizeHandle";
import { useTableLayoutResize } from "@/components/charts/engine/d3/table/useTableLayoutResize";
import type { PivotTableModel } from "@/components/charts/engine/d3/table/types";
import type { DepthVisualLevel } from "@/components/charts/engine/d3/core/chartVisualTokens";

export const PIVOT_ROW_FIELD = "__pivot_row__";
export const PIVOT_TOTAL_FIELD = "__pivot_total__";
export const pivotColField = (colKey: string) => `pivot:${colKey}`;

type TablePivotGridProps = {
  model: PivotTableModel;
  tableStyle?: ChartDeTableStyle;
  themeVars?: Record<string, string>;
  valueFormat?: NumberFormatConfig;
  embedded?: boolean;
  testId?: string;
  layoutInteractive?: boolean;
  onTableStylePatch?: (patch: Partial<ChartDeTableStyle>) => void;
  depthVisual?: DepthVisualLevel;
};

function sumMetric(
  model: PivotTableModel,
  rowKey: string | null,
  colKey: string | null,
  metricField: string,
): number {
  let total = 0;
  const rowKeys = rowKey != null ? [rowKey] : model.rowKeys;
  const colKeys = colKey != null ? [colKey] : model.colKeys;
  for (const rk of rowKeys) {
    for (const ck of colKeys) {
      total += model.cells[rk]?.[ck]?.[metricField] ?? 0;
    }
  }
  return total;
}

export function TablePivotGrid({
  model,
  tableStyle = {},
  themeVars,
  valueFormat,
  embedded = false,
  testId = "d3-table-chart",
  layoutInteractive = false,
  onTableStylePatch,
  depthVisual,
}: TablePivotGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const remeasureLayout = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    void el.getBoundingClientRect();
  }, []);
  useEmbeddedChartLiveResize(embedded, containerRef, remeasureLayout);

  const showTotals = tableStyle.showSummary !== false;
  const resizeColumns = useMemo(() => {
    const cols = [PIVOT_ROW_FIELD, ...model.colKeys.map(pivotColField)];
    if (showTotals && model.showRowTotal) cols.push(PIVOT_TOTAL_FIELD);
    return cols;
  }, [model.colKeys, model.showRowTotal, showTotals]);

  const { layout, guide, startColumnResize, startRowResize } = useTableLayoutResize({
    columns: resizeColumns,
    showSeriesNumber: false,
    initial: {
      columnWidthsPx: tableStyle.columnWidthsPx,
      rowHeightPx: tableStyle.rowHeightPx,
    },
    enabled: layoutInteractive,
    tableRef,
    onCommit: (patch) =>
      onTableStylePatch?.({
        ...patch,
        columnWidthMode: "custom",
      }),
  });

  const columnWidthMode = resolveEffectiveColumnWidthMode(
    tableStyle.columnWidthMode,
    resizeColumns.length,
  );
  const contentScroll = columnWidthMode === "fixed";

  const wordWrap = tableStyle.wordWrap ?? false;
  const rowHover = tableStyle.rowHover !== false;
  const zebraBg = resolveTableZebraBg(tableStyle);
  const density = tableStyle.paginationVariant === "compact" ? "compact" : "comfortable";
  const hostOpacity = resolveTableHostOpacity(tableStyle);
  const borderColor = tableStyle.borderColor;
  const cellClass = cn("vs-table-td", dwTableCell, wordWrap ? "whitespace-normal break-words" : "truncate");
  const headerClass = cn("vs-table-th", cellClass, "font-medium text-[var(--dashboard-table-header-fg,#667085)]");
  const mergedThemeStyle = (themeVars ?? {}) as CSSProperties;
  const metricCount = model.metrics.length;
  const colSpanUnit = metricCount;
  const usePixelLayout =
    columnWidthMode === "custom" &&
    layoutInteractive &&
    Object.keys(layout.columnWidthsPx).length > 0;
  const rowStyle =
    tableStyle.rowHeightPx || (layoutInteractive && layout.rowHeightPx)
      ? ({
          height: `${layout.rowHeightPx ?? tableStyle.rowHeightPx}px`,
        } as CSSProperties)
      : undefined;

  const colWidth = (field: string) =>
    layout.columnWidthsPx[field] ? `${layout.columnWidthsPx[field]}px` : undefined;

  const metricColWidth = (colKey: string) => {
    const group = layout.columnWidthsPx[pivotColField(colKey)];
    if (!group || metricCount <= 1) return group ? `${group}px` : undefined;
    return `${Math.max(48, Math.floor(group / metricCount))}px`;
  };

  if (model.rowKeys.length === 0 || model.colKeys.length === 0) {
    return (
      <div
        ref={containerRef}
        className={cn(
          "flex min-h-0 w-full items-center justify-center px-3 py-6 text-center",
          embedded && "absolute inset-0",
        )}
        style={mergedThemeStyle}
        data-testid={testId}
      >
        暂无数据
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "vs-chart-table-host embedded-chart-table-host flex min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-xl",
        embedded ? "absolute inset-0 rounded-none" : "h-full",
      )}
      style={{
        ...mergedThemeStyle,
        opacity: hostOpacity,
        border: resolveTableHostBorder(borderColor),
      }}
      data-testid={testId}
      {...(layoutInteractive ? { "data-pixel-no-drag": true } : {})}
    >
      <TableResizeGuide guide={guide} />
      <div
        className="vs-table-scroll dashboard-scroll min-h-0 flex-1 overflow-auto overscroll-contain"
        style={resolveTableScrollbarStyle(tableStyle, themeVars)}
      >
        <table
          ref={tableRef}
          className={cn(
            "dashboard-chart-table vs-chart-table text-left table-fixed",
            contentScroll || usePixelLayout ? "w-max min-w-full" : "min-w-full w-full",
          )}
          data-column-width-mode={columnWidthMode}
          data-layout-interactive={layoutInteractive ? "" : undefined}
          data-row-hover={rowHover ? "" : undefined}
          data-zebra={zebraBg ? "" : undefined}
          data-density={density}
          data-depth-visual={depthVisual !== "off" && depthVisual ? depthVisual : undefined}
        >
          {usePixelLayout ? (
            <colgroup>
              <col style={{ width: colWidth(PIVOT_ROW_FIELD) }} />
              {model.colKeys.flatMap((ck) =>
                model.metrics.map((metric) => (
                  <col key={`${ck}-${metric.field}`} style={{ width: metricColWidth(ck) }} />
                )),
              )}
              {showTotals && model.showRowTotal ? (
                <col style={{ width: colWidth(PIVOT_TOTAL_FIELD) }} />
              ) : null}
            </colgroup>
          ) : contentScroll ? (
            <colgroup>
              <col style={{ width: `${TABLE_DEFAULT_COL_PX}px` }} />
              {model.colKeys.flatMap((ck) =>
                model.metrics.map((metric) => (
                  <col key={`${ck}-${metric.field}`} style={{ width: `${TABLE_DEFAULT_COL_PX}px` }} />
                )),
              )}
              {showTotals && model.showRowTotal ? (
                <col style={{ width: `${TABLE_DEFAULT_COL_PX}px` }} />
              ) : null}
            </colgroup>
          ) : null}
          <thead className="sticky top-0 z-[1] bg-[var(--dashboard-table-header-bg,#f9fafb)]">
            <tr>
              <th
                rowSpan={metricCount > 1 ? 2 : 1}
                className={cn(headerClass, "group/th relative")}
              >
                {model.rowLabel}
                {layoutInteractive ? (
                  <TableResizeHandle
                    orientation="column"
                    onPointerDown={(event) => startColumnResize(PIVOT_ROW_FIELD, event)}
                  />
                ) : null}
              </th>
              {model.colKeys.map((ck) => (
                <th
                  key={ck}
                  colSpan={colSpanUnit}
                  className={cn(headerClass, "group/th relative text-center")}
                >
                  {ck}
                  {layoutInteractive ? (
                    <TableResizeHandle
                      orientation="column"
                      onPointerDown={(event) => startColumnResize(pivotColField(ck), event)}
                    />
                  ) : null}
                </th>
              ))}
              {showTotals && model.showRowTotal ? (
                <th
                  rowSpan={metricCount > 1 ? 2 : 1}
                  className={cn(headerClass, "group/th relative")}
                >
                  合计
                  {layoutInteractive ? (
                    <TableResizeHandle
                      orientation="column"
                      onPointerDown={(event) => startColumnResize(PIVOT_TOTAL_FIELD, event)}
                    />
                  ) : null}
                </th>
              ) : null}
            </tr>
            {metricCount > 1 ? (
              <tr>
                {model.colKeys.map((ck) =>
                  model.metrics.map((metric) => (
                    <th
                      key={`${ck}-${metric.field}`}
                      className={cn(headerClass, "text-center text-theme-xs font-medium")}
                    >
                      {metric.label}
                    </th>
                  )),
                )}
              </tr>
            ) : null}
            {layoutInteractive ? (
              <tr className="vs-table-row-resize pointer-events-none" aria-hidden>
                <td
                  colSpan={1 + model.colKeys.length * metricCount + (showTotals && model.showRowTotal ? 1 : 0)}
                  className="relative h-0 border-0 p-0"
                >
                  <TableResizeHandle
                    orientation="row"
                    className="pointer-events-auto -top-1"
                    onPointerDown={startRowResize}
                  />
                </td>
              </tr>
            ) : null}
          </thead>
          <tbody className="bg-[var(--dashboard-table-body-bg,transparent)]">
            {model.rowKeys.map((rk, rowIndex) => (
              <tr
                key={rk}
                className={cn(
                  "border-t border-[var(--dashboard-table-border,#f2f4f7)] transition-colors duration-150",
                  zebraBg && rowIndex % 2 === 1 && "bg-[var(--dashboard-table-zebra-bg)]",
                )}
              >
                <td
                  style={rowStyle}
                  className={cn(cellClass, "font-medium text-[var(--dashboard-table-body-fg,#344054)]")}
                >
                  {rk}
                </td>
                {model.colKeys.map((ck) =>
                  model.metrics.map((metric) => {
                    const raw = model.cells[rk]?.[ck]?.[metric.field] ?? 0;
                    const text = formatTableCellValue(raw, valueFormat);
                    return (
                      <td
                        key={`${rk}-${ck}-${metric.field}`}
                        style={rowStyle}
                        title={text}
                        className={cn(cellClass, "text-[var(--dashboard-table-body-fg,#344054)]")}
                      >
                        {text}
                      </td>
                    );
                  }),
                )}
                {showTotals && model.showRowTotal ? (
                  <td
                    style={rowStyle}
                    className={cn(cellClass, "font-medium text-[var(--dashboard-table-body-fg,#344054)]")}
                  >
                    {formatTableCellValue(
                      model.metrics.reduce((sum, m) => sum + sumMetric(model, rk, null, m.field), 0),
                      valueFormat,
                    )}
                  </td>
                ) : null}
              </tr>
            ))}
            {showTotals && model.showColTotal ? (
              <tr className="vs-table-summary-row border-t-2 border-[var(--dashboard-table-border,#f2f4f7)]">
                <td className={cn(cellClass, "font-medium")}>合计</td>
                {model.colKeys.map((ck) =>
                  model.metrics.map((metric) => (
                    <td key={`total-${ck}-${metric.field}`} className={cn(cellClass, "font-medium")}>
                      {formatTableCellValue(sumMetric(model, null, ck, metric.field), valueFormat)}
                    </td>
                  )),
                )}
                {model.showRowTotal ? (
                  <td className={cn(cellClass, "font-medium")}>
                    {formatTableCellValue(
                      model.metrics.reduce((sum, m) => sum + sumMetric(model, null, null, m.field), 0),
                      valueFormat,
                    )}
                  </td>
                ) : null}
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
