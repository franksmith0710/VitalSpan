import type { AnalysisPack, AnalysisTheme, CompareResult, SnapshotRecord } from "../useStandardAnalysis";
import { SNAPSHOT_LABELS, THEME_META } from "./standardAnalysisUi";

export const SNAPSHOT_SCHEDULE_HINT: Record<AnalysisPack["snapshotCronPreset"], string> = {
  daily: "每日 01:00 自动保存",
  weekly: "每周一 02:00 自动保存",
  monthly: "每月 1 日 03:00 自动保存",
};

export function hasPreviousSnapshot(compare: CompareResult | undefined): boolean {
  return compare?.previous != null;
}

export function themeAggregationHint(pack: AnalysisPack, theme: AnalysisTheme): string {
  const { fieldMapping } = pack;
  if (theme === "lifecycle" && fieldMapping.status) {
    return `按「${fieldMapping.status}」计数`;
  }
  if (theme === "distribution" && fieldMapping.region) {
    return `按「${fieldMapping.region}」计数`;
  }
  if ((theme === "activity" || theme === "trend") && fieldMapping.createdAt) {
    return `按「${fieldMapping.createdAt}」按日计数`;
  }
  return THEME_META[theme]?.label ?? theme;
}

export function latestSnapshotForTheme(
  snapshots: SnapshotRecord[] | undefined,
  theme: AnalysisTheme,
): SnapshotRecord | undefined {
  return snapshots
    ?.filter((item) => item.theme === theme)
    .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))[0];
}

export function formatCompareDeltaPct(deltaPct: number | null): string | null {
  if (deltaPct == null || !Number.isFinite(deltaPct)) return null;
  const rounded = Math.round(deltaPct * 10) / 10;
  const prefix = rounded > 0 ? "+" : "";
  return `${prefix}${rounded}%`;
}

export function snapshotPresetLabel(preset: AnalysisPack["snapshotCronPreset"]): string {
  return SNAPSHOT_LABELS[preset] ?? preset;
}
