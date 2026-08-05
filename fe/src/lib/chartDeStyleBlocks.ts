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
  lineWidth?: number;
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
  /** 目标值类型：固定值 / 动态字段聚合（对标 DE liquidMaxType） */
  maxType?: "fix" | "dynamic";
  /** 固定目标值；水位 = 指标 / max */
  max?: number;
  /** 动态目标字段名（sum 聚合） */
  maxField?: string;
  /** 图形大小 %，对标 DE liquidSize，默认 80 */
  size?: number;
  outlineWidth?: number;
  waveColor?: string;
  /** @deprecated 旧参考线语义，不再参与水位计算 */
  targetValue?: number;
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

export type ChartTreemapStyle = {
  paddingInner?: number;
  paddingOuter?: number;
  cellRadius?: number;
};

export type ChartCirclePackingStyle = {
  layoutPadding?: number;
  labelMinRadius?: number;
};

export type ChartQuadrantStyle = {
  lineColor?: string;
  lineWidth?: number;
  showRegionBg?: boolean;
  regionOpacity?: number;
};

export type ChartProgressBarStyle = {
  trackOpacity?: number;
};

export type ChartBulletStyle = {
  targetLineWidth?: number;
  rangeOpacity?: number;
};

export type ChartStockLineStyle = {
  bodyWidthRatio?: number;
};

export const DEFAULT_CARTESIAN_BAR_WIDTH_RATIO = 0.55;
export const DEFAULT_CARTESIAN_POINT_SIZE = 4;
export const DEFAULT_CARTESIAN_LINE_WIDTH = 2.5;
export const DEFAULT_PIE_OUTER_RADIUS_PERCENT = 70;
export const DEFAULT_GAUGE_MIN = 0;
export const DEFAULT_GAUGE_MAX = 100;
export const DEFAULT_LIQUID_SIZE = 80;

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
  treemap?: ChartTreemapStyle;
  circlePacking?: ChartCirclePackingStyle;
  quadrant?: ChartQuadrantStyle;
  progressBar?: ChartProgressBarStyle;
  bullet?: ChartBulletStyle;
  stockLine?: ChartStockLineStyle;
};
