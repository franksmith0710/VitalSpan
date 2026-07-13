import { useMemo } from "react";
import { fetchChartTypeCatalog } from "@/lib/chartRegistry";
import { useEffect, useState } from "react";
import type { ChartTypeCatalogItem } from "@/lib/chartRegistry";
import { ChartFieldSlot } from "./ChartFieldSlot";
import { chartFieldSlotHints } from "./chartFieldSlots";
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
    columnsReady,
    columnsLoading,
    activeSlot,
    setActiveSlot,
    assignField,
  } = useChartInspector();

  const [spec, setSpec] = useState<ChartTypeCatalogItem | null>(null);
  useEffect(() => {
    fetchChartTypeCatalog()
      .then((items) => setSpec(items.find((c) => c.type === cfg.chartType) ?? null))
      .catch(() => setSpec(null));
  }, [cfg.chartType]);

  const rule = spec?.fieldRule;
  const columnsDisabled = columns.length === 0;
  const hints = chartFieldSlotHints(cfg.chartType);

  const dimCount = useMemo(() => {
    if (columnsDisabled) return cfg.dimensions?.length ?? 0;
    return Math.max(rule?.minDimensions ?? 1, cfg.dimensions?.length ?? 0);
  }, [columnsDisabled, cfg.dimensions?.length, rule?.minDimensions]);

  const metCount = useMemo(() => {
    if (columnsDisabled) return cfg.metrics?.length ?? 0;
    return Math.max(rule?.minMetrics ?? 1, cfg.metrics?.length ?? 0);
  }, [columnsDisabled, cfg.metrics?.length, rule?.minMetrics]);

  const clearDim = (index: number) => {
    const dimensions = [...(cfg.dimensions ?? [])];
    if (dimensions[index]) dimensions[index] = { field: "" };
    onChange({ ...cfg, dimensions });
  };

  const clearMet = (index: number) => {
    const metrics = [...(cfg.metrics ?? [])];
    if (metrics[index]) metrics[index] = { field: "" };
    onChange({ ...cfg, metrics });
  };

  if (columnsReady && columnsLoading) {
    return <p className="text-theme-xs text-gray-500 dark:text-gray-400">正在加载字段…</p>;
  }

  if (columnsReady && !columnsLoading && columns.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50/80 px-3 py-2 text-theme-xs text-gray-500 dark:border-gray-800 dark:bg-white/[0.02] dark:text-gray-400">
        在「高级」绑定 Dataset 后，从右侧字段库拖入维度与指标。
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {Array.from({ length: dimCount }, (_, index) => {
        const target: SlotTarget = { kind: "dimension", index };
        const fieldName = cfg.dimensions?.[index]?.field;
        return (
          <ChartFieldSlot
            key={`dim-${index}`}
            label={index === 0 ? hints.dimensionLabel : `${hints.dimensionLabel} ${index + 1}`}
            fieldName={fieldName || undefined}
            active={isActiveSlot(activeSlot, target)}
            disabled={columnsDisabled}
            onClick={() => setActiveSlot(target)}
            onClear={fieldName ? () => clearDim(index) : undefined}
            onDropField={(field) => assignField(field, target)}
          />
        );
      })}

      {Array.from({ length: metCount }, (_, index) => {
        const target: SlotTarget = { kind: "metric", index };
        const fieldName = cfg.metrics?.[index]?.field;
        const metricLabel =
          index === 0 ? hints.metricLabel : `${hints.metricLabel} ${index + 1}`;
        const display = fieldName ? `${fieldName} (求和)` : undefined;
        return (
          <ChartFieldSlot
            key={`met-${index}`}
            label={metricLabel}
            fieldName={display}
            active={isActiveSlot(activeSlot, target)}
            disabled={columnsDisabled}
            onClick={() => setActiveSlot(target)}
            onClear={fieldName ? () => clearMet(index) : undefined}
            onDropField={(field) => assignField(field, target)}
          />
        );
      })}

      {rule?.note ? (
        <p className="text-theme-xs text-gray-500 dark:text-gray-400">{rule.note}</p>
      ) : null}
    </div>
  );
}
