import type { ChartFieldRef, ChartViewConfig } from "@/lib/chartViewConfig";
import { classifyDatasetField } from "@/components/dashboard/datasetFieldClassification";
import {
  getDeAxisBlueprint,
  getDeAxisLegacyMap,
  type ChartAxesConfig,
  type DeAxisId,
  type DeAxisSlot,
  type ResolvedChartEncoding,
} from "@/lib/chartDeAxis";

function trimField(ref: ChartFieldRef | undefined): string {
  return ref?.field?.trim() ?? "";
}

function axisField(axes: ChartAxesConfig, axisId: DeAxisId, index: number): string {
  return trimField(axes[axisId]?.[index]);
}

function setAxisField(
  axes: ChartAxesConfig,
  axisId: DeAxisId,
  index: number,
  field: string,
): ChartAxesConfig {
  const next = { ...axes };
  const list = [...(next[axisId] ?? [])];
  while (list.length <= index) list.push({ field: "" });
  list[index] = { field };
  next[axisId] = list;
  return next;
}

/** 旧 dimensions/metrics → DE 命名轴 */
export function migrateChartConfigToDeAxes(config: ChartViewConfig): ChartViewConfig {
  if (config.axes && Object.keys(config.axes).length > 0) {
    return syncLegacyFieldsFromAxes(config);
  }
  const chartType = config.chartType;

  if (chartType === "table-info" || chartType === "table") {
    const fields = [
      ...(config.dimensions?.map((d) => d.field?.trim()).filter(Boolean) ?? []),
      ...(config.metrics?.map((m) => m.field?.trim()).filter(Boolean) ?? []),
    ];
    const axes: ChartAxesConfig = {
      xAxis: fields.map((field) => ({ field: field! })),
    };
    return syncLegacyFieldsFromAxes({ ...config, axes });
  }

  const legacyMap = getDeAxisLegacyMap(chartType);
  const axes: ChartAxesConfig = {};

  for (const map of legacyMap) {
    if (!map.legacy) continue;
    const src =
      map.legacy.kind === "dimension"
        ? config.dimensions?.[map.legacy.index]?.field
        : config.metrics?.[map.legacy.index]?.field;
    if (!src?.trim()) continue;
    axes[map.axisId] = [...(axes[map.axisId] ?? [])];
    while (axes[map.axisId]!.length <= map.index) axes[map.axisId]!.push({ field: "" });
    axes[map.axisId]![map.index] = { field: src.trim() };
  }

  return syncLegacyFieldsFromAxes({ ...config, axes });
}

function syncTableBothAxesToLegacy(
  axes: ChartAxesConfig,
): { dimensions: ChartFieldRef[]; metrics: ChartFieldRef[] } {
  const xFields = (axes.xAxis ?? [])
    .map((ref) => ref.field?.trim())
    .filter((field): field is string => Boolean(field));
  // 明细表列顺序与 xAxis 槽位一致；维/指标分类供 backend field_rule 计数
  const dimensions: ChartFieldRef[] = [];
  const metrics: ChartFieldRef[] = [];
  for (const field of xFields) {
    const kind = classifyDatasetField(field);
    if (kind === "metric") {
      metrics.push({ field });
    } else {
      dimensions.push({ field });
    }
  }
  return { dimensions, metrics };
}

/** axes 权威 → 投影 dimensions/metrics（buildPlan 兼容） */
export function syncLegacyFieldsFromAxes(config: ChartViewConfig): ChartViewConfig {
  const chartType = config.chartType;
  const axes = config.axes ?? {};

  if (chartType === "table-info" || chartType === "table") {
    const { dimensions, metrics } = syncTableBothAxesToLegacy(axes);
    return { ...config, axes, dimensions, metrics };
  }

  const legacyMap = getDeAxisLegacyMap(chartType);
  const dimensions = [...(config.dimensions ?? [])];
  const metrics = [...(config.metrics ?? [])];

  for (const map of legacyMap) {
    if (!map.legacy) continue;
    const field = axisField(axes, map.axisId, map.index);
    const target = map.legacy.kind === "dimension" ? dimensions : metrics;
    while (target.length <= map.legacy.index) target.push({ field: "" });
    target[map.legacy.index] = { field };
  }

  return { ...config, axes, dimensions, metrics };
}

export function resolveChartEncoding(config: ChartViewConfig): ResolvedChartEncoding {
  const migrated = migrateChartConfigToDeAxes(config);
  const axes = migrated.axes ?? {};
  return {
    axes,
    dimensions: migrated.dimensions?.filter((d) => d.field?.trim()) ?? [],
    metrics: migrated.metrics?.filter((m) => m.field?.trim()) ?? [],
  };
}

export function axisFields(
  encoding: ResolvedChartEncoding,
  axisId: DeAxisId,
): ChartFieldRef[] {
  return (encoding.axes[axisId] ?? []).filter((r) => r.field?.trim());
}

export function firstAxisField(
  encoding: ResolvedChartEncoding,
  axisId: DeAxisId,
  index = 0,
): string {
  return encoding.axes[axisId]?.[index]?.field?.trim() ?? "";
}

export function writeAxisField(
  config: ChartViewConfig,
  slot: Pick<DeAxisSlot, "axisId" | "index">,
  field: string,
): ChartViewConfig {
  const axes = setAxisField(config.axes ?? {}, slot.axisId, slot.index, field);
  return syncLegacyFieldsFromAxes({ ...config, axes });
}

export function fieldAtSlot(
  config: ChartViewConfig,
  slot: Pick<DeAxisSlot, "axisId" | "index">,
): string | undefined {
  const migrated = migrateChartConfigToDeAxes(config);
  const raw = migrated.axes?.[slot.axisId]?.[slot.index]?.field;
  return raw?.trim() ? raw : undefined;
}

export function clearAxisField(
  config: ChartViewConfig,
  slot: Pick<DeAxisSlot, "axisId" | "index">,
): ChartViewConfig {
  return writeAxisField(config, slot, "");
}

export function deAxisRenderReady(config: ChartViewConfig): boolean {
  const chartType = config.chartType;
  const encoding = resolveChartEncoding(config);
  const slots = getDeAxisBlueprint(chartType);

  for (const slot of slots) {
    if (!slot.required) continue;
    const field = axisField(encoding.axes, slot.axisId, slot.index);
    if (!field) return false;
  }

  // multi-scatter / bar-range: DE 特殊 OR 轴
  if (chartType === "multi-scatter") {
    const hasX = Boolean(firstAxisField(encoding, "xAxis", 0));
    if (!hasX) return false;
  }

  return true;
}

export function classifyFieldForAxis(
  field: string,
  slot: DeAxisSlot,
): "dimension" | "metric" {
  if (slot.fieldType === "dimension") return "dimension";
  if (slot.fieldType === "metric") return "metric";
  return classifyDatasetField(field);
}

export function ensureDeAxisCapacity(config: ChartViewConfig): ChartViewConfig {
  const slots = getDeAxisBlueprint(config.chartType);
  let axes = { ...(config.axes ?? {}) };
  for (const slot of slots) {
    const list = [...(axes[slot.axisId] ?? [])];
    while (list.length <= slot.index) list.push({ field: "" });
    axes[slot.axisId] = list;
  }
  return syncLegacyFieldsFromAxes({ ...config, axes });
}
