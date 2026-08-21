import { ChartFieldSlot } from "../ChartFieldSlot";
import type { CustomVizDataBinding } from "../layoutUtils";
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
  assignField: (fieldName: string, target: CustomVizFieldTarget) => void;
  fieldAssignError?: string | null;
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

function metricAggSuffix(fieldName: string): string {
  return /(?:^|_)(amount|amt|count|cnt|qty|quantity|price|total|sum|avg|rate|score|value|values)(?:$|_)/i.test(
    fieldName,
  )
    ? "求和"
    : "计数";
}

export function CustomVizDataSlots({
  binding,
  fieldSlots,
  columnsDisabled = false,
  activeFieldTarget,
  onActiveFieldTargetChange,
  assignField,
  fieldAssignError,
  onPatch,
}: CustomVizDataSlotsProps) {
  const slots = expandCustomVizFieldSlotsForUi(fieldSlots);

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
      {fieldAssignError ? (
        <p className="text-theme-xs text-error-600 dark:text-error-400">{fieldAssignError}</p>
      ) : null}
      {slots.map((slot) => {
        const target: CustomVizFieldTarget = { kind: slot.kind, index: slot.index };
        const fieldName = readFieldAt(binding, slot.kind, slot.index);
        const aggregationSuffix =
          fieldName && slot.kind === "metric" ? metricAggSuffix(fieldName) : undefined;
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
