import type { ChartDeStyle } from "@/lib/chartDeStyle";
import type { ChartRenderPlan } from "@/components/charts/engine/buildChartRenderPlan";
import {
  DEFAULT_CARTESIAN_BAR_WIDTH_RATIO,
  DEFAULT_CARTESIAN_POINT_SIZE,
  DEFAULT_GAUGE_MAX,
  DEFAULT_GAUGE_MIN,
  DEFAULT_PIE_OUTER_RADIUS_PERCENT,
  type ChartAxisStyle,
  type ChartDeStyleBlocks,
} from "@/lib/chartDeStyleBlocks";

export type PlanCartesianStyle = {
  barWidthRatio?: number;
  barRadius?: number;
  pointSize?: number;
  areaOpacity?: number;
  smooth?: boolean;
  axisStyle?: ChartAxisStyle;
};

/** deStyle.cartesian.lineSmooth 优先；其次 plan.options.smooth；最后 styleVariant=smooth */
export function resolveCartesianLineSmooth(opts: {
  lineSmooth?: boolean;
  planSmooth?: unknown;
  styleVariant?: string;
}): boolean {
  if (opts.lineSmooth !== undefined) {
    return opts.lineSmooth;
  }
  if (opts.planSmooth != null) {
    return Boolean(opts.planSmooth);
  }
  return opts.styleVariant === "smooth";
}

function planUsesLineSmooth(plan: ChartRenderPlan): boolean {
  if (plan.kind !== "d3") return false;
  if (plan.plotType === "Line" || plan.plotType === "DualAxes") return true;
  return Boolean(plan.options.area);
}

/** 从 style chain 后的 plan.options 读取笛卡尔样式块 */
export function readCartesianStyleFromPlanOptions(
  options: Record<string, unknown>,
): PlanCartesianStyle {
  return {
    barWidthRatio: options.__barWidthRatio as number | undefined,
    barRadius: options.__barRadius as number | undefined,
    pointSize: options.__pointSize as number | undefined,
    areaOpacity: options.__areaOpacity as number | undefined,
    smooth: options.smooth != null ? Boolean(options.smooth) : undefined,
    axisStyle: options.__axisStyle as ChartAxisStyle | undefined,
  };
}

export function resolveGaugeValuePercent(
  options: Record<string, unknown>,
  rawValue: number,
  fallbackPercent: number,
): number {
  const min = Number(options.__gaugeMin ?? DEFAULT_GAUGE_MIN);
  const max = Number(options.__gaugeMax ?? DEFAULT_GAUGE_MAX);
  const span = Math.max(max - min, 1e-6);
  if (Number.isFinite(rawValue)) {
    return Math.min(1, Math.max(0, (rawValue - min) / span));
  }
  return Math.min(1, Math.max(0, fallbackPercent));
}

function readBlocks(deStyle: ChartDeStyle): ChartDeStyleBlocks {
  return deStyle as ChartDeStyle & ChartDeStyleBlocks;
}

