import { memo, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { buildChartRenderModel } from "@/lib/buildChartRenderModel";
import { resolveChartConfigPhase } from "@/lib/chartConfigState";
import { isChartExecuteReady } from "@/lib/chartExecuteProbe";
import { DEFAULT_GEO_MAP_PLACEHOLDER_HINT, isNumericRegionIdDimension, MAP_REGION_NAME_HINT } from "@/lib/geoMapChart";
import {
  isEchartsChartType,
  isKpiType,
  type ChartViewConfig,
} from "@/lib/chartViewConfig";
import { resolveChartColors } from "@/lib/chartPalette";
import type { ColorScheme } from "@/components/dashboard/dashboardStyleConfig";
import { readChartDeStyle, readChartShowLabel, readChartDataZoom } from "@/lib/chartDeStyle";
import { resolveChartValueFormat } from "@/lib/chartValueFormat";
import type { NumberFormatConfig } from "@/components/dashboard/dashboardStyleConfig";
import { resolveRenderSpec } from "@/lib/resolveRenderSpec";
import { chartRenderSpecKey } from "@/lib/chartRenderSpecKey";
import {
  applyChartDrillPipeline,
  drillStackToFilterParameters,
  getClickDrillField,
  resolveDrillRenderSpec,
  supportsChartDrillInteraction,
} from "@/lib/chartDrill";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AdvancedEchartsChart } from "./adapters/AdvancedEchartsChart";
import { EmbeddedChartTable } from "./adapters/EmbeddedChartTable";
import { KpiCard } from "./adapters/KpiCard";
import { ChartConfigPanel } from "./ChartConfigPanel";
import { ChartPanel } from "./ChartPanel";
import { CHART_EXECUTE_LIMIT, useChartExecute } from "./useChartExecute";
import { readChartDeTableStyle } from "@/lib/chartDeTableStyle";
import {
  resolveEffectiveChartScheme,
  resolveTableThemeVars,
} from "@/lib/chartSurfaceTheme";
import { useElementSize } from "@/hooks/useElementSize";
import { useDashboardColorScheme } from "@/hooks/useDashboardColorScheme";
import { useDashboardGridPlayer } from "@/components/dashboard/dashboardGridPlayerContext";
import { usePixelShapePlayer } from "@/components/dashboard/pixelCanvas/pixelShapePlayerContext";
import {
  dwState,
  dwStateError,
  dwStateWarning,
} from "@/components/dashboard/dashboardWidgetTypography";
import { cn } from "@/lib/utils";
import {
  embeddedBodyHeight,
  embeddedChartSurface,
  embeddedEmptyMessage,
  embeddedErrorMessage,
  embeddedStateMessage,
} from "./chartRendererEmbedded";
import { ChartDrillChrome } from "./ChartDrillChrome";
import { drillStackRevision, useChartDrill } from "./ChartDrillContext";

