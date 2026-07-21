import { useCallback, useRef, type CSSProperties } from "react";
import { useEmbeddedChartLiveResize } from "@/hooks/useEmbeddedChartLiveResize";
import { dwTableCell } from "@/components/dashboard/dashboardWidgetTypography";
import { cn } from "@/lib/utils";
import type { ChartDeTableStyle } from "@/lib/chartDeTableStyle";
import { resolveTableZebraBg } from "@/lib/chartDeTableStyle";
import { formatTableCellValue } from "@/lib/chartValueFormat";
import type { NumberFormatConfig } from "@/components/dashboard/dashboardStyleConfig";
import { withBackgroundAlpha } from "@/lib/widgetSurfaceBackground";
import type { PivotTableModel } from "@/components/charts/engine/d3/table/types";

type TablePivotGridProps = {
  model: PivotTableModel;
  tableStyle?: ChartDeTableStyle;
  themeVars?: Record<string, string>;
  valueFormat?: NumberFormatConfig;
  embedded?: boolean;
  testId?: string;
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
}: TablePivotGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const remeasureLayout = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    void el.getBoundingClientRect();
  }, []);
  useEmbeddedChartLiveResize(embedded, containerRef, remeasureLayout);

  const wordWrap = tableStyle.wordWrap ?? false;
  const rowHover = tableStyle.rowHover !== false;
  const zebraBg = resolveTableZebraBg(tableStyle);
  const opacity = tableStyle.opacity != null ? tableStyle.opacity / 100 : 1;
  const borderColor = tableStyle.borderColor;
  const panelBackground =
    opacity < 1 ? withBackgroundAlpha("var(--dashboard-widget-surface)", opacity) : undefined;
  const cellClass = cn(dwTableCell, wordWrap ? "whitespace-normal break-words" : "truncate");
  const mergedThemeStyle = (themeVars ?? {}) as CSSProperties;
  const showTotals = tableStyle.showSummary !== false;
  const metricCount = model.metrics.length;
  const colSpanUnit = metricCount;

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
        "flex min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-xl",
        embedded ? "absolute inset-0" : "h-full",
      )}
      style={{
        ...mergedThemeStyle,
        ...(panelBackground ? { backgroundColor: panelBackground } : null),
        border: borderColor ? `1px solid ${borderColor}` : "1px solid var(--dashboard-table-border, #f2f4f7)",
      }}
      data-testid={testId}
    >
      <div className="dashboard-scroll min-h-0 flex-1 overflow-auto overscroll-contain">
        <table className="dashboard-chart-table w-full min-w-full table-auto text-left">
          <thead className="sticky top-0 z-[1] bg-[var(--dashboard-table-header-bg,#f9fafb)]">
            <tr>
              <th
                rowSpan={metricCount > 1 ? 2 : 1}
                className={cn(cellClass, "font-medium text-[var(--dashboard-table-header-fg,#667085)]")}
              >
                {model.rowLabel}
              </th>
              {model.colKeys.map((ck) => (
                <th
                  key={ck}
                  colSpan={colSpanUnit}
                  className={cn(cellClass, "text-center font-medium text-[var(--dashboard-table-header-fg,#667085)]")}
                >
                  {ck}
                </th>
              ))}
              {showTotals && model.showRowTotal ? (
                <th
                  rowSpan={metricCount > 1 ? 2 : 1}
                  className={cn(cellClass, "font-medium text-[var(--dashboard-table-header-fg,#667085)]")}
                >
                  合计
                </th>
              ) : null}
            </tr>
            {metricCount > 1 ? (
              <tr>
                {model.colKeys.map((ck) =>
                  model.metrics.map((metric) => (
                    <th
                      key={`${ck}-${metric.field}`}
                      className={cn(cellClass, "text-center text-theme-xs font-medium text-[var(--dashboard-table-header-fg,#667085)]")}
                    >
                      {metric.label}
                    </th>
                  )),
                )}
              </tr>
            ) : null}
          </thead>
          <tbody className="bg-[var(--dashboard-table-body-bg,transparent)]" data-row-hover={rowHover ? "" : undefined}>
            {model.rowKeys.map((rk, rowIndex) => (
              <tr
                key={rk}
                className={cn(
                  "border-t border-[var(--dashboard-table-border,#f2f4f7)]",
                  rowHover && "hover:bg-[var(--dashboard-table-row-hover,rgba(70,95,255,0.04))]",
                  zebraBg && rowIndex % 2 === 1 && "bg-[var(--dashboard-table-zebra-bg)]",
                )}
              >
                <td className={cn(cellClass, "font-medium text-[var(--dashboard-table-body-fg,#344054)]")}>{rk}</td>
                {model.colKeys.map((ck) =>
                  model.metrics.map((metric) => {
                    const raw = model.cells[rk]?.[ck]?.[metric.field] ?? 0;
                    const text = formatTableCellValue(raw, valueFormat);
                    return (
                      <td
                        key={`${rk}-${ck}-${metric.field}`}
                        title={text}
                        className={cn(cellClass, "text-[var(--dashboard-table-body-fg,#344054)]")}
                      >
                        {text}
                      </td>
                    );
                  }),
                )}
                {showTotals && model.showRowTotal ? (
                  <td className={cn(cellClass, "font-medium text-[var(--dashboard-table-body-fg,#344054)]")}>
                    {formatTableCellValue(
                      model.metrics.reduce((sum, m) => sum + sumMetric(model, rk, null, m.field), 0),
                      valueFormat,
                    )}
                  </td>
                ) : null}
              </tr>
            ))}
            {showTotals && model.showColTotal ? (
              <tr className="border-t-2 border-[var(--dashboard-table-border,#f2f4f7)] bg-[var(--dashboard-table-summary-bg,var(--dashboard-table-header-bg,#f9fafb))]">
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
