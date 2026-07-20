import { memo, useMemo } from "react";
import type { ChartDeStyle } from "@/lib/chartDeStyle";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import type { NumberFormatConfig } from "@/components/dashboard/dashboardStyleConfig";
import type { ChartDrillFrame } from "@/lib/chartDrill";
import type { RenderSpec } from "@/components/charts/engine/types";
import { buildChartViewModel } from "@/components/charts/engine/buildChartViewModel";
import { buildStyleContext } from "@/components/charts/engine/buildStyleContext";
import { CanvasChartHost } from "@/components/charts/engine/CanvasChartHost";
import type { ColorScheme } from "@/components/dashboard/dashboardStyleConfig";

type Props = {
  spec: RenderSpec;
  rows: unknown[][];
  columns: string[];
  ariaLabel: string;
  isDark?: boolean;
  fill?: boolean;
  height?: number;
  width?: number;
  resizeDebounceMs?: number;
  deStyle?: ChartDeStyle;
  dataZoom?: boolean;
  chartColors?: string[];
  showLabel?: boolean;
  showTooltip?: boolean;
  seriesGradient?: boolean;
  labelPresentation?: { fontSize: number; color?: string };
  tooltipPresentation?: { fontSize: number; color?: string; background?: string };
  valueFormat?: NumberFormatConfig;
  mapPlaceholderHint?: string;
  mapDrillError?: string | null;
  heatmapPlaceholderHint?: string;
  drillLookupRows?: unknown[][];
  embedEdit?: boolean;
  onDrillClick?: (value: string, label?: string) => void;
  onJumpClick?: () => void;
  chartConfig?: ChartViewConfig;
  shellLegend?: boolean;
  drillStack?: ChartDrillFrame[];
  drillClickField?: string;
  dataScreenSurface?: boolean;
};

/** @deprecated 请使用 CanvasChartHost + EchartsEngineView */
function AdvancedEchartsChartInner({
  spec,
  rows,
  columns,
  deStyle,
  dataZoom = false,
  chartColors = [],
  showLabel = false,
  showTooltip = true,
  seriesGradient = false,
  labelPresentation,
  tooltipPresentation,
  valueFormat,
  embedEdit = false,
  shellLegend = false,
  dataScreenSurface = false,
  onDrillClick,
  onJumpClick,
  ...rest
}: Props) {
  const viewModel = useMemo(
    () =>
      buildChartViewModel(
        {
          chartType: spec.chartType as ChartViewConfig["chartType"],
          styleVariant: spec.styleVariant,
          dimensions: spec.encoding.dimensions,
          metrics: spec.encoding.metrics,
          ...(spec.source.bindingId
            ? { bindingId: String(spec.source.bindingId) }
            : {
                mode: spec.source.mode as ChartViewConfig["mode"],
                dataSourceId: spec.source.dataSourceId as string | undefined,
                sql: spec.source.sql as string | undefined,
                schema: spec.source.schema as string | undefined,
                table: spec.source.table as string | undefined,
              }),
        },
        { columns, rows },
      ),
    [spec, columns, rows],
  );

  const scheme: ColorScheme = rest.isDark ? "dark" : "light";
  const style = useMemo(
    () =>
      buildStyleContext({
        config: rest.chartConfig ?? { chartType: spec.chartType as ChartViewConfig["chartType"] },
        scheme,
        chartColors,
        shellLegend,
        embedEdit,
        numberFormat: valueFormat,
        dashboardDefaults: dataScreenSurface ? { surfaceKind: "data-screen" } : undefined,
      }),
    [rest.chartConfig, spec.chartType, scheme, chartColors, shellLegend, embedEdit, valueFormat, dataScreenSurface],
  );

  const mergedStyle = useMemo(
    () => ({
      ...style,
      deStyle: deStyle ?? style.deStyle,
      dataZoom,
      showLabel,
      showTooltip,
      seriesGradient,
      valueFormat: valueFormat ?? style.valueFormat,
      labelPresentation: labelPresentation ?? style.labelPresentation,
      tooltipPresentation: tooltipPresentation ?? style.tooltipPresentation,
      dataScreenSurface,
      shellLegend,
      embedEdit,
    }),
    [
      style,
      deStyle,
      dataZoom,
      showLabel,
      showTooltip,
      seriesGradient,
      valueFormat,
      labelPresentation,
      tooltipPresentation,
      dataScreenSurface,
      shellLegend,
      embedEdit,
    ],
  );

  return (
    <CanvasChartHost
      viewModel={viewModel}
      style={mergedStyle}
      onInteraction={
        onDrillClick
          ? (event) => {
              if (event.kind === "drill") onDrillClick(event.value, event.label);
            }
          : undefined
      }
      onJumpClick={onJumpClick}
      {...rest}
    />
  );
}

export const AdvancedEchartsChart = memo(AdvancedEchartsChartInner);