type ChartRendererProps = {
  config: ChartViewConfig;
  title?: string;
  mode?: "preview" | "config";
  embedded?: boolean;
  gridSpan?: { w: number; h: number };
  pixelSize?: { width: number; height: number };
  contentChromePx?: number;
  filterParameters?: Record<string, string>;
  executeKey?: string;
  queryLimit?: number;
  paletteId?: string;
  paletteColors?: string[];
  numberFormat?: NumberFormatConfig;
  colorScheme?: ColorScheme;
  /** 组件实底色，用于表格/地图跟随组件外观而非仅 colorScheme */
  widgetShellColor?: string;
  showLoadingHint?: boolean;
  suspendLiveResize?: boolean;
  widgetId?: string;
  drillEnabled?: boolean;
};

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
  widgetShellColor,
  showLoadingHint = true,
  suspendLiveResize: suspendLiveResizeProp = false,
  widgetId,
  drillEnabled = false,
}: ChartRendererProps) {
  const drill = useChartDrill(drillEnabled ? widgetId : undefined);
  const drillInteraction = drillEnabled && Boolean(widgetId) && supportsChartDrillInteraction(config);
  const mergedFilterParameters = useMemo(
    () => ({
      ...filterParameters,
      ...drillStackToFilterParameters(drill.stack),
    }),
    [filterParameters, drill.stack],
  );
  const drillRevision = drillStackRevision(drill.stack);
  const resolvedExecuteKey = drillRevision
    ? `${executeKey ?? "chart"}:drill:${drillRevision}`
    : executeKey;
  const isShapePlaying = usePixelShapePlayer();
  const isGridPlaying = useDashboardGridPlayer();
  const suspendLiveResize = suspendLiveResizeProp || isShapePlaying || isGridPlaying;
  const { ref: bodyRef, size: bodySize } = useElementSize<HTMLDivElement>({
    enabled: embedded,
    paused: suspendLiveResize,
  });
  const resolvedScheme = useDashboardColorScheme(bodyRef, colorScheme);
  const surfaceScheme = resolveEffectiveChartScheme(resolvedScheme, widgetShellColor);
  const isDark = surfaceScheme === "dark";
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
    filterParameters: mergedFilterParameters,
    executeKey: resolvedExecuteKey,
    limit: queryLimit,
  });
  const [page, setPage] = useState(1);
  const [localConfig, setLocalConfig] = useState(config);
  const specConfig = mode === "config" ? localConfig : config;
  const isMapChart = localConfig.chartType === "map";
  const empty = !loading && !error && (rows?.length ?? 0) === 0 && !isMapChart;

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  useEffect(() => {
    setPage(1);
  }, [config, drillRevision]);

  const drillPipeline = useMemo(() => {
    if (!drillInteraction && !drill.stack.length) {
      return {
        rows: rows as unknown[][],
        columns,
        displayField: undefined as string | undefined,
      };
    }
    return applyChartDrillPipeline(config, columns, rows as unknown[][], drill.stack);
  }, [drillInteraction, drill.stack, config, columns, rows]);

  const displayRows = drillPipeline.rows;
  const displayColumns = drillPipeline.columns;
  const displayField = drillPipeline.displayField;

  const handleDrillClick = useCallback(
    (value: string, label?: string) => {
      if (!drillInteraction) return;
      const field = getClickDrillField(config, drill.stack);
      if (!field || !value) return;
      drill.push({ field, value, label: label ?? value });
    },
    [config, drill, drillInteraction],
  );

  const renderModel = useMemo(
    () =>
      !loading && !error
        ? buildChartRenderModel(localConfig, displayColumns, displayRows as (string | number | boolean | null)[][])
        : null,
    [localConfig, displayColumns, displayRows, loading, error],
  );
  const renderSpec = useMemo(
    () =>
      drillInteraction || drill.stack.length
        ? resolveDrillRenderSpec(specConfig, displayField)
        : resolveRenderSpec(specConfig),
    [chartRenderSpecKey(specConfig), displayField, drillInteraction, drill.stack.length],
  );
  const deStyle = useMemo(() => readChartDeStyle(localConfig), [localConfig]);
  const chartColors = useMemo(
    () =>
      deStyle.paletteId
        ? resolveChartColors(deStyle.paletteId)
        : resolveChartColors(paletteId, paletteColors),
    [deStyle.paletteId, paletteId, paletteColors],
  );
  const showDataLabels = readChartShowLabel(localConfig);
  const dataZoomEnabled = readChartDataZoom(localConfig);
  const valueFormat = useMemo(
    () => resolveChartValueFormat(deStyle.label, numberFormat),
    [deStyle.label, numberFormat],
  );

  const mapPlaceholderHint = useMemo(() => {
    if (!isMapChart) return undefined;
    if (!isChartExecuteReady(localConfig)) return "请配置数据源与 SQL";
    const phase = resolveChartConfigPhase(localConfig);
    if (!phase.renderReady) return DEFAULT_GEO_MAP_PLACEHOLDER_HINT;
    const regionField = localConfig.dimensions?.[0]?.field ?? "";
    if (regionField && isNumericRegionIdDimension(regionField, columns, rows as unknown[][])) {
      return MAP_REGION_NAME_HINT;
    }
    if (renderModel?.kind === "error") {
      return renderModel.message.split("。")[0] ?? renderModel.message;
    }
    if (!loading && !error && (rows?.length ?? 0) === 0) return "暂无数据";
    return undefined;
  }, [isMapChart, localConfig, loading, error, rows, columns, renderModel]);

  const echartsChart = (spec = renderSpec) => (
    <AdvancedEchartsChart
      spec={spec}
      rows={displayRows}
      columns={displayColumns}
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
      mapPlaceholderHint={mapPlaceholderHint}
      onDrillClick={drillInteraction ? handleDrillClick : undefined}
    />
  );

  const renderBody = () => {
    const wrapEmbedded = (node: ReactNode) =>
      embedded ? embeddedChartSurface(node) : node;

    if (isKpiType(localConfig.chartType)) {
      return wrapEmbedded(
        <KpiCard
          title={title}
          metrics={localConfig.metrics ?? []}
          columns={displayColumns}
          rows={displayRows}
          numberFormat={numberFormat}
        />,
      );
    }

    if (isEchartsChartType(localConfig.chartType)) {
      const chartType = localConfig.chartType;
      if (
        (chartType === "line" || chartType === "bar") &&
        displayRows.length > CHART_EXECUTE_LIMIT
      ) {
        const message = `结果超过 ${CHART_EXECUTE_LIMIT} 行，请缩小查询范围`;
        return embedded
          ? embeddedStateMessage(dwStateWarning, message)
          : <p className="text-theme-sm text-warning-600 dark:text-warning-400">{message}</p>;
      }
      if (chartType === "map") {
        return wrapEmbedded(echartsChart());
      }
      if (!renderModel || renderModel.kind === "empty") {
        return embedded
          ? embeddedEmptyMessage()
          : <p className="text-theme-sm text-gray-500">暂无数据</p>;
      }
      if (renderModel.kind === "error") {
        return embedded
          ? embeddedErrorMessage(renderModel.message)
          : <p className="text-theme-sm text-gray-500">{renderModel.message}</p>;
      }
      return wrapEmbedded(echartsChart());
    }

    if (localConfig.chartType === "table") {
      if (!renderModel || renderModel.kind === "empty") {
        return embedded
          ? embeddedEmptyMessage()
          : <p className="text-theme-sm text-gray-500">暂无数据</p>;
      }
      if (renderModel.kind === "error") {
        return embedded
          ? embeddedErrorMessage(renderModel.message)
          : <p className="text-theme-sm text-gray-500">{renderModel.message}</p>;
      }
      const cols = renderModel.kind === "table" ? renderModel.displayCols : columns;
      const tableStyle = readChartDeTableStyle(localConfig);
      const tableThemeVars = resolveTableThemeVars(tableStyle, {
        colorScheme: resolvedScheme,
        widgetShellBg: widgetShellColor,
      });

      return wrapEmbedded(
        <EmbeddedChartTable
          columns={displayColumns}
          displayCols={cols}
          rows={displayRows}
          page={page}
          onPageChange={setPage}
          tableStyle={tableStyle}
          themeVars={tableThemeVars}
          surfaceScheme={surfaceScheme}
          valueFormat={valueFormat}
          drillField={drillInteraction ? getClickDrillField(config, drill.stack) : undefined}
          onDrillCellClick={
            drillInteraction ? (_field, value) => handleDrillClick(value) : undefined
          }
        />,
      );
    }

    return embedded
      ? embeddedStateMessage(dwState, "暂不支持的图表类型")
      : <p className="text-theme-sm text-gray-500">暂不支持的图表类型</p>;
  };

  const body = !loading && !error && (!empty || isMapChart) ? (
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
      >
        {embedded && drill.stack.length > 0 ? (
          <ChartDrillChrome
            className="absolute inset-x-2 top-2 z-[2]"
            stack={drill.stack}
            onBack={drill.pop}
            onReset={drill.reset}
            onNavigate={drill.navigateTo}
          />
        ) : null}
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
        ) : empty && !isMapChart ? (
          <div className="absolute inset-0 flex items-center justify-center">
            {embeddedEmptyMessage()}
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
      empty={empty && !isMapChart}
      slowHint={slowHint}
      onRetry={rerun}
    >
      {body}
    </ChartPanel>
  );
});
