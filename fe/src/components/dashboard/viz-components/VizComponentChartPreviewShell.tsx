import type { ReactNode } from "react";
import {
  mergeChartTitleStyle,
  readChartRemark,
  readChartTitleVisible,
  resolveChartContentShellStyle,
} from "@/lib/chartDeStyle";
import { resolveWidgetEffectiveScheme } from "@/lib/chartSurfaceTheme";
import { cn } from "@/lib/utils";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import type { LayoutWidget } from "@/components/dashboard/layoutUtils";
import { gridWidgetShellClassName } from "@/components/dashboard/widgetRailStyleSections";
import { widgetChartIcon, WIDGET_CHART_LABELS } from "@/components/dashboard/widgetIcons";

type VizComponentChartPreviewShellProps = {
  widget: LayoutWidget & { chartConfig: ChartViewConfig };
  children: ReactNode;
};

/** 组件库编辑预览：栅格看板 view 态外壳（边框/标题/备注），与 DashboardWidget 一致 */
export function VizComponentChartPreviewShell({
  widget,
  children,
}: VizComponentChartPreviewShellProps) {
  const chartConfig = widget.chartConfig;
  const scheme = resolveWidgetEffectiveScheme(undefined);
  const shellStyle = resolveChartContentShellStyle(undefined, chartConfig, scheme).outer;
  const titleVisible = readChartTitleVisible(chartConfig, undefined);
  const titleStyle = mergeChartTitleStyle(undefined, chartConfig, scheme);
  const chartRemark = readChartRemark(chartConfig);
  const chartType = chartConfig.chartType;
  const Icon = widgetChartIcon(chartType);
  const typeLabel = WIDGET_CHART_LABELS[chartType] ?? chartType;

  return (
    <div
      className={cn(
        gridWidgetShellClassName(true, false, shellStyle.className),
        "bg-white dark:bg-white/[0.03]",
      )}
      style={shellStyle.style}
      data-testid="viz-component-chart-shell"
    >
      {titleVisible ? (
        <div className="flex shrink-0 items-center gap-2 border-b border-gray-100 px-3 py-2 dark:border-gray-800">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400">
            <Icon className="size-3.5" aria-hidden />
          </span>
          <h4
            className="min-w-0 flex-1 truncate text-theme-sm font-semibold text-gray-800 dark:text-white/90"
            style={titleStyle}
          >
            {widget.title}
          </h4>
          <span className="shrink-0 text-theme-sm text-gray-400">{typeLabel}</span>
        </div>
      ) : null}
      {chartRemark.show ? (
        <p
          className="dw-hint shrink-0 border-b border-gray-100 px-3 py-1.5 text-gray-500 dark:border-gray-800 dark:text-gray-400"
          data-testid={`viz-preview-chart-remark-${widget.id}`}
        >
          {chartRemark.text}
        </p>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col p-2">{children}</div>
    </div>
  );
}
