import { ChartFieldSlot } from "./ChartFieldSlot";
import { chartDataSlotBlueprint } from "./chartFieldSlots";
import { useChartInspector } from "./ChartInspectorContext";
import type { SlotTarget } from "./ChartInspectorContext";

function isActiveSlot(a: SlotTarget | null, b: SlotTarget): boolean {
  return a?.kind === b.kind && a?.index === b.index;
}

export function ChartDataSlots() {
  const {
    cfg,
    onChange,
    columns,
    columnsLoading,
    columnsReady,
    activeSlot,
    setActiveSlot,
    assignField,
  } = useChartInspector();

  const columnsDisabled = columns.length === 0;
  const slots = chartDataSlotBlueprint(cfg.chartType);

  const clearSlot = (target: SlotTarget) => {
    if (target.kind === "dimension") {
      const dimensions = [...(cfg.dimensions ?? [])];
      while (dimensions.length <= target.index) dimensions.push({ field: "" });
      dimensions[target.index] = { field: "" };
      onChange({ ...cfg, dimensions });
      return;
    }
    const metrics = [...(cfg.metrics ?? [])];
    while (metrics.length <= target.index) metrics.push({ field: "" });
    metrics[target.index] = { field: "" };
    onChange({ ...cfg, metrics });
  };

  const fieldAt = (target: SlotTarget): string | undefined => {
    if (target.kind === "dimension") {
      return cfg.dimensions?.[target.index]?.field || undefined;
    }
    return cfg.metrics?.[target.index]?.field || undefined;
  };

  return (
    <div className="space-y-3">
      {columnsReady && columnsLoading ? (
        <p className="text-theme-xs text-gray-500 dark:text-gray-400">正在加载字段…</p>
      ) : null}
      {slots.map((slot) => {
        const target: SlotTarget = { kind: slot.kind, index: slot.index };
        const rawField = fieldAt(target);
        const displayField =
          rawField && slot.showAggregation ? `${rawField} (求和)` : rawField;
        return (
          <ChartFieldSlot
            key={`${slot.kind}-${slot.index}-${slot.label}`}
            label={slot.label}
            fieldName={displayField}
            active={isActiveSlot(activeSlot, target)}
            disabled={columnsDisabled}
            onClick={() => setActiveSlot(target)}
            onClear={rawField ? () => clearSlot(target) : undefined}
            onDropField={(field) => assignField(field, target)}
          />
        );
      })}
    </div>
  );
}
