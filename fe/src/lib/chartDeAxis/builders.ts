import type { DeAxisFieldType, DeAxisId, DeAxisSlot, DeAxisSpec } from "./types";

type AxisOpts = Partial<Omit<DeAxisSpec, "id" | "label">> & { label?: string };

/** DE 式多字段容器默认上限 */
export const DE_MULTI_FIELD_LIMIT = 8;

export const MULTI_DIM_OPTS: AxisOpts = {
  uiMode: "multi",
  limit: DE_MULTI_FIELD_LIMIT,
  maxDimensions: DE_MULTI_FIELD_LIMIT,
};

export const MULTI_MET_OPTS: AxisOpts = {
  uiMode: "multi",
  limit: DE_MULTI_FIELD_LIMIT,
  maxMetrics: DE_MULTI_FIELD_LIMIT,
  showAggregation: true,
};

function axis(
  id: DeAxisId,
  label: string,
  fieldType: DeAxisFieldType,
  opts: AxisOpts = {},
): DeAxisSpec {
  const limit = opts.limit ?? 1;
  return {
    id,
    label: opts.label ?? label,
    fieldType,
    limit,
    required: opts.required ?? true,
    showAggregation: opts.showAggregation ?? fieldType === "metric",
    slotLabels: opts.slotLabels,
    uiMode: opts.uiMode,
    maxDimensions: opts.maxDimensions,
    maxMetrics: opts.maxMetrics,
  };
}

export const deAxis = {
  xDim: (label = "类别轴 / 维度", opts: AxisOpts = {}) =>
    axis("xAxis", label, "dimension", opts),
  xExt: (label = "子类别 / 维度", opts: AxisOpts = {}) =>
    axis("xAxisExt", label, "dimension", { required: false, ...opts }),
  yMet: (label = "值轴 / 指标", opts: AxisOpts = {}) =>
    axis("yAxis", label, "metric", { showAggregation: true, ...opts }),
  yExt: (label = "副轴 / 指标", opts: AxisOpts = {}) =>
    axis("yAxisExt", label, "metric", { showAggregation: true, ...opts }),
  bubble: (label = "气泡大小 / 指标", opts: AxisOpts = {}) =>
    axis("extBubble", label, "metric", { required: false, showAggregation: true, ...opts }),
  color: (label = "颜色 / 维度", opts: AxisOpts = {}) =>
    axis("extColor", label, "dimension", opts),
  drill: (label = "钻取 / 维度", opts: AxisOpts = {}) =>
    axis("drill", label, "dimension", { required: false, ...opts }),
  both: (label: string, opts: AxisOpts = {}) =>
    axis("xAxis", label, "both", opts),
};

/** 笛卡尔默认：类别（可多字段 1–8）+ 子类别 + 值轴（可多指标）+ 钻取 */
export function cartesianTrendAxes(subLabel = "子类别 / 维度"): DeAxisSpec[] {
  return [
    deAxis.xDim("类别轴 / 维度", MULTI_DIM_OPTS),
    deAxis.xExt(subLabel),
    deAxis.yMet("值轴 / 指标", MULTI_MET_OPTS),
    deAxis.drill(),
  ];
}

function pushSlot(
  slots: DeAxisSlot[],
  spec: DeAxisSpec,
  index: number,
  label: string,
  legacyMaps?: Array<{ axisId: DeAxisId; index: number; legacy: DeAxisSlot["legacy"] }>,
) {
  const legacy = legacyMaps?.find((m) => m.axisId === spec.id && m.index === index)?.legacy;
  slots.push({
    axisId: spec.id,
    index,
    label,
    fieldType: spec.fieldType,
    required: spec.required,
    showAggregation: spec.showAggregation,
    uiMode: spec.uiMode,
    limit: spec.limit,
    maxDimensions: spec.maxDimensions,
    maxMetrics: spec.maxMetrics,
    legacy,
  });
}

export function expandAxisSpecs(
  specs: DeAxisSpec[],
  legacyMaps?: Array<{ axisId: DeAxisId; index: number; legacy: DeAxisSlot["legacy"] }>,
): DeAxisSlot[] {
  const slots: DeAxisSlot[] = [];
  for (const spec of specs) {
    if (spec.uiMode === "multi" && !spec.slotLabels?.length) {
      pushSlot(slots, spec, 0, spec.label, legacyMaps);
      continue;
    }
    for (let i = 0; i < spec.limit; i += 1) {
      const sub = spec.slotLabels?.[i];
      const label = sub ? `${spec.label} · ${sub}` : spec.limit > 1 && i > 0 ? `${spec.label} (${i + 1})` : spec.label;
      pushSlot(slots, spec, i, label, legacyMaps);
    }
  }
  return slots;
}
