import { chartDataSlotBlueprint } from "@/components/dashboard/chartFieldSlots";
import { classifyDatasetField } from "@/components/dashboard/datasetFieldClassification";
import { isGeoMapChartType, type ChartType } from "@/lib/chartViewConfig";
import type { SlotTarget } from "@/components/dashboard/chartInspectorTypes";

export type FieldAssignResult = { ok: true } | { ok: false; message: string };

const DATE_FIELD =
  /(?:^|_)(date|time|day|month|year|week|timestamp|datetime)(?:$|_)|_at$/i;
const GEO_FIELD =
  /(?:^|_)(region|area|city|province|country|geo|name|district|地名|省份|城市)(?:$|_)|省|市|自治区|区$|县$/i;
const REGION_ID_FIELD = /(?:^|_)(region_id|adcode|area_code|geo_id)(?:$|_)|^id$|_id$/i;

function slotMeta(chartType: ChartType | string, target: SlotTarget) {
  return chartDataSlotBlueprint(chartType).find(
    (s) => s.kind === target.kind && s.index === target.index,
  );
}

/** 对标 DataEase：维度槽仅接受维度字段，指标槽仅接受指标字段；按图表类型附加约束 */
export function validateFieldAssignment(
  field: string,
  target: SlotTarget,
  chartType: ChartType | string,
): FieldAssignResult {
  const trimmed = field.trim();
  if (!trimmed) {
    return { ok: false, message: "字段名无效" };
  }

  const slot = slotMeta(chartType, target);
  if (!slot) {
    return { ok: false, message: "当前图表类型不支持该槽位" };
  }

  const fieldKind = classifyDatasetField(trimmed);

  if (target.kind === "dimension" && fieldKind === "metric") {
    return {
      ok: false,
      message: `「${trimmed}」是指标字段，不能放入「${slot.label}」。请从右侧「指标」分组拖入数值字段，或改放「值轴 / 指标」槽`,
    };
  }

  if (target.kind === "metric" && fieldKind === "dimension") {
    return {
      ok: false,
      message: `「${trimmed}」是维度字段，不能放入「${slot.label}」。请从右侧「维度」分组拖入，或改放维度槽`,
    };
  }

  if (chartType === "timeline" && target.kind === "dimension" && !DATE_FIELD.test(trimmed)) {
    return {
      ok: false,
      message: `时间轴须使用时间类维度（如 sale_date、order_time），「${trimmed}」不适合作为时间轴`,
    };
  }

  if (isGeoMapChartType(chartType) && target.kind === "dimension") {
    const geoLike =
      GEO_FIELD.test(trimmed) ||
      REGION_ID_FIELD.test(trimmed) ||
      /^(name|region_name|province_name|city_name)$/i.test(trimmed);
    if (!geoLike) {
      return {
        ok: false,
        message: `地图须使用地理名称或区域编码字段（如 region、province、region_id），「${trimmed}」无法参与地图着色`,
      };
    }
  }

  if (chartType === "heatmap" && target.kind === "dimension" && fieldKind === "metric") {
    return {
      ok: false,
      message: `热力图横纵轴须为维度字段，「${trimmed}」是指标字段`,
    };
  }

  return { ok: true };
}

/** 点击字段库时：按槽位顺序找第一个可接受该字段的空槽 */
export function resolveAutoAssignTarget(
  cfg: { dimensions?: { field: string }[]; metrics?: { field: string }[] },
  chartType: ChartType | string,
  field: string,
  preferred?: SlotTarget | null,
): { target: SlotTarget } | { error: string } {
  if (preferred) {
    const empty = !fieldAt(cfg, preferred);
    if (!empty) {
      return { error: `请先清空当前槽位再绑定「${field}」` };
    }
    const check = validateFieldAssignment(field, preferred, chartType);
    if (!check.ok) return { error: check.message };
    return { target: preferred };
  }

  for (const slot of chartDataSlotBlueprint(chartType)) {
    const target: SlotTarget = { kind: slot.kind, index: slot.index };
    if (fieldAt(cfg, target)) continue;
    const check = validateFieldAssignment(field, target, chartType);
    if (check.ok) return { target };
  }

  return {
    error: `没有可放置「${field}」的空槽。请清空不合适的槽位，或检查字段类型（维度/指标）是否与图表要求一致`,
  };
}

function fieldAt(
  cfg: { dimensions?: { field: string }[]; metrics?: { field: string }[] },
  target: SlotTarget,
): string | undefined {
  const list = target.kind === "dimension" ? cfg.dimensions : cfg.metrics;
  const raw = list?.[target.index]?.field;
  return raw?.trim() ? raw : undefined;
}
