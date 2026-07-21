import type { AntvThemeTokens } from "@/components/charts/engine/antv/theme";
import type { ChartConditionalRule, ChartMarkLine } from "@/lib/chartDeFeatures";
import type { NumberFormatConfig } from "@/components/dashboard/dashboardStyleConfig";
import type { ChartGeoStyle } from "@/lib/chartDeStyle";
import type { D3LegendPresentation, D3TooltipPresentation } from "@/components/charts/engine/d3/core/presentation";

export type D3Datum = Record<string, unknown>;

import type { DepthVisualLevel } from "@/components/charts/engine/d3/core/chartVisualTokens";

export type D3PresentationConfig = {
  labelFontSize?: number;
  labelColor?: string;
  seriesGradient?: boolean;
  depthVisual?: DepthVisualLevel;
  tooltipPresentation?: D3TooltipPresentation;
  legendLayout?: D3LegendPresentation;
};

export type D3RenderConfig<TOptions extends Record<string, unknown> = Record<string, unknown>> = {
  width: number;
  height: number;
  colors: string[];
  theme: AntvThemeTokens;
  showLabel: boolean;
  showTooltip: boolean;
  showLegend: boolean;
  labelFontSize: number;
  labelColor?: string;
  seriesGradient?: boolean;
  tooltipPresentation?: D3TooltipPresentation;
  valueFormat?: NumberFormatConfig;
  conditionalRules?: ChartConditionalRule[];
  onPointClick?: (datum: D3Datum) => void;
  markLines?: ChartMarkLine[];
  legendLayout?: import("@/components/charts/engine/d3/core/d3Legend").D3LegendLayout;
  options: TOptions;
};

export type D3RenderConfigBase = Pick<
  D3RenderConfig,
  "width" | "height" | "colors" | "theme" | "showTooltip" | "valueFormat"
> &
  D3PresentationConfig;

export type D3CartesianDatum = Record<string, string | number>;

export type D3CartesianRenderConfig = {
  width: number;
  height: number;
  data: D3CartesianDatum[];
  xField: string;
  yField: string;
  seriesField?: string;
  smooth?: boolean;
  isHorizontal?: boolean;
  isStack?: boolean;
  isGroup?: boolean;
  isPercent?: boolean;
  /** 面积图：true 或空对象 */
  area?: boolean | Record<string, unknown>;
  colors: string[];
  theme: AntvThemeTokens;
  showLabel: boolean;
  showTooltip: boolean;
  showLegend: boolean;
  labelFontSize: number;
  labelColor?: string;
  seriesGradient?: boolean;
  tooltipPresentation?: D3TooltipPresentation;
  valueFormat?: NumberFormatConfig;
  markLines?: ChartMarkLine[];
  conditionalRules?: ChartConditionalRule[];
  legendLayout?: import("@/components/charts/engine/d3/core/d3Legend").D3LegendLayout;
  onPointClick?: (datum: D3CartesianDatum) => void;
  dataZoom?: boolean;
};

/** @deprecated 使用 D3CartesianDatum */
export type D3LineDatum = D3CartesianDatum;

export type D3GeoFeature = {
  name: string;
  value: number;
  adcode?: number;
  geometry: GeoJSON.Geometry | null;
};

export type D3GeoStyleProps = {
  roam?: boolean;
  showRegionLabel?: boolean;
  visualMap?: boolean;
};

export type D3GeoRenderConfig = D3RenderConfigBase & {
  rows: unknown[][];
  columns: string[];
  regionField: string;
  metricField: string;
  knownRegionNames?: string[];
  mapId?: string;
  isDark?: boolean;
  geoStyle?: D3GeoStyleProps;
  onPointClick?: (datum: { name: string; value: number; adcode?: number }) => void;
};

export type D3MatrixCell = { x: string; y: string; value: number };

export type D3MatrixRenderConfig = D3RenderConfigBase & {
  data: D3MatrixCell[];
  conditionalRules?: ChartConditionalRule[];
  showCellLabel?: boolean;
  showVisualMap?: boolean;
  onPointClick?: (datum: D3MatrixCell) => void;
};

export type D3DualAxesGeometryOption =
  | { geometry: "line"; smooth?: boolean }
  | { geometry: "column"; isGroup?: boolean; isStack?: boolean };

export type D3DualAxesRenderConfig = D3RenderConfigBase & {
  data: [D3CartesianDatum[], D3CartesianDatum[]];
  xField: string;
  yField: [string, string];
  geometryOptions: [D3DualAxesGeometryOption, D3DualAxesGeometryOption];
  lineLabels?: [string, string];
  /** 柱侧子类别/堆叠系列字段（来自 encodeCartesianRows） */
  columnSeriesField?: string;
  showLabel?: boolean;
  labelFontSize?: number;
  dataZoom?: boolean;
  showLegend?: boolean;
  markLines?: ChartMarkLine[];
  conditionalRules?: ChartConditionalRule[];
  onPointClick?: (datum: D3CartesianDatum) => void;
};

export type D3WaterfallDatum = { type: string; value: number };

export type D3WaterfallRenderConfig = D3RenderConfigBase & {
  data: D3WaterfallDatum[];
  showLabel?: boolean;
  showLegend?: boolean;
  legendLayout?: import("@/components/charts/engine/d3/core/d3Legend").D3LegendLayout;
  labelFontSize?: number;
  onPointClick?: (datum: D3WaterfallDatum & { runningTotal: number }) => void;
};

export type D3BidirectionalBarDatum = { type: string; left: number; right: number };

export type D3BidirectionalBarRenderConfig = D3RenderConfigBase & {
  data: D3BidirectionalBarDatum[];
  showLabel?: boolean;
  showLegend?: boolean;
  legendLayout?: import("@/components/charts/engine/d3/core/d3Legend").D3LegendLayout;
  labelFontSize?: number;
  onPointClick?: (datum: D3BidirectionalBarDatum) => void;
};

export type D3BarRangeDatum = { type: string; low: number; high: number };

export type D3BarRangeRenderConfig = D3RenderConfigBase & {
  data: D3BarRangeDatum[];
  showLabel?: boolean;
  labelFontSize?: number;
  onPointClick?: (datum: D3BarRangeDatum) => void;
};

export type D3ProgressBarDatum = { type: string; value: number; max: number };

export type D3ProgressBarRenderConfig = D3RenderConfigBase & {
  data: D3ProgressBarDatum[];
  showLabel?: boolean;
  labelFontSize?: number;
  onPointClick?: (datum: D3ProgressBarDatum) => void;
};

export type D3BulletDatum = {
  type: string;
  actual: number;
  target: number;
  rangeMax: number;
};

export type D3BulletRenderConfig = D3RenderConfigBase & {
  data: D3BulletDatum[];
  showLabel?: boolean;
  labelFontSize?: number;
  onPointClick?: (datum: D3BulletDatum) => void;
};

export type D3StockDatum = {
  type: string;
  open: number;
  close: number;
  low: number;
  high: number;
};

export type D3StockRenderConfig = D3RenderConfigBase & {
  data: D3StockDatum[];
  showLabel?: boolean;
  labelFontSize?: number;
  onPointClick?: (datum: D3StockDatum) => void;
};
