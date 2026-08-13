import { ChartFieldSlot } from "../ChartFieldSlot";
import type { CustomVizDataBinding, CustomVizMetricRef } from "../layoutUtils";
import { classifyDatasetField } from "../datasetFieldClassification";
import { parseCustomVizFieldSlots, type CustomVizFieldSlotDef } from "./customVizFieldSlots";

type CustomVizDataSlotsProps = {
  binding: CustomVizDataBinding;
  fieldSlots?: Record<string, unknown>;
  columnsDisabled?: boolean;
  activeKind: "dimension" | "metric";
  onActiveKindChange: (kind: "dimension" | "metric") => void;
  onPatch: (patch: Partial<CustomVizDataBinding>) => void;
};

function readDimensionField(binding: CustomVizDataBinding, slot: CustomVizFieldSlotDef): string | undefined {
  const dims = binding.dimensions ?? [];
  return dims[0]?.field?.trim() || undefined;
}

function readMetricField(binding: CustomVizDataBinding): string | undefined {
  const metrics = binding.metrics ?? [];
  return metrics[0]?.field?.trim() || undefined;
}

export function CustomVizDataSlots({
  binding,
  fieldSlots,
  columnsDisabled = false,
  activeKind,
  onActiveKindChange,
  onPatch,
}: CustomVizDataSlotsProps) {
  const slots = parseCustomVizFieldSlots(fieldSlots);

  const assignField = (fieldName: string, kind: "dimension" | "metric") => {
    if (kind === "dimension") {
      onPatch({ dimensions: [{ field: fieldName }], status: "connected" });
      return;
    }
    onPatch({
      metrics: [{ field: fieldName, agg: "sum" } satisfies CustomVizMetricRef],
      status: "connected",
    });
  };

  const clearSlot = (kind: "dimension" | "metric") => {
    if (kind === "dimension") {
      onPatch({ dimensions: [] });
      return;
    }
    onPatch({ metrics: [] });
  };

  return (
    <div className="space-y-3" data-testid="custom-viz-data-slots">
      {slots.map((slot) => {
        const kind = slot.kind;
        const fieldName = kind === "dimension" ? readDimensionField(binding, slot) : readMetricField(binding);
        const aggregationSuffix =
          fieldName && kind === "metric"
            ? classifyDatasetField(fieldName) === "metric"
              ? "求和"
              : "计数"
            : undefined;
        return (
          <ChartFieldSlot
            key={slot.key}
            label={slot.label}
            required={slot.required}
            fieldName={fieldName}
            fieldSuffix={aggregationSuffix}
            slotKind={kind}
            active={activeKind === kind}
            disabled={columnsDisabled}
            onClick={() => onActiveKindChange(kind)}
            onClear={fieldName ? () => clearSlot(kind) : undefined}
            onDropField={(field) => assignField(field, kind)}
          />
        );
      })}
    </div>
  );
}