/** 将 deStyle 类型块映射进 D3 render plan.options */
export function applyChartDeStyleBlocksToPlan(
  plan: ChartRenderPlan,
  deStyle: ChartDeStyle,
  opts?: { styleVariant?: string },
): ChartRenderPlan {
  if (plan.kind !== "d3") return plan;
  const blocks = readBlocks(deStyle);
  const options = { ...plan.options };

  if (blocks.cartesian) {
    const c = blocks.cartesian;
    if (c.barWidthRatio != null) options.__barWidthRatio = c.barWidthRatio;
    if (c.barRadius != null) options.__barRadius = c.barRadius;
    if (c.pointSize != null) options.__pointSize = c.pointSize;
    if (c.areaOpacity != null) options.__areaOpacity = c.areaOpacity;
  }

  if (blocks.axis) {
    options.__axisStyle = blocks.axis;
  }

  if (plan.plotType === "Pie" && deStyle.pie) {
    const pie = deStyle.pie;
    if (pie.innerRadiusPercent != null && pie.innerRadiusPercent > 0) {
      options.innerRadius = pie.innerRadiusPercent / 100;
    }
    if (pie.outerRadiusPercent != null) {
      options.__outerRadiusPercent = pie.outerRadiusPercent;
    }
    if (pie.padAngle != null) options.__padAngle = pie.padAngle;
    if (pie.topN != null) options.__pieTopN = pie.topN;
  }

  if (plan.plotType === "Gauge" && blocks.gauge) {
    const g = blocks.gauge;
    if (g.min != null) options.__gaugeMin = g.min;
    if (g.max != null) options.__gaugeMax = g.max;
    if (g.startAngleDeg != null) options.__gaugeStartAngleDeg = g.startAngleDeg;
    if (g.endAngleDeg != null) options.__gaugeEndAngleDeg = g.endAngleDeg;
    if (g.pointerColor) options.__gaugePointerColor = g.pointerColor;
    if (g.splitNumber != null) options.__gaugeSplitNumber = g.splitNumber;
  }

  if (plan.plotType === "Liquid" && blocks.liquid) {
    const l = blocks.liquid;
    if (l.targetValue != null) options.__liquidTarget = l.targetValue;
    if (l.outlineWidth != null) options.__liquidOutlineWidth = l.outlineWidth;
    if (l.waveColor) options.__liquidWaveColor = l.waveColor;
  }

  if (blocks.funnel) {
    const f = blocks.funnel;
    if (f.sort) options.__funnelSort = f.sort;
    if (f.gap != null) options.__funnelGap = f.gap;
    if (f.showConversionRate != null) options.__funnelShowConversion = f.showConversionRate;
  }

  if (blocks.sankey) {
    const s = blocks.sankey;
    if (s.nodeWidth != null) options.__sankeyNodeWidth = s.nodeWidth;
    if (s.nodeGap != null) options.__sankeyNodeGap = s.nodeGap;
    if (s.linkOpacity != null) options.__sankeyLinkOpacity = s.linkOpacity;
  }

  if (blocks.graph) {
    const g = blocks.graph;
    if (g.layout) options.__graphLayout = g.layout;
    if (g.edgeLength != null) options.__graphEdgeLength = g.edgeLength;
    if (g.repulsion != null) options.__graphRepulsion = g.repulsion;
  }

  if (blocks.radar) {
    const r = blocks.radar;
    if (r.shape) options.__radarShape = r.shape;
    if (r.areaOpacity != null) options.__radarAreaOpacity = r.areaOpacity;
    if (r.showAxisName != null) options.__radarShowAxisName = r.showAxisName;
  }

  if (blocks.wordCloud) {
    const w = blocks.wordCloud;
    if (w.fontSizeMin != null) options.__wordCloudFontMin = w.fontSizeMin;
    if (w.fontSizeMax != null) options.__wordCloudFontMax = w.fontSizeMax;
    if (w.spacing != null) options.__wordCloudSpacing = w.spacing;
  }

  if (blocks.treemap) {
    const t = blocks.treemap;
    if (t.paddingInner != null) options.__treemapPaddingInner = t.paddingInner;
    if (t.paddingOuter != null) options.__treemapPaddingOuter = t.paddingOuter;
    if (t.cellRadius != null) options.__treemapCellRadius = t.cellRadius;
  }

  if (blocks.circlePacking) {
    const c = blocks.circlePacking;
    if (c.layoutPadding != null) options.__circlePackingPadding = c.layoutPadding;
    if (c.labelMinRadius != null) options.__circlePackingLabelMinRadius = c.labelMinRadius;
  }

  if (blocks.kpi) {
    const k = blocks.kpi;
    if (k.fontSize != null) options.__kpiFontSize = k.fontSize;
    if (k.align) options.__kpiAlign = k.align;
  }

  if (planUsesLineSmooth(plan)) {
    options.smooth = resolveCartesianLineSmooth({
      lineSmooth: blocks.cartesian?.lineSmooth,
      planSmooth: plan.options.smooth,
      styleVariant: opts?.styleVariant,
    });
  }

  return { ...plan, options };
}

export function resolveBarBandPadding(barWidthRatio?: number): number {
  const ratio = barWidthRatio ?? DEFAULT_CARTESIAN_BAR_WIDTH_RATIO;
  const clamped = Math.min(0.9, Math.max(0.1, ratio));
  return Math.max(0.05, 1 - clamped);
}

export function resolveCartesianPointSize(pointSize?: number): number {
  return pointSize ?? DEFAULT_CARTESIAN_POINT_SIZE;
}

export function resolveGaugeAngles(deStyle: ChartDeStyle): {
  min: number;
  max: number;
  start: number;
  end: number;
} {
  const blocks = readBlocks(deStyle);
  const g = blocks.gauge ?? {};
  return {
    min: g.min ?? DEFAULT_GAUGE_MIN,
    max: g.max ?? DEFAULT_GAUGE_MAX,
    start: g.startAngleDeg ?? -135,
    end: g.endAngleDeg ?? 135,
  };
}

export function resolvePieOuterRadiusPercent(deStyle: ChartDeStyle): number {
  return deStyle.pie?.outerRadiusPercent ?? DEFAULT_PIE_OUTER_RADIUS_PERCENT;
}
