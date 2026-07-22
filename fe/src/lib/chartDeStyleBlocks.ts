import type { NumberFormatConfig } from "@/components/dashboard/dashboardStyleConfig";

export type ChartAxisSideStyle = {
  show?: boolean;
  name?: string;
  lineColor?: string;
  lineWidth?: number;
  labelRotate?: number;
  formatType?: NumberFormatConfig["type"];
};

export type ChartAxisStyle = {
  x?: ChartAxisSideStyle;
  y?: ChartAxisSideStyle;
};

export type ChartCartesianStyle = {
  barWidthRatio?: number;
  barRadius?: number;
  lineSmooth?: boolean;
  pointSize?: number;
  areaOpacity?: number;
};

export type ChartPieShapeStyle = {
  innerRadiusPercent?: number;
  outerRadiusPercent?: number;
  padAngle?: number;
  topN?: number;
};

export type ChartGaugeStyle = {
  min?: number;
  max?: number;
  startAngleDeg?: number;
  endAngleDeg?: number;
  pointerColor?: string;
  splitNumber?: number;
};

export type ChartLiquidStyle = {
  targetValue?: number;
  outlineWidth?: number;
  waveColor?: string;
};

export type ChartKpiStyle = {
  fontSize?: number;
  align?: "left" | "center" | "right";
};

export type ChartFunnelStyle = {
  sort?: "descending" | "ascending" | "none";
  gap?: number;
  showConversionRate?: boolean;
};

export type ChartSankeyStyle = {
  nodeWidth?: number;
  nodeGap?: number;
  linkOpacity?: number;
};

export type ChartGraphStyle = {
  layout?: "force" | "dagre";
  edgeLength?: number;
  repulsion?: number;
};

export type ChartRadarStyle = {
  shape?: "polygon" | "circle";
  areaOpacity?: number;
  showAxisName?: boolean;
};

export type ChartWordCloudStyle = {
  fontSizeMin?: number;
  fontSizeMax?: number;
  spacing?: number;
};

export const DEFAULT_CARTESIAN_BAR_WIDTH_RATIO = 0.55;
export const DEFAULT_CARTESIAN_POINT_SIZE = 4;
export const DEFAULT_PIE_OUTER_RADIUS_PERCENT = 70;
export const DEFAULT_GAUGE_MIN = 0;
export const DEFAULT_GAUGE_MAX = 100;

export type ChartDeStyleBlocks = {
  axis?: ChartAxisStyle;
  cartesian?: ChartCartesianStyle;
  gauge?: ChartGaugeStyle;
  liquid?: ChartLiquidStyle;
  kpi?: ChartKpiStyle;
  funnel?: ChartFunnelStyle;
  sankey?: ChartSankeyStyle;
  graph?: ChartGraphStyle;
  radar?: ChartRadarStyle;
  wordCloud?: ChartWordCloudStyle;
};
