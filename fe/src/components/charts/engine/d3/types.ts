import type { AntvThemeTokens } from "@/components/charts/engine/antv/theme";
import type { ChartConditionalRule, ChartMarkLine } from "@/lib/chartDeFeatures";
import type { NumberFormatConfig } from "@/components/dashboard/dashboardStyleConfig";
import type { ChartGeoStyle, ChartGeo3dStyle } from "@/lib/chartDeStyle";
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

export type D3CartesianStyleExtras = {
  barWidthRatio?: number;
  barRadius?: number;
  pointSize?: number;
  areaOpacity?: number;
  smooth?: boolean;
  axisStyle?: import("@/lib/chartDeStyleBlocks").ChartAxisStyle;
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
  D3PresentationConfig &
  D3CartesianStyleExtras;

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
  barWidthRatio?: number;
  barRadius?: number;
  pointSize?: number;
  areaOpacity?: number;
  axisStyle?: import("@/lib/chartDeStyleBlocks").ChartAxisStyle;
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
  drillDepth?: number;
  drillBreadcrumbLabels?: string[];
  levelLabel?: string;
  isDark?: boolean;
  geoStyle?: D3GeoStyleProps;
  geo3dStyle?: ChartGeo3dStyle;
  onPointClick?: (datum: { name: string; value: number; adcode?: number }) => void;
};

export type D3MatrixCell = { x: string; y: string; value: number };

export type D3MatrixRenderConfig = D3RenderConfigBase & {
  data: D3MatrixCell[];
  conditionalRules?: ChartConditionalRule[];
  showCellLabel?: boolean;
  showVisualMap?: boolean;
  heatmapBrush?: boolean;
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
  barWidthRatio?: number;
  barRadius?: number;
  axisStyle?: import("@/lib/chartDeStyleBlocks").ChartAxisStyle;
  smooth?: boolean;
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
  /** 图例/提示左系列名；缺省「左」 */
  leftLabel?: string;
  /** 图例/提示右系列名；缺省「右」 */
  rightLabel?: string;
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
  /** 是否绘制目标竖线；默认 true */
  showTargetLine?: boolean;
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
  /** rangeMax 比例阈值，如 [0.66, 0.85, 1]；缺省使用内置三区 */
  bulletZones?: number[];
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
  dataZoom?: boolean;
  onPointClick?: (datum: D3StockDatum) => void;
};
