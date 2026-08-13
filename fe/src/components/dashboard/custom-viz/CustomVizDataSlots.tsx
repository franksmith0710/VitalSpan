import { ChartFieldSlot } from "../ChartFieldSlot";
import type { CustomVizDataBinding, CustomVizMetricRef } from "../layoutUtils";
import { classifyDatasetField } from "../datasetFieldClassification";
import {
  customVizFieldTargetsEqual,
  expandCustomVizFieldSlotsForUi,
  type CustomVizFieldTarget,
} from "./customVizFieldSlots";

type CustomVizDataSlotsProps = {
  binding: CustomVizDataBinding;
  fieldSlots?: Record<string, unknown>;
  columnsDisabled?: boolean;
  activeFieldTarget: CustomVizFieldTarget;
  onActiveFieldTargetChange: (target: CustomVizFieldTarget) => void;
  onPatch: (patch: Partial<CustomVizDataBinding>) => void;
};

function readFieldAt(
  binding: CustomVizDataBinding,
  kind: CustomVizFieldTarget["kind"],
  index: number,
): string | undefined {
  const arr = kind === "dimension" ? binding.dimensions : binding.metrics;
  return arr?.[index]?.field?.trim() || undefined;
}

function ensureSlotArray<T>(arr: T[] | undefined, index: number, empty: T): T[] {
  const next = [...(arr ?? [])];
  while (next.length <= index) next.push(empty);
  return next;
}

export function CustomVizDataSlots({
  binding,
  fieldSlots,
  columnsDisabled = false,
  activeFieldTarget,
  onActiveFieldTargetChange,
  onPatch,
}: CustomVizDataSlotsProps) {
  const slots = expandCustomVizFieldSlotsForUi(fieldSlots);

  const assignField = (fieldName: string, target: CustomVizFieldTarget) => {
    if (target.kind === "dimension") {
      const next = ensureSlotArray(binding.dimensions, target.index, { field: "" });
      if (next.some((d, i) => i !== target.index && d.field === fieldName)) return;
      next[target.index] = { field: fieldName };
      onPatch({ dimensions: next, status: "connected" });
      return;
    }
    const next = ensureSlotArray(binding.metrics, target.index, { field: "", agg: "sum" as const });
    if (next.some((m, i) => i !== target.index && m.field === fieldName)) return;
    next[target.index] = { field: fieldName, agg: "sum" } satisfies CustomVizMetricRef;
    onPatch({ metrics: next, status: "connected" });
  };

  const clearSlot = (target: CustomVizFieldTarget) => {
    if (target.kind === "dimension") {
      const next = [...(binding.dimensions ?? [])];
      if (target.index >= next.length) return;
      next.splice(target.index, 1);
      onPatch({ dimensions: next });
      return;
    }
    const next = [...(binding.metrics ?? [])];
    if (target.index >= next.length) return;
    next.splice(target.index, 1);
    onPatch({ metrics: next });
  };

  return (
    <div className="space-y-3" data-testid="custom-viz-data-slots">
      {slots.map((slot) => {
        const target: CustomVizFieldTarget = { kind: slot.kind, index: slot.index };
        const fieldName = readFieldAt(binding, slot.kind, slot.index);
        const aggregationSuffix =
          fieldName && slot.kind === "metric"
            ? classifyDatasetField(fieldName) === "metric"
              ? "求和"
              : "计数"
            : undefined;
        return (
          <ChartFieldSlot
            key={slot.uiKey}
            label={slot.label}
            required={slot.required}
            fieldName={fieldName}
            fieldSuffix={aggregationSuffix}
            slotKind={slot.kind}
            active={customVizFieldTargetsEqual(activeFieldTarget, target)}
            disabled={columnsDisabled}
            onClick={() => onActiveFieldTargetChange(target)}
            onClear={fieldName ? () => clearSlot(target) : undefined}
            onDropField={(field) => assignField(field, target)}
          />
        );
      })}
    </div>
  );
}
