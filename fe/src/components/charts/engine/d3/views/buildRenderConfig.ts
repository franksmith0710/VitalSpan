import type { ChartRenderPlan } from "@/components/charts/engine/buildChartRenderPlan";
import { chartViewModelToRenderSpec } from "@/components/charts/engine/buildChartViewModel";
import { VS_REGIONS_MAP_ID } from "@/components/charts/engine/geo/geoConstants";
import { findMapDrillFilterValue } from "@/lib/geoMapLevels";
import type { ChartEngineViewProps } from "@/components/charts/engine/types";
import type { D3DispatchPayload } from "@/components/charts/engine/d3/renderDispatch";
import { buildD3StyleProps } from "@/components/charts/engine/d3/views/buildStyleProps";
import { extractDrillValue, buildCartesianRenderConfig } from "@/components/charts/engine/d3/views/buildCartesianConfig";
import { readCartesianStyleFromPlanOptions, readCompareStyleFromPlanOptions } from "@/lib/applyChartDeStyleBlocks";
import { readChartDeStyle, readChartGeoStyle, readChartGeo3dStyle } from "@/lib/chartDeStyle";
import {
  defaultGeo3dRenderTier,
  resolveTerrainTextureEnabled,
} from "@/components/charts/engine/three/geo3dRuntime";
import type {
  D3BarRangeDatum,
  D3BidirectionalBarDatum,
  D3BulletDatum,
  D3CartesianDatum,
  D3MatrixCell,
  D3ProgressBarDatum,
  D3StockDatum,
  D3WaterfallDatum,
} from "@/components/charts/engine/d3/types";

function onDatumClick(
  props: ChartEngineViewProps,
  xField: string,
): ((datum: D3CartesianDatum) => void) | undefined {
  const { onInteraction, onJumpClick } = props;
  if (!onInteraction && !onJumpClick) return undefined;
  return (datum) => {
    if (onJumpClick) {
      onJumpClick();
      return;
    }
    const value = extractDrillValue(datum, xField);
    if (value) onInteraction?.({ kind: "drill", value, label: value });
  };
}

