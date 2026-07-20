import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { Chart } from "@antv/g2";
import type { ChartEngineViewProps, ChartInteractionEvent } from "@/components/charts/engine/types";
import { chartViewModelToRenderSpec } from "@/components/charts/engine/buildChartViewModel";
import { buildAntvRenderPlan } from "@/components/charts/engine/antv/buildAntvSpec";
import { antvGeoEngine } from "@/components/charts/engine/antv/geo/OfflineGeoAntVPort";
import { readChartGeoStyle } from "@/lib/chartDeStyle";
import { findMapDrillFilterValue } from "@/lib/geoMapLevels";
import { cn } from "@/lib/utils";
import { useEmbeddedChartLiveResize } from "@/hooks/useEmbeddedChartLiveResize";
import { useGeoMapLevel } from "@/hooks/useGeoMapLevel";
import {
  ADVANCED_CHART_ROW_CAP,
  capRows,
} from "@/components/charts/engine/buildDatasetEncoding";

function AntvMapViewInner({
  viewModel,
  style,
  fill = false,
  height = 180,
  width,
  ariaLabel,
  mapPlaceholderHint,
  mapDrillError,
  drillLookupRows,
  chartConfig,
  drillStack = [],
  drillClickField,
  onInteraction,
  onJumpClick,
}: ChartEngineViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<Chart | null>(null);
  const geoStyle = useMemo(() => readChartGeoStyle(style.deStyle), [style.deStyle]);
  const plan = useMemo(() => buildAntvRenderPlan(viewModel), [viewModel]);
  const spec = useMemo(() => chartViewModelToRenderSpec(viewModel), [viewModel]);
  const rows = viewModel.dataset.rows;
  const columns = viewModel.dataset.columns;
  const { rows: capped } = useMemo(() => capRows(rows, ADVANCED_CHART_ROW_CAP), [rows]);

  const mapDrillEnabled = viewModel.chartType === "map" && Boolean(chartConfig);
  const { context: geoMapLevel, loading: geoMapLoading } = useGeoMapLevel({
    enabled: mapDrillEnabled,
    config: chartConfig,
    drillStack,
  });

  const geoMatchStats = useMemo(() => {
    if (viewModel.chartType !== "map") return null;
    const regionField = spec.encoding.dimensions[0]?.field;
    if (!regionField) return null;
    return antvGeoEngine.analyzeMatch(
      capped,
      columns,
      regionField,
      geoMapLevel.knownRegionNames,
      geoMapLevel.drillDepth === 0,
    );
  }, [viewModel.chartType, spec, capped, columns, geoMapLevel]);

  const geoMatchWarning =
    geoMatchStats &&
    geoMatchStats.total > 0 &&
    geoMatchStats.matched < geoMatchStats.total
      ? `有 ${geoMatchStats.total - geoMatchStats.matched} 条无法匹配地图区域`
      : null;

  const geoAssetWarning = geoMapLevel.missingAsset ?? mapDrillError ?? null;

  const emitInteraction = useCallback(
    (event: ChartInteractionEvent) => {
      onInteraction?.(event);
    },
    [onInteraction],
  );

  useEffect(() => {
    if (!containerRef.current || plan.kind !== "g2geo" || geoMapLoading) return;
    chartRef.current?.destroy();

    const planSpec = plan.options.spec as {
      encoding: { dimensions: Array<{ field: string }>; metrics: Array<{ field: string }> };
    };
    const planRows = plan.options.rows as unknown[][];
    const planColumns = plan.options.columns as string[];
    const regionField = planSpec.encoding.dimensions[0]?.field ?? "";
    const metricField = planSpec.encoding.metrics[0]?.field ?? "";

    const built = antvGeoEngine.buildMapOption({
      rows: planRows,
      columns: planColumns,
      regionField,
      metricField,
      geo: geoStyle,
      showLabel: style.showLabel,
      valueFormat: style.valueFormat,
      mapId: geoMapLevel.mapId,
      knownRegionNames: geoMapLevel.knownRegionNames,
    });
    const features = (built.features as Array<{ name: string; value: number; geometry?: unknown }>) ?? [];

    const chart = new Chart({
      container: containerRef.current,
      autoFit: true,
      padding: 8,
      supportCSSTransform: true,
    } as ConstructorParameters<typeof Chart>[0]);

    chart
      .polygon()
      .data(features)
      .encode("color", "value")
      .scale("color", { palette: "blues" })
      .style("stroke", "#fff")
      .style("lineWidth", 0.5)
      .tooltip({ title: "name", items: [{ field: "value" }] })
      .interaction("elementHighlight", true);

    if (onInteraction || onJumpClick) {
      chart.on("element:click", (ev: { data?: { data?: { name?: string } } }) => {
        if (onJumpClick) {
          onJumpClick();
          return;
        }
        const name = ev.data?.data?.name;
        if (!name || !onInteraction) return;
        const label = String(name);
        if (drillClickField) {
          const lookupRows = drillLookupRows ?? rows;
          const filterValue = findMapDrillFilterValue(
            label,
            drillClickField,
            lookupRows,
            columns,
            geoMapLevel.knownRegionNames,
          );
          emitInteraction({ kind: "drill", value: filterValue, label });
          return;
        }
        emitInteraction({ kind: "drill", value: label, label });
      });
    }

    chart.render();
    chartRef.current = chart;

    return () => {
      chart.destroy();
      chartRef.current = null;
    };
  }, [
    plan,
    geoMapLevel.mapId,
    geoMapLevel.knownRegionNames,
    geoMapLoading,
    onInteraction,
    onJumpClick,
    geoStyle,
    style.showLabel,
    style.valueFormat,
    drillClickField,
    drillLookupRows,
    rows,
    columns,
    emitInteraction,
  ]);

  useEmbeddedChartLiveResize(fill, containerRef, () => chartRef.current?.render());

  const showPlaceholder = (plan.options.rows as unknown[][])?.length === 0;
  const warning = geoMatchWarning ?? geoAssetWarning;

  return (
    <div
      className={cn("relative w-full", fill ? "absolute inset-0 min-h-0" : "min-h-[180px]")}
      aria-label={ariaLabel}
      data-testid="antv-map-chart"
    >
      {warning ? (
        <p role="status" className="mb-1 shrink-0 text-theme-xs text-warning-600 dark:text-warning-400">
          {warning}
        </p>
      ) : null}
      {geoMapLoading ? (
        <p role="status" className="mb-1 shrink-0 text-theme-xs text-gray-500">
          加载地图…
        </p>
      ) : null}
      <div
        ref={containerRef}
        className={cn("h-full w-full", fill ? "min-h-0" : "")}
        style={fill ? undefined : { height, width: width ?? "100%" }}
      />
      {showPlaceholder && mapPlaceholderHint ? (
        <p className="pointer-events-none absolute inset-x-0 bottom-[10%] text-center text-theme-xs text-gray-500">
          {mapPlaceholderHint}
        </p>
      ) : null}
    </div>
  );
}

export const AntvMapView = memo(AntvMapViewInner);
