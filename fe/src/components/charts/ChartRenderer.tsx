import { memo, useEffect, useMemo, useState, type ReactNode } from "react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { chartConfigToRenderSpec } from "@/lib/chartConfigState";
import { buildChartRenderModel } from "@/lib/buildChartRenderModel";
import {
  isAdvancedEchartsType,
  isKpiType,
  type ChartViewConfig,
} from "@/lib/chartViewConfig";
import {
  createBarChartOptions,
  createLineChartOptions,
  getApexThemeOverrides,
  resolveChartColors,
} from "@/lib/chart-theme";
import type { ColorScheme } from "@/components/dashboard/dashboardStyleConfig";
import { readChartDeStyle, readChartShowLabel, readChartDataZoom } from "@/lib/chartDeStyle";
import { apexValueFormatter, resolveChartValueFormat } from "@/lib/chartValueFormat";
import type { NumberFormatConfig } from "@/components/dashboard/dashboardStyleConfig";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AdvancedEchartsChart } from "./adapters/AdvancedEchartsChart";
import { EmbeddedChartTable } from "./adapters/EmbeddedChartTable";
import { KpiCard } from "./adapters/KpiCard";
import { ChartConfigPanel } from "./ChartConfigPanel";
import { ChartPanel } from "./ChartPanel";
import { CHART_EXECUTE_LIMIT, useChartExecute } from "./useChartExecute";
import { useChartRenderSpec } from "./useChartRenderSpec";
import { readChartDeTableStyle } from "@/lib/chartDeTableStyle";
import { useElementSize } from "@/hooks/useElementSize";
import { useDashboardColorScheme } from "@/hooks/useDashboardColorScheme";
import { useDashboardGridPlayer } from "@/components/dashboard/dashboardGridPlayerContext";
import { usePixelShapePlayer } from "@/components/dashboard/pixelCanvas/pixelShapePlayerContext";
import { estimateWidgetBodyHeight } from "@/components/dashboard/gridLayoutAdapter";
import {
  dwState,
  dwStateError,
  dwStateWarning,
} from "@/components/dashboard/dashboardWidgetTypography";
import { cn } from "@/lib/utils";

type ChartRendererProps = {
  config: ChartViewConfig;
  title?: string;
  mode?: "preview" | "config";
  /** 看板 widget 内嵌：填满容器、无重复 Panel 边框 */
  embedded?: boolean;
  /** 栅格行高（编辑态缩放时传入，用于首帧高度估算） */
  gridSpan?: { w: number; h: number };
  /** 像素画布逻辑尺寸（缩放/拖拽时比 DOM 测量更稳定） */
  pixelSize?: { width: number; height: number };
  /** shape 壳层顶部拖动手柄等占用高度 */
  contentChromePx?: number;
  filterParameters?: Record<string, string>;
  executeKey?: string;
  queryLimit?: number;
  paletteId?: string;
  paletteColors?: string[];
  numberFormat?: NumberFormatConfig;
  /** 看板 colorScheme；图表主题与 Admin 壳层解耦 */
  colorScheme?: ColorScheme;
  /** 看板级：是否显示加载骨架 */
  showLoadingHint?: boolean;
  /** DataEase isPlayer：交互中冻结 React 尺寸上报，由 DOM 百分比 + 图表 rAF resize 跟手 */
  suspendLiveResize?: boolean;
};

function embeddedChartSurface(children: ReactNode) {
  return (
    <div className="absolute inset-0 min-h-0 overflow-hidden">
      {children}
    </div>
  );
}

function embeddedStateMessage(className: string, children: ReactNode) {
  return (
    <p
      className={cn(
        "flex h-full min-h-0 items-center justify-center px-4 text-center",
        className,
      )}
    >
      {children}
    </p>
  );
}

function embeddedBodyHeight(
  bodySize: { width: number; height: number },
  pixelSize: { width: number; height: number } | undefined,
  contentChromePx: number,
  gridSpan: { w: number; h: number } | undefined,
): number {
  const measured = bodySize.height > 0 ? bodySize.height : 0;
  const pixelHeight =
    measured <= 0 && pixelSize ? Math.max(48, pixelSize.height - contentChromePx) : 0;
  const fallbackHeight = gridSpan?.h ? estimateWidgetBodyHeight(gridSpan.h) : 120;
  return Math.max(64, measured || pixelHeight || fallbackHeight);
}

