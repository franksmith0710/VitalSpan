export type CustomVizFieldSlotDef = {
  key: string;
  kind: "dimension" | "metric";
  label: string;
  required: boolean;
  min: number;
  max: number;
};

type SlotRule = {
  min?: number;
  max?: number;
  label?: string;
};

function parseSlot(key: string, rule: SlotRule | undefined): CustomVizFieldSlotDef | null {
  if (!rule) return null;
  const kind = key.toLowerCase().includes("metric") ? "metric" : "dimension";
  const min = typeof rule.min === "number" ? rule.min : kind === "metric" ? 1 : 1;
  const max = typeof rule.max === "number" ? rule.max : 1;
  return {
    key,
    kind,
    label: rule.label ?? (kind === "metric" ? "指标" : "维度"),
    required: min > 0,
    min,
    max,
  };
}

export function parseCustomVizFieldSlots(
  fieldSlots: Record<string, unknown> | undefined,
): CustomVizFieldSlotDef[] {
  if (!fieldSlots) return [];
  const slots: CustomVizFieldSlotDef[] = [];
  for (const [key, value] of Object.entries(fieldSlots)) {
    if (!value || typeof value !== "object") continue;
    const slot = parseSlot(key, value as SlotRule);
    if (slot) slots.push(slot);
  }
  if (slots.length === 0) {
    return [
      { key: "dimensions", kind: "dimension", label: "维度", required: true, min: 1, max: 1 },
      { key: "metrics", kind: "metric", label: "指标", required: true, min: 1, max: 1 },
    ];
  }
  return slots;
}
