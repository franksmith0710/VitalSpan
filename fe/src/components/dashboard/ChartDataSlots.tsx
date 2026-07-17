import { ChartFieldSlot } from "./ChartFieldSlot";
import { chartDataSlotBlueprint } from "./chartFieldSlots";
import { useChartInspector } from "./chartInspectorContext";
import type { SlotTarget } from "./chartInspectorTypes";
import { mapChartFieldHint } from "@/lib/mapChartDataHint";

function isActiveSlot(a: SlotTarget | null, b: SlotTarget): boolean {
  return a?.kind === b.kind && a?.index === b.index;
}

export function ChartDataSlots({ hideMapHint = false }: { hideMapHint?: boolean }) {
  const {
    cfg,
    onChange,
    columns,
    columnsLoading,
    columnsReady,
    activeSlot,
    setActiveSlot,
    assignField,
    fieldAssignError,
    clearFieldAssignError,
  } = useChartInspector();

  const columnsDisabled = columns.length === 0;
  const slots = chartDataSlotBlueprint(cfg.chartType);
  const mapHint = cfg.chartType === "map" ? mapChartFieldHint(columns) : null;

  const clearSlot = (target: SlotTarget) => {
    clearFieldAssignError();
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
      {fieldAssignError ? (
        <p className="rounded-md border border-error-200 bg-error-50 px-2 py-1.5 text-[10px] leading-snug text-error-700 dark:border-error-200/30 dark:bg-error-500/10 dark:text-error-400">
          {fieldAssignError}
        </p>
      ) : null}
      {mapHint && !hideMapHint ? (
        <div className="space-y-1.5 rounded-md border border-brand-500/20 bg-brand-500/5 px-2 py-1.5 text-[10px] leading-snug text-gray-600 dark:text-gray-400">
          <p>{mapHint.message}</p>
          {mapHint.sampleSql ? (
            <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-black/5 p-1.5 font-mono text-[9px] text-gray-700 dark:bg-white/5 dark:text-gray-300">
              {mapHint.sampleSql}
            </pre>
          ) : null}
        </div>
      ) : null}
      {columnsReady && columnsLoading ? (
        <p className="text-theme-xs text-gray-500 dark:text-gray-400">正在加载字段…</p>
      ) : null}
      {slots.map((slot) => {
        const target: SlotTarget = { kind: slot.kind, index: slot.index };
        const rawField = fieldAt(target);
        return (
          <ChartFieldSlot
            key={`${slot.kind}-${slot.index}-${slot.label}`}
            label={slot.label}
            required={slot.required !== false}
            optional={slot.required === false}
            fieldName={rawField}
            fieldSuffix={rawField && slot.showAggregation ? "求和" : undefined}
            slotKind={slot.kind === "metric" ? "metric" : "dimension"}
            active={isActiveSlot(activeSlot, target)}
            disabled={columnsDisabled}
            onClick={() => {
              clearFieldAssignError();
              setActiveSlot(target);
            }}
            onClear={rawField ? () => clearSlot(target) : undefined}
            onDropField={(field) => assignField(field, target)}
          />
        );
      })}
    </div>
  );
}