export function buildD3DispatchPayload(
  props: ChartEngineViewProps,
  plan: ChartRenderPlan,
  chartWidth: number,
  chartHeight: number,
): D3DispatchPayload | null {
  if (plan.kind !== "d3" || plan.empty) return null;
  const styleProps = buildD3StyleProps(props, plan);
  const options = plan.options;
  const plotType = plan.plotType;
  const cartesianStyle = readCartesianStyleFromPlanOptions(options);
  const compareStyle = readCompareStyleFromPlanOptions(options);

  const presentation = {
    labelFontSize: styleProps.labelFontSize,
    labelColor: styleProps.labelColor,
    seriesGradient: styleProps.seriesGradient,
    depthVisual: styleProps.depthVisual,
    tooltipPresentation: styleProps.tooltipPresentation,
  };

  if (plotType === "Choropleth") {
    const spec = chartViewModelToRenderSpec(props.viewModel);
    const regionField = spec.encoding.dimensions[0]?.field ?? "";
    const metricField = spec.encoding.metrics[0]?.field ?? "";
    const rows = (options.rows as unknown[][]) ?? [];
    const columns = (options.columns as string[]) ?? [];
    const geoStyle = props.chartConfig ? readChartGeoStyle(readChartDeStyle(props.chartConfig)) : {};
    const deStyle = props.chartConfig ? readChartDeStyle(props.chartConfig) : {};
    const isMap3d = props.viewModel.chartType === "map-3d";
    const geo3dStyleRaw = props.chartConfig ? readChartGeo3dStyle(readChartDeStyle(props.chartConfig)) : {};
    const renderTier = props.geo3dRenderTier ?? "full";
    const geo3dStyle = {
      ...geo3dStyleRaw,
      terrainTexture: resolveTerrainTextureEnabled(renderTier, geo3dStyleRaw),
    };
    return {
      kind: "geo",
      config: {
        width: chartWidth,
        height: chartHeight,
        rows,
        columns,
        regionField,
        metricField,
        knownRegionNames: options.knownRegionNames as string[] | undefined,
        mapId: (options.mapId as string | undefined) ?? VS_REGIONS_MAP_ID,
        drillDepth: (options.drillDepth as number | undefined) ?? 0,
        isDark: props.isDark ?? props.style.scheme === "dark",
        geoStyle: {
          roam: geoStyle.roam,
          showRegionLabel: geoStyle.showRegionLabel,
          visualMap: geoStyle.visualMap,
          showRegionBorder: geoStyle.showRegionBorder,
          regionBorderColor: geoStyle.regionBorderColor,
          regionFillColor: geoStyle.regionFillColor,
          showZoomControl: geoStyle.showZoomControl,
          mapOpacity: deStyle.paletteOpacity,
        },
        geo3dStyle,
        renderTier,
        instanceKey: props.instanceKey,
        colors: styleProps.colors,
        theme: styleProps.theme,
        showTooltip: styleProps.showTooltip,
        tooltipPresentation: styleProps.tooltipPresentation,
        valueFormat: styleProps.valueFormat,
        onPointClick: props.onInteraction
          ? (datum) => {
              const clickField = props.drillClickField ?? regionField;
              const lookupRows = props.drillLookupRows ?? rows;
              const known = (options.knownRegionNames as string[] | undefined) ?? [];
              const value = clickField
                ? findMapDrillFilterValue(datum.name, clickField, lookupRows, columns, known)
                : datum.name;
              props.onInteraction?.({ kind: "drill", value, label: datum.name });
            }
          : undefined,
        depthVisual: styleProps.depthVisual,
      },
    };
  }

  if (plotType === "Heatmap") {
    const data = (options.data as D3MatrixCell[]) ?? [];
    const geoStyle = props.chartConfig ? readChartGeoStyle(readChartDeStyle(props.chartConfig)) : {};
    return {
      kind: "matrix",
      config: {
        width: chartWidth,
        height: chartHeight,
        data,
        colors: styleProps.colors,
        theme: styleProps.theme,
        showTooltip: styleProps.showTooltip,
        tooltipPresentation: styleProps.tooltipPresentation,
        valueFormat: styleProps.valueFormat,
        conditionalRules: styleProps.conditionalRules,
        showCellLabel: geoStyle.showCellLabel === true,
        showVisualMap: geoStyle.visualMap !== false,
        depthVisual: styleProps.depthVisual,
        onPointClick: props.onInteraction
          ? (datum) => props.onInteraction?.({ kind: "drill", value: datum.x, label: `${datum.x}/${datum.y}` })
          : undefined,
      },
    };
  }

  if (plotType === "DualAxes") {
    const data = options.data as [D3CartesianDatum[], D3CartesianDatum[]];
    const xField = String(options.xField ?? "__category__");
    const yField = options.yField as [string, string];
    return {
      kind: "dualAxes",
      config: {
        width: chartWidth,
        height: chartHeight,
        data,
        xField,
        yField,
        geometryOptions: (options.geometryOptions ?? []) as [
          { geometry: "line" },
          { geometry: "column"; isGroup?: boolean; isStack?: boolean },
        ],
        lineLabels: options.lineLabels as [string, string] | undefined,
        columnSeriesField: options.columnSeriesField as string | undefined,
        showLabel: styleProps.showLabel,
        labelFontSize: styleProps.labelFontSize,
        labelColor: styleProps.labelColor,
        seriesGradient: styleProps.seriesGradient,
        tooltipPresentation: styleProps.tooltipPresentation,
        dataZoom: Boolean(options.__dataZoom),
        colors: styleProps.colors,
        theme: styleProps.theme,
        showTooltip: styleProps.showTooltip,
        showLegend: styleProps.showLegend,
        valueFormat: styleProps.valueFormat,
        markLines: styleProps.markLines,
        conditionalRules: styleProps.conditionalRules,
        legendLayout: styleProps.legendLayout,
        ...cartesianStyle,
        onPointClick: onDatumClick(props, xField),
      },
    };
  }

  if (plotType === "Waterfall") {
    const data = (options.data as D3WaterfallDatum[]) ?? [];
    return {
      kind: "waterfall",
      config: {
        width: chartWidth,
        height: chartHeight,
        data,
        colors: styleProps.colors,
        theme: styleProps.theme,
        showTooltip: styleProps.showTooltip,
        showLabel: styleProps.showLabel,
        showLegend: styleProps.showLegend,
        legendLayout: styleProps.legendLayout,
        ...presentation,
        valueFormat: styleProps.valueFormat,
        ...cartesianStyle,
        onPointClick: props.onInteraction
          ? (datum) => props.onInteraction?.({ kind: "drill", value: datum.type, label: datum.type })
          : undefined,
      },
    };
  }

  if (plotType === "BidirectionalBar") {
    const raw = (options.data as D3BidirectionalBarDatum[]) ?? [];
    return {
      kind: "bidirectional",
      config: {
        width: chartWidth,
        height: chartHeight,
        data: raw,
        colors: styleProps.colors,
        theme: styleProps.theme,
        showTooltip: styleProps.showTooltip,
        showLabel: styleProps.showLabel,
        showLegend: styleProps.showLegend,
        legendLayout: styleProps.legendLayout,
        ...presentation,
        valueFormat: styleProps.valueFormat,
        ...cartesianStyle,
      },
    };
  }

  const specialPlot = new Set(["BarRange", "ProgressBar", "Bullet", "Stock"]);
  if (specialPlot.has(plotType)) {
    const data = (options.data as D3BarRangeDatum[] | D3ProgressBarDatum[] | D3BulletDatum[] | D3StockDatum[]) ?? [];
    const base = {
      width: chartWidth,
      height: chartHeight,
      data,
      colors: styleProps.colors,
      theme: styleProps.theme,
      showTooltip: styleProps.showTooltip,
      showLabel: styleProps.showLabel,
      ...presentation,
      valueFormat: styleProps.valueFormat,
      ...cartesianStyle,
      ...compareStyle,
      onPointClick: props.onInteraction
        ? (datum: { type: string }) =>
            props.onInteraction?.({ kind: "drill", value: datum.type, label: datum.type })
        : undefined,
    };
    if (plotType === "BarRange") return { kind: "barRange", config: base as never };
    if (plotType === "ProgressBar") return { kind: "progressBar", config: base as never };
    if (plotType === "Bullet") return { kind: "bullet", config: base as never };
    return { kind: "stock", config: base as never };
  }

  const cartesianTypes = new Set(["Line", "Column", "Bar"]);
  if (cartesianTypes.has(plotType)) {
    const cartesian = buildCartesianRenderConfig(props, plan, chartWidth, chartHeight);
    if (cartesian) return { kind: "cartesian", config: cartesian };
  }

  return {
    kind: "generic",
    config: {
      width: chartWidth,
      height: chartHeight,
      options,
      colors: styleProps.colors,
      theme: styleProps.theme,
      showLabel: styleProps.showLabel,
      showTooltip: styleProps.showTooltip,
      showLegend: styleProps.showLegend,
      ...presentation,
      valueFormat: styleProps.valueFormat,
      conditionalRules: styleProps.conditionalRules,
      markLines: styleProps.markLines,
      legendLayout: styleProps.legendLayout,
      ...cartesianStyle,
      ...compareStyle,
      onPointClick: props.onInteraction
        ? (datum) => {
            const label = String(datum.type ?? datum.stage ?? datum.name ?? datum.word ?? "");
            if (label) props.onInteraction?.({ kind: "drill", value: label, label });
          }
        : undefined,
    },
  };
}
