import { CircleHelp } from "lucide-react";
import { ChartFieldSlot } from "./ChartFieldSlot";
import { useChartInspector } from "./chartInspectorContext";
import type { SlotTarget } from "./chartInspectorTypes";

const MAP_DRILL_DIM_INDEXES = [1, 2] as const;
const MAP_DRILL_SLOT_LABELS: Record<(typeof MAP_DRILL_DIM_INDEXES)[number], string> = {
  1: "钻取 / 市级",
  2: "钻取 / 区县",
};

function isActiveSlot(a: SlotTarget | null, b: SlotTarget): boolean {
  return a?.kind === b.kind && a?.index === b.index;
}

/** 对标 DE：钻取区可叠放市、区县字段 */
function ChartMapDrillSlots({
  columnsDisabled,
}: {
  columnsDisabled: boolean;
}) {
  const {
    cfg,
    onChange,
    activeSlot,
    setActiveSlot,
    assignField,
    clearFieldAssignError,
  } = useChartInspector();

  const clearSlot = (index: number) => {
    clearFieldAssignError();
    const dimensions = [...(cfg.dimensions ?? [])];
    while (dimensions.length <= index) dimensions.push({ field: "" });
    dimensions[index] = { field: "" };
    onChange({ ...cfg, dimensions });
  };

  const filled = MAP_DRILL_DIM_INDEXES.filter((i) => cfg.dimensions?.[i]?.field?.trim());
  const nextEmpty = MAP_DRILL_DIM_INDEXES.find((i) => !cfg.dimensions?.[i]?.field?.trim());
  const visibleIndexes = [...filled, ...(nextEmpty !== undefined ? [nextEmpty] : [])];

  const hintIcon = (
    <CircleHelp
      className="size-3 text-gray-400 dark:text-gray-500"
      aria-label="预览态双击地图下钻；依次拖入市级、区县字段"
    />
  );

  return (
    <div className="space-y-1">
      <span className="inline-flex items-center gap-1 text-theme-xs font-medium text-gray-500 dark:text-gray-400">
        钻取 / 维度
        {hintIcon}
      </span>
      <div className="space-y-1.5">
        {visibleIndexes.map((index) => {
          const target: SlotTarget = { kind: "dimension", index };
          const rawField = cfg.dimensions?.[index]?.field || undefined;
          return (
            <ChartFieldSlot
              key={`drill-${index}`}
              label={MAP_DRILL_SLOT_LABELS[index]}
              hideLabel
              optional
              fieldName={rawField}
              slotKind="dimension"
              active={isActiveSlot(activeSlot, target)}
              disabled={columnsDisabled}
              onClick={() => {
                clearFieldAssignError();
                setActiveSlot(target);
              }}
              onClear={rawField ? () => clearSlot(index) : undefined}
              onDropField={(field) => assignField(field, target)}
            />
          );
        })}
      </div>
    </div>
  );
}

/** 对标 DataEase 地图数据槽位：地区/维度 → 数据/指标 → 钻取/维度 */
export function ChartMapFieldSlots() {
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

  const renderSlot = (
    target: SlotTarget,
    label: string,
    opts: { required?: boolean; showAggregation?: boolean },
  ) => {
    const rawField = fieldAt(target);
    return (
      <ChartFieldSlot
        key={`${target.kind}-${target.index}`}
        label={label}
        required={opts.required}
        fieldName={rawField}
        fieldSuffix={rawField && opts.showAggregation ? "求和" : undefined}
        slotKind={target.kind === "metric" ? "metric" : "dimension"}
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
  };

  return (
    <div className="space-y-3">
      {fieldAssignError ? (
        <p className="rounded-md border border-error-200 bg-error-50 px-2 py-1.5 text-[10px] leading-snug text-error-700 dark:border-error-200/30 dark:bg-error-500/10 dark:text-error-400">
          {fieldAssignError}
        </p>
      ) : null}
      {columnsReady && columnsLoading ? (
        <p className="text-theme-xs text-gray-500 dark:text-gray-400">正在加载字段…</p>
      ) : null}
      {renderSlot({ kind: "dimension", index: 0 }, "地区 / 维度", { required: true })}
      {renderSlot({ kind: "metric", index: 0 }, "数据 / 指标", {
        required: true,
        showAggregation: true,
      })}
      <ChartMapDrillSlots columnsDisabled={columnsDisabled} />
    </div>
  );
}
