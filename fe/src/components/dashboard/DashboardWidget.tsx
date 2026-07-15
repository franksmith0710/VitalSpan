import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from "react";
import { GripVertical, Trash2 } from "lucide-react";
import { GeoMapPlaceholderChart } from "@/components/charts/adapters/GeoMapPlaceholderChart";
import { ChartRenderer } from "@/components/charts/ChartRenderer";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { IconButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DashboardWidgetShell } from "./dashboardCanvasMode";
import { FilterWidget } from "./FilterWidget";
import { TextWidget } from "./TextWidget";
import { MediaWidget } from "./MediaWidget";
import { TabsWidget } from "./TabsWidget";
import type {
  FilterWidgetConfig,
  LayoutWidget,
  MediaWidgetConfig,
  TabsWidgetConfig,
  TextWidgetConfig,
  DashboardStyleConfig,
} from "./layoutUtils";
import { mergeTitleStyle, mergeWidgetShellStyle, resolveWidgetShellPaintColor } from "./dashboardStyleConfig";
import { resolveDashboardChrome } from "./dashboardChromeConfig";
import { parseDeRefreshIntervalSec, readChartDeDisplay, resolveChartQueryLimit } from "@/lib/chartDeDisplay";
import { resolveEffectiveChartScheme } from "@/lib/chartSurfaceTheme";
import { mergeChartTitleStyle, readChartRemark, readChartTitleVisible } from "@/lib/chartDeStyle";
import { isWidgetConfigReady } from "./createLayoutWidget";
import { pixelDragRailHeightPx, pixelViewTitleHeightPx, dwCaption, dwHint } from "./dashboardWidgetTypography";
import { usePixelCanvasScale } from "./pixelCanvas/PixelCanvasScaleContext";
import { widgetChartIcon, WIDGET_CHART_LABELS } from "./widgetIcons";
import { WidgetInlineTitle } from "./WidgetInlineTitle";

function useWidgetAutoRefreshExecuteKey(
  chartConfig: ChartViewConfig | undefined,
  baseKey: string | undefined,
): string | undefined {
  const refreshSec = useMemo(() => {
    if (!chartConfig) return null;
    return parseDeRefreshIntervalSec(readChartDeDisplay(chartConfig).refreshMode);
  }, [chartConfig]);

  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!refreshSec || refreshSec < 5) return undefined;
    const timer = window.setInterval(() => setTick((n) => n + 1), refreshSec * 1000);
    return () => window.clearInterval(timer);
  }, [refreshSec]);

  if (tick === 0) return baseKey;
  return `${baseKey ?? "chart"}:refresh:${tick}`;
}

type DashboardWidgetProps = {
  widget: LayoutWidget;
  mode: "edit" | "view";
  shell?: DashboardWidgetShell;
  selected?: boolean;
  /** 编辑态栅格实时尺寸（拖/缩放中） */
  gridSize?: { w: number; h: number };
  /** 像素画布逻辑尺寸（shape 壳层下图表尺寸估算） */
  pixelSize?: { width: number; height: number };
  onSelect?: (event: MouseEvent) => void;
  onDelete?: (id: string) => void;
  onTitleChange: (id: string, title: string) => void;
  onChartConfigChange?: (id: string, config: ChartViewConfig) => void;
  filterParameters?: Record<string, string>;
  executeKey?: string;
  filterValue?: string;
  onFilterValueChange?: (filterId: string, value: string) => void;
  allWidgets?: LayoutWidget[];
  renderNestedWidget?: (widget: LayoutWidget) => ReactNode;
  onTabsConfigChange?: (id: string, tabsConfig: TabsWidgetConfig) => void;
  onTextConfigChange?: (id: string, config: TextWidgetConfig) => void;
  dashboardStyle?: DashboardStyleConfig;
  /** DataEase isPlayer：交互中暂停 React 尺寸 props，由 DOM 百分比跟手 */
  suspendLiveResize?: boolean;
};

