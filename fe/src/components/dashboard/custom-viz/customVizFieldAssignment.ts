import { classifyDatasetField } from "../datasetFieldClassification";
import { expandCustomVizFieldSlotsForUi, type CustomVizFieldTarget } from "./customVizFieldSlots";

const DATE_FIELD =
  /(?:^|_)(date|time|day|month|year|week|timestamp|datetime)(?:$|_)|_at$/i;
const GEO_FIELD =
  /(?:^|_)(region|area|city|province|country|geo|name|district|地名|省份|城市)(?:$|_)|省|市|自治区|区$|县$/i;

export type CustomVizFieldAssignResult = { ok: true } | { ok: false; message: string };

export function resolveCustomVizUiSlot(
  fieldSlots: Record<string, unknown> | undefined,
  target: CustomVizFieldTarget,
) {
  const slots = expandCustomVizFieldSlotsForUi(fieldSlots);
  return slots.find((s) => s.kind === target.kind && s.index === target.index);
}

export function resolveCustomVizSlotLabel(
  fieldSlots: Record<string, unknown> | undefined,
  target: CustomVizFieldTarget,
): string | undefined {
  return resolveCustomVizUiSlot(fieldSlots, target)?.label;
}

/** 对标内置 chart：维度槽禁指标、指标槽禁维度；manifest expect 与标签启发式约束语义 */
export function validateCustomVizFieldAssignment(
  field: string,
  target: CustomVizFieldTarget,
  slotLabel?: string,
  slotExpect?: "date" | "geo",
): CustomVizFieldAssignResult {
  const trimmed = field.trim();
  if (!trimmed) {
    return { ok: false, message: "字段名无效" };
  }

  const fieldKind = classifyDatasetField(trimmed);

  if (target.kind === "dimension" && fieldKind === "metric") {
    return {
      ok: false,
      message: `「${trimmed}」是指标字段，不能放入「${slotLabel ?? "维度"}」。请从右侧「指标」分组拖入，或改放指标槽`,
    };
  }

  if (target.kind === "metric" && fieldKind === "dimension") {
    return {
      ok: false,
      message: `「${trimmed}」是维度字段，不能放入「${slotLabel ?? "指标"}」。请从右侧「维度」分组拖入，或改放维度槽`,
    };
  }

  const expectDate =
    slotExpect === "date" ||
    (target.kind === "dimension" && slotLabel && /时间|日期/.test(slotLabel));
  if (expectDate && !DATE_FIELD.test(trimmed)) {
    return {
      ok: false,
      message: `时间维度须使用时间类字段（如 sale_date），「${trimmed}」不适合作为横轴`,
    };
  }

  const expectGeo =
    slotExpect === "geo" ||
    (target.kind === "dimension" && slotLabel && /地区|地理|省份|区域/.test(slotLabel));
  if (expectGeo && !GEO_FIELD.test(trimmed)) {
    return {
      ok: false,
      message: `地理维度须使用地区类字段（如 province、region），「${trimmed}」无法参与地图/区域轴`,
    };
  }

  return { ok: true };
}