export const ChartRenderer = memo(function ChartRenderer({
  config,
  title = "图表",
  mode = "preview",
  embedded = false,
  gridSpan,
  pixelSize,
  contentChromePx = 0,
  filterParameters,
  executeKey,
  queryLimit,
  paletteId,
  paletteColors,
  numberFormat,
  colorScheme = "light",
  showLoadingHint = true,
  suspendLiveResize: suspendLiveResizeProp = false,
}: ChartRendererProps) {
  const isShapePlaying = usePixelShapePlayer();
  const isGridPlaying = useDashboardGridPlayer();
  const suspendLiveResize = suspendLiveResizeProp || isShapePlaying || isGridPlaying;
  const { ref: bodyRef, size: bodySize } = useElementSize<HTMLDivElement>({
    enabled: embedded,
    paused: suspendLiveResize,
  });
  const resolvedScheme = useDashboardColorScheme(bodyRef, colorScheme);
  const isDark = resolvedScheme === "dark";
  const fillHeight = useMemo(() => {
    if (!embedded) return Math.max(180, bodySize.height || 180);
    return embeddedBodyHeight(bodySize, pixelSize, contentChromePx, gridSpan);
  }, [
    embedded,
    bodySize.height,
    pixelSize?.width,
    pixelSize?.height,
    contentChromePx,
    gridSpan?.h,
  ]);
  const chartSize = useMemo(() => {
    if (embedded) {
      return { width: undefined as number | undefined, height: undefined as number | undefined };
    }
    return { width: bodySize.width || undefined, height: fillHeight };
  }, [embedded, bodySize.width, fillHeight]);
  const { columns, rows, loading, error, slowHint, rerun } = useChartExecute(config, {
    filterParameters,
    executeKey,
    limit: queryLimit,
  });
  const [page, setPage] = useState(1);
  const [localConfig, setLocalConfig] = useState(config);
  const specConfig = mode === "config" ? localConfig : config;
  const renderSpec = useChartRenderSpec(specConfig, {
    paused: suspendLiveResize,
    loading,
    error,
  });
  const empty = !loading && !error && (rows?.length ?? 0) === 0;

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  useEffect(() => {
    setPage(1);
  }, [config]);

  const renderModel = useMemo(
    () => (!loading && !error ? buildChartRenderModel(localConfig, columns, rows) : null),
    [localConfig, columns, rows, loading, error],
  );
  const deStyle = useMemo(() => readChartDeStyle(localConfig), [localConfig]);
  const chartColors = useMemo(
    () =>
      deStyle.paletteId
        ? resolveChartColors(deStyle.paletteId)
        : resolveChartColors(paletteId, paletteColors),
    [deStyle.paletteId, paletteId, paletteColors],
  );
  const showChartLegend = deStyle.legend?.show !== false;
  const showDataLabels = readChartShowLabel(localConfig);
  const dataZoomEnabled = readChartDataZoom(localConfig);
  const valueFormat = useMemo(
    () => resolveChartValueFormat(deStyle.label, numberFormat),
    [deStyle.label, numberFormat],
  );

  const renderBody = () => {
    const wrapEmbedded = (node: ReactNode) =>
      embedded ? embeddedChartSurface(node) : node;

    if (isKpiType(localConfig.chartType)) {
      return wrapEmbedded(
        <KpiCard
          title={title}
          metrics={localConfig.metrics ?? []}
          columns={columns}
          rows={rows as unknown[][]}
          numberFormat={numberFormat}
        />,
      );
    }

    if (isAdvancedEchartsType(localConfig.chartType)) {
      if (!renderSpec) {
        return embedded
          ? embeddedChartSurface(embeddedStateMessage(dwState, "渲染配置加载中…"))
          : <p className="text-theme-sm text-gray-500">渲染配置加载中…</p>;
      }
      return wrapEmbedded(
        <AdvancedEchartsChart
          spec={renderSpec}
          rows={rows as unknown[][]}
          columns={columns}
          ariaLabel={title}
          isDark={isDark}
          fill={embedded}
          height={embedded ? undefined : chartSize.height}
          width={embedded ? undefined : chartSize.width}
          deStyle={deStyle}
          dataZoom={dataZoomEnabled}
          chartColors={chartColors}
          showLabel={showDataLabels}
          valueFormat={valueFormat}
        />,
      );
    }

    if (localConfig.chartType === "pie") {
      if (!renderModel || renderModel.kind === "empty") {
        return embedded
          ? embeddedChartSurface(embeddedStateMessage(dwState, "暂无数据"))
          : <p className="text-theme-sm text-gray-500">暂无数据</p>;
      }
      if (renderModel.kind === "error") {
        return embedded
          ? embeddedChartSurface(embeddedStateMessage(dwState, renderModel.message))
          : <p className="text-theme-sm text-gray-500">{renderModel.message}</p>;
      }
      const spec = chartConfigToRenderSpec(localConfig);
      return wrapEmbedded(
        <AdvancedEchartsChart
          spec={spec}
          rows={rows as unknown[][]}
          columns={columns}
          ariaLabel={title}
          isDark={isDark}
          fill={embedded}
          height={embedded ? undefined : chartSize.height}
          width={embedded ? undefined : chartSize.width}
          deStyle={deStyle}
          dataZoom={dataZoomEnabled}
          chartColors={chartColors}
          showLabel={showDataLabels}
          valueFormat={valueFormat}
        />,
      );
    }

    if (localConfig.chartType === "table") {
      if (!renderModel || renderModel.kind === "empty") {
        return embedded
          ? embeddedStateMessage(dwState, "暂无数据")
          : <p className="text-theme-sm text-gray-500">暂无数据</p>;
      }
      if (renderModel.kind === "error") {
        return embedded
          ? embeddedStateMessage(dwState, renderModel.message)
          : <p className="text-theme-sm text-gray-500">{renderModel.message}</p>;
      }
      const cols = renderModel.kind === "table" ? renderModel.displayCols : columns;
      const tableStyle = readChartDeTableStyle(localConfig);

      return wrapEmbedded(
        <EmbeddedChartTable
          columns={columns}
          displayCols={cols}
          rows={rows as unknown[][]}
          page={page}
          onPageChange={setPage}
          tableStyle={tableStyle}
          valueFormat={valueFormat}
        />,
      );
    }

    if (rows.length > CHART_EXECUTE_LIMIT) {
      const message = `结果超过 ${CHART_EXECUTE_LIMIT} 行，请缩小查询范围`;
      return embedded
        ? embeddedStateMessage(dwStateWarning, message)
        : <p className="text-theme-sm text-warning-600 dark:text-warning-400">{message}</p>;
    }

    if (!renderModel || renderModel.kind === "empty") {
      return embedded
        ? embeddedStateMessage(dwState, "暂无数据")
        : <p className="text-theme-sm text-gray-500">暂无数据</p>;
    }
    if (renderModel.kind === "error") {
      return embedded
        ? embeddedStateMessage(dwState, renderModel.message)
        : <p className="text-theme-sm text-gray-500">{renderModel.message}</p>;
    }
    if (renderModel.kind !== "apex") {
      return embedded
        ? embeddedStateMessage(dwState, "暂不支持的图表类型")
        : <p className="text-theme-sm text-gray-500">暂不支持的图表类型</p>;
    }

    const { categories, series, chartType } = renderModel;
    let options: ApexOptions;
    const compactEmbedded = embedded && fillHeight < 160;
    const apexChart: ApexOptions["chart"] = {
      ...(embedded ? {} : { height: chartSize.height }),
      redrawOnParentResize: embedded,
      redrawOnWindowResize: !embedded,
      animations: embedded ? { enabled: false } : undefined,
      ...(chartType === "bar" && localConfig.styleVariant === "stacked"
        ? { stacked: true }
        : {}),
      ...(dataZoomEnabled
        ? {
            zoom: { enabled: true, type: "x", autoScaleYaxis: true },
            toolbar: {
              show: !compactEmbedded,
              tools: { download: false, selection: false },
            },
          }
        : {}),
    };
    const apexTheme = getApexThemeOverrides(resolvedScheme);
    const apexOverrides: ApexOptions = {
      ...apexTheme,
      colors: chartColors,
      chart: {
        ...(apexTheme.chart ?? {}),
        ...apexChart,
        offsetY:
          embedded && showChartLegend && (deStyle.legend?.position ?? "bottom") === "bottom"
            ? -6
            : undefined,
      },
      legend: {
        show: showChartLegend && !compactEmbedded,
        position: deStyle.legend?.position ?? "bottom",
        fontSize: deStyle.legend?.fontSize ? `${deStyle.legend.fontSize}px` : "12px",
        offsetY: embedded && showChartLegend ? 2 : 0,
        itemMargin: { horizontal: 8, vertical: 2 },
        ...(apexTheme.legend ?? {}),
      },
      grid: {
        ...(apexTheme.grid ?? {}),
        padding: {
          bottom:
            embedded && showChartLegend && (deStyle.legend?.position ?? "bottom") === "bottom"
              ? dataZoomEnabled
                ? 28
                : 12
              : dataZoomEnabled
                ? 16
                : 4,
          left: 4,
          right: 4,
        },
      },
      dataLabels: {
        enabled: showDataLabels && !compactEmbedded,
        formatter: apexValueFormatter(valueFormat),
        style: {
          fontSize: deStyle.label?.fontSize ? `${deStyle.label.fontSize}px` : "12px",
        },
      },
      tooltip: {
        ...(apexTheme.tooltip ?? {}),
        y: { formatter: apexValueFormatter(valueFormat) },
      },
      yaxis: {
        labels: {
          ...(apexTheme.yaxis as { labels?: ApexOptions["yaxis"] } | undefined)?.labels,
          formatter: apexValueFormatter(valueFormat),
        },
      },
      ...(compactEmbedded
        ? { legend: { show: false }, markers: { size: 3, strokeWidth: 0 } }
        : {}),
      xaxis: {
        categories,
        labels: {
          ...(apexTheme.xaxis?.labels ?? {}),
          rotate: compactEmbedded && categories.length > 4 ? -35 : 0,
          hideOverlappingLabels: true,
          trim: true,
        },
      },
    };
    if (chartType === "line") {
      options = createLineChartOptions(categories, apexOverrides);
    } else {
      options = createBarChartOptions(categories, apexOverrides);
    }
    return wrapEmbedded(
      <div className={embedded ? "h-full min-h-0 w-full overflow-hidden" : "h-full min-h-0 w-full min-w-0 overflow-hidden"}>
        <Chart
          key={`${chartType}-${isDark ? "dark" : "light"}-${series.map((s) => s.name).join(",")}-${series[0]?.data.length ?? 0}-${embedded ? "embedded" : "panel"}`}
          options={options}
          series={series}
          type={chartType}
          height={embedded ? "100%" : chartSize.height}
          width={embedded ? "100%" : chartSize.width}
        />
      </div>,
    );
  };

  const body = !loading && !error && !empty ? (
    <div
      className={
        mode === "config"
          ? "grid gap-4 lg:grid-cols-2"
          : embedded
            ? "relative h-full min-h-0 w-full overflow-hidden"
            : ""
      }
    >
      {mode === "config" ? (
        <ChartConfigPanel
          config={localConfig}
          columns={columns}
          onChange={setLocalConfig}
        />
      ) : null}
      <div
        className={embedded ? "absolute inset-0 overflow-hidden" : undefined}
        style={deStyle.paletteOpacity != null ? { opacity: deStyle.paletteOpacity } : undefined}
      >
        {renderBody()}
      </div>
    </div>
  ) : null;

  if (embedded) {
    return (
      <div ref={bodyRef} className="relative h-full min-h-0 w-full min-w-0 overflow-hidden">
        {loading ? (
          showLoadingHint ? (
            <Skeleton className="absolute inset-0 rounded-lg" aria-busy="true" aria-label="图表加载中" />
          ) : null
        ) : error ? (
          <div
            role="alert"
            className={cn(
              "absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg border p-3",
              isDark
                ? "border-error-500/30 bg-error-950/40"
                : "border-error-500/40 bg-error-50/80",
            )}
          >
            <p className={cn("text-center", dwStateError)}>{error}</p>
            <Button type="button" variant="outline" size="sm" onClick={rerun}>
              重试
            </Button>
          </div>
        ) : empty ? (
          <div className="absolute inset-0 flex items-center justify-center">
            {embeddedStateMessage(dwState, "暂无数据")}
          </div>
        ) : (
          body
        )}
      </div>
    );
  }

  return (
    <ChartPanel
      title={title}
      loading={loading}
      error={error}
      empty={empty}
      slowHint={slowHint}
      onRetry={rerun}
    >
      {body}
    </ChartPanel>
  );
});