function WidgetPendingPreview({
  widget,
  dashboardStyle,
}: {
  widget: LayoutWidget;
  dashboardStyle?: DashboardStyleConfig;
}) {
  const chartType = widget.chartConfig?.chartType ?? "bar";
  const Icon = widgetChartIcon(chartType);
  const typeLabel = WIDGET_CHART_LABELS[chartType] ?? chartType;
  const shellColor = resolveWidgetShellPaintColor(dashboardStyle);
  const effectiveScheme = resolveEffectiveChartScheme(
    dashboardStyle?.colorScheme ?? "light",
    shellColor,
  );
  const mapIsDark = effectiveScheme === "dark";

  if (chartType === "map") {
    return (
      <div className="relative flex h-full min-h-[64px] flex-col overflow-hidden">
        <GeoMapPlaceholderChart fill hint="" isDark={mapIsDark} />
        <p className={cn("dw-hint pointer-events-none absolute inset-x-0 bottom-8 text-center")}>
          请配置数据源与查询
        </p>
        <div className="pointer-events-none absolute inset-x-0 bottom-1 flex flex-wrap items-center justify-center gap-1.5 px-2">
          <Badge variant="light" color="light" size="sm">
            {typeLabel}
          </Badge>
          <Badge variant="light" color="warning" size="sm">
            待配置
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <div className="widget-pending-preview flex h-full min-h-[64px] flex-col items-center justify-center gap-2 px-3 py-3">
      <span className="widget-pending-preview-icon flex items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400">
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <Badge variant="light" color="light" size="sm">
          {typeLabel}
        </Badge>
        <Badge variant="light" color="warning" size="sm">
          待配置
        </Badge>
      </div>
      <p className={cn("text-center", dwCaption)}>
        在右侧配置数据源与查询
      </p>
    </div>
  );
}

export function DashboardWidget({
  widget,
  mode,
  shell = "grid",
  selected = false,
  gridSize,
  pixelSize,
  onSelect,
  onDelete,
  onTitleChange,
  filterParameters,
  executeKey,
  filterValue,
  onFilterValueChange,
  allWidgets,
  renderNestedWidget,
  onTabsConfigChange,
  onTextConfigChange,
  dashboardStyle,
  suspendLiveResize = false,
}: DashboardWidgetProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const canvasScale = usePixelCanvasScale();
  const chartCfg = widget.type === "chart" ? widget.chartConfig : undefined;
  const widgetExecuteKey = useWidgetAutoRefreshExecuteKey(chartCfg, executeKey);

  if (widget.type === "filter" && widget.filterConfig) {
    return (
      <FilterWidget
        widget={widget as LayoutWidget & { filterConfig: FilterWidgetConfig }}
        mode={mode}
        shell={shell}
        selected={selected}
        value={filterValue ?? widget.filterConfig.defaultValue ?? ""}
        onValueChange={(filterId, value) => onFilterValueChange?.(filterId, value)}
        onSelect={() => onSelect?.({ shiftKey: false } as MouseEvent)}
        onTitleChange={onTitleChange}
        onDelete={onDelete}
        dashboardStyle={dashboardStyle}
      />
    );
  }

  if (widget.type === "text" && widget.textConfig) {
    return (
      <TextWidget
        widget={widget as LayoutWidget & { textConfig: TextWidgetConfig }}
        mode={mode}
        shell={shell}
        selected={selected}
        onSelect={() => onSelect?.({ shiftKey: false } as MouseEvent)}
        onTitleChange={onTitleChange}
        onDelete={onDelete}
        onTextConfigChange={onTextConfigChange}
      />
    );
  }

  if (widget.type === "media" && widget.mediaConfig) {
    return (
      <MediaWidget
        widget={widget as LayoutWidget & { mediaConfig: MediaWidgetConfig }}
        mode={mode}
        shell={shell}
        selected={selected}
        onSelect={() => onSelect?.({ shiftKey: false } as MouseEvent)}
        onTitleChange={onTitleChange}
        onDelete={onDelete}
      />
    );
  }

  if (widget.type === "tabs" && widget.tabsConfig) {
    return (
      <TabsWidget
        widget={widget as LayoutWidget & { tabsConfig: TabsWidgetConfig }}
        allWidgets={allWidgets ?? []}
        mode={mode}
        selected={selected}
        onSelect={() => onSelect?.({ shiftKey: false } as MouseEvent)}
        onTitleChange={onTitleChange}
        onDelete={onDelete}
        onTabsConfigChange={(cfg) => onTabsConfigChange?.(widget.id, cfg)}
        renderChild={(child) => renderNestedWidget?.(child) ?? null}
      />
    );
  }

  if (widget.type !== "chart") {
    return null;
  }

  const chartType = widget.chartConfig?.chartType ?? "bar";
  const Icon = widgetChartIcon(chartType);
  const typeLabel = WIDGET_CHART_LABELS[chartType] ?? chartType;
  const configReady = isWidgetConfigReady(widget.chartConfig);
  const inShapeShell = shell === "shape";
  const sizeW = gridSize?.w ?? widget.colSpan;
  const sizeH = gridSize?.h ?? widget.rowSpan;
  const sizeLabel =
    inShapeShell && pixelSize
      ? `${Math.round(pixelSize.width)}×${Math.round(pixelSize.height)}`
      : `${sizeW}×${sizeH}`;
  const shapeContentChromePx =
    inShapeShell && mode === "edit" && selected
      ? pixelDragRailHeightPx(canvasScale)
      : inShapeShell && mode === "view" && readChartTitleVisible(widget.chartConfig, dashboardStyle?.titleStyle)
        ? pixelViewTitleHeightPx(canvasScale)
        : 0;
  const shellStyle = mergeWidgetShellStyle(
    dashboardStyle?.widgetStyle,
    dashboardStyle?.colorScheme ?? "light",
  );
  const shellColor = resolveWidgetShellPaintColor(dashboardStyle);
  const effectiveScheme = resolveEffectiveChartScheme(
    dashboardStyle?.colorScheme ?? "light",
    shellColor,
  );
  const chrome = resolveDashboardChrome(dashboardStyle);
  const chartTitleVisible =
    inShapeShell && mode === "view" && readChartTitleVisible(widget.chartConfig, dashboardStyle?.titleStyle);
  const titleStyle =
    widget.chartConfig
      ? mergeChartTitleStyle(
          dashboardStyle?.titleStyle,
          widget.chartConfig,
          effectiveScheme,
        )
      : mergeTitleStyle(dashboardStyle?.titleStyle);
  const queryLimit = widget.chartConfig
    ? resolveChartQueryLimit(widget.chartConfig, dashboardStyle ?? {})
    : 100;
  const chartRemark = widget.chartConfig ? readChartRemark(widget.chartConfig) : { show: false, text: "" };

  const chartBody =
    mode === "edit" && !configReady ? (
      <WidgetPendingPreview widget={widget} dashboardStyle={dashboardStyle} />
    ) : widget.chartConfig ? (
      <ChartRenderer
        embedded
        gridSpan={gridSize}
        pixelSize={pixelSize}
        contentChromePx={inShapeShell ? shapeContentChromePx : 0}
        config={widget.chartConfig}
        title={widget.title}
        widgetId={widget.id}
        drillEnabled={mode === "view"}
        filterParameters={filterParameters}
        executeKey={widgetExecuteKey}
        queryLimit={queryLimit}
        paletteId={dashboardStyle?.paletteId}
        paletteColors={dashboardStyle?.paletteColors}
        numberFormat={dashboardStyle?.numberFormat}
        colorScheme={dashboardStyle?.colorScheme ?? "light"}
        widgetShellColor={shellColor}
        showLoadingHint={chrome.showChartLoadingHint}
        suspendLiveResize={suspendLiveResize}
      />
    ) : null;

  if (inShapeShell) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div
          role={mode === "edit" ? "button" : undefined}
          tabIndex={mode === "edit" ? 0 : undefined}
          onClick={
            mode === "edit"
              ? (e) => {
                  e.stopPropagation();
                  onSelect?.(e);
                }
              : undefined
          }
          onKeyDown={
            mode === "edit"
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect?.({ shiftKey: e.shiftKey } as MouseEvent);
                  }
                }
              : undefined
          }
          className={cn(
            "dashboard-no-drag flex min-h-0 flex-1 flex-col",
            mode === "edit" && "cursor-pointer",
          )}
        >
          {chartBody}
        </div>
        {onDelete ? (
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>删除组件</AlertDialogTitle>
                <AlertDialogDescription>
                  确定删除「{widget.title}」？删除后需保存布局才会生效。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    onDelete(widget.id);
                    setConfirmOpen(false);
                  }}
                >
                  删除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-xl border bg-white shadow-theme-xs transition-[border-color,box-shadow] dark:bg-white/[0.03]",
        selected && "dashboard-widget-selected",
        selected
          ? "border-gray-400 shadow-theme-sm ring-1 ring-gray-300/70 dark:border-gray-600 dark:ring-gray-600/40"
          : "border-gray-200 dark:border-gray-800",
        shellStyle.className,
      )}
      style={shellStyle.style}
    >
      {mode === "edit" && chrome.showChartActionButtons ? (
        <div className="flex shrink-0 items-center gap-2 border-b border-gray-100 bg-gray-50/90 px-2 py-1.5 dark:border-gray-800 dark:bg-white/[0.04]">
          <div
            className="dashboard-drag-handle flex shrink-0 cursor-grab items-center active:cursor-grabbing"
            role="group"
            aria-label="拖动以移动组件"
            title="拖动以移动组件"
          >
            <GripVertical
              className="size-3.5 shrink-0 text-gray-300 dark:text-gray-600"
              aria-hidden
            />
          </div>
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-white text-gray-500 shadow-theme-xs dark:bg-white/5 dark:text-gray-400">
            <Icon className="size-3.5" aria-hidden />
          </span>
          <WidgetInlineTitle
            value={widget.title}
            editable
            onChange={(next) => onTitleChange(widget.id, next)}
            titleStyle={titleStyle}
            testId={`widget-inline-title-${widget.id}`}
          />
          <span className="dashboard-no-drag hidden shrink-0 text-theme-xs tabular-nums text-gray-400 sm:inline">
            {sizeLabel}
          </span>
          {onDelete ? (
            <IconButton
              type="button"
              variant="ghost"
              size="sm"
              className="dashboard-no-drag size-7 shrink-0 text-gray-400 hover:text-error-600 dark:hover:text-error-400"
              aria-label="删除组件"
              onClick={(e) => {
                e.stopPropagation();
                setConfirmOpen(true);
              }}
            >
              <Trash2 className="size-3.5" />
            </IconButton>
          ) : null}
        </div>
      ) : readChartTitleVisible(widget.chartConfig, dashboardStyle?.titleStyle) ? (
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
          className={cn(
            "dw-hint shrink-0 border-b border-gray-100 px-3 py-1.5 text-gray-500 dark:border-gray-800 dark:text-gray-400",
          )}
          data-testid={`grid-chart-remark-${widget.id}`}
        >
          {chartRemark.text}
        </p>
      ) : null}

      <div
        role={mode === "edit" ? "button" : undefined}
        tabIndex={mode === "edit" ? 0 : undefined}
        onClick={
          mode === "edit"
            ? (e) => {
                e.stopPropagation();
                onSelect?.(e);
              }
            : undefined
        }
        onKeyDown={
          mode === "edit"
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect?.({ shiftKey: e.shiftKey } as MouseEvent);
                }
              }
            : undefined
        }
        className={cn(
          "dashboard-no-drag flex min-h-0 flex-1 flex-col",
          mode === "edit" && "cursor-pointer hover:bg-gray-50/50 dark:hover:bg-white/[0.02]",
        )}
      >
        {chartBody ? (
          <div className="flex min-h-0 flex-1 flex-col p-2">{chartBody}</div>
        ) : null}
      </div>

      {onDelete ? (
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>删除组件</AlertDialogTitle>
              <AlertDialogDescription>
                确定删除「{widget.title}」？删除后需保存布局才会生效。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  onDelete(widget.id);
                  setConfirmOpen(false);
                }}
              >
                删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </div>
  );
}
