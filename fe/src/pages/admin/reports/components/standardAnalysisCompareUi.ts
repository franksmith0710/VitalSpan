import type { AnalysisPack, AnalysisTheme, CompareResult, SnapshotRecord } from "../useStandardAnalysis";
import { themeAggregationHintText } from "../standardAnalysisFieldLabels";
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
  const hint = themeAggregationHintText(theme, pack.fieldMapping);
  if (hint) return hint;
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

export function livePeriodKeyFromPreset(
  preset: AnalysisPack["snapshotCronPreset"],
  at = new Date(),
): string {
  if (preset === "monthly") {
    return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}`;
  }
  if (preset === "weekly") {
    const target = new Date(Date.UTC(at.getFullYear(), at.getMonth(), at.getDate()));
    const day = target.getUTCDay() || 7;
    target.setUTCDate(target.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
  }
  return at.toISOString().slice(0, 10);
}
