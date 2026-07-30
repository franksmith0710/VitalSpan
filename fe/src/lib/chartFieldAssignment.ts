import { chartDataSlotBlueprint } from "@/components/dashboard/chartFieldSlots";
import { classifyDatasetField } from "@/components/dashboard/datasetFieldClassification";
import type { SlotTarget } from "@/components/dashboard/chartInspectorTypes";
import { fieldAtSlot, writeAxisField } from "@/lib/resolveChartEncoding";
import type { ChartViewConfig } from "@/lib/chartViewConfig";

export type FieldAssignResult = { ok: true } | { ok: false; message: string };

const DATE_FIELD =
  /(?:^|_)(date|time|day|month|year|week|timestamp|datetime)(?:$|_)|_at$/i;
const GEO_FIELD =
  /(?:^|_)(region|area|city|province|country|geo|name|district|地名|省份|城市)(?:$|_)|省|市|自治区|区$|县$/i;
const REGION_ID_FIELD = /(?:^|_)(region_id|adcode|area_code|geo_id)(?:$|_)|^id$|_id$/i;

function slotMeta(chartType: string, target: SlotTarget) {
  return chartDataSlotBlueprint(chartType).find(
    (s) => s.axisId === target.axisId && s.index === target.index,
  );
}

/** 对标 DataEase：按 DE 轴 fieldType 校验；both 轴维/指标均可 */
export function validateFieldAssignment(
  field: string,
  target: SlotTarget,
  chartType: string,
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

  if (slot.kind === "dimension" && fieldKind === "metric") {
    return {
      ok: false,
      message: `「${trimmed}」是指标字段，不能放入「${slot.label}」。请从右侧「指标」分组拖入数值字段，或改放指标槽`,
    };
  }

  if (slot.kind === "metric" && fieldKind === "dimension") {
    return {
      ok: false,
      message: `「${trimmed}」是维度字段，不能放入「${slot.label}」。请从右侧「维度」分组拖入，或改放维度槽`,
    };
  }

  if (chartType === "timeline" && target.axisId === "xAxis" && !DATE_FIELD.test(trimmed)) {
    return {
      ok: false,
      message: `时间轴须使用时间类维度（如 sale_date、order_time），「${trimmed}」不适合作为时间轴`,
    };
  }

  if (
    (chartType === "map" || chartType === "map-3d") &&
    target.axisId === "xAxis"
  ) {
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

  if (
    (chartType === "heatmap" || chartType === "t-heatmap") &&
    (target.axisId === "xAxis" || target.axisId === "xAxisExt") &&
    fieldKind === "metric"
  ) {
    return {
      ok: false,
      message: `热力图横纵轴须为维度字段，「${trimmed}」是指标字段`,
    };
  }

  return { ok: true };
}

/** 点击字段库时：按槽位顺序找第一个可接受该字段的空槽 */
export function resolveAutoAssignTarget(
  cfg: ChartViewConfig,
  chartType: string,
  field: string,
  preferred?: SlotTarget | null,
): { target: SlotTarget } | { error: string } {
  if (preferred) {
    const empty = !fieldAtSlot(cfg, preferred);
    if (!empty) {
      return { error: `请先清空当前槽位再绑定「${field}」` };
    }
    const check = validateFieldAssignment(field, preferred, chartType);
    if (!check.ok) return { error: check.message };
    return { target: preferred };
  }

  for (const slot of chartDataSlotBlueprint(chartType)) {
    const target: SlotTarget = { axisId: slot.axisId, index: slot.index };
    if (fieldAtSlot(cfg, target)) continue;
    const check = validateFieldAssignment(field, target, chartType);
    if (check.ok) return { target };
  }

  return {
    error: `没有可放置「${field}」的空槽。请清空不合适的槽位，或检查字段类型（维度/指标）是否与图表要求一致`,
  };
}

export { fieldAtSlot };
