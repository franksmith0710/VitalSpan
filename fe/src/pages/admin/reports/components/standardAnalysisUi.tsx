import type { LucideIcon } from "lucide-react";
import { Activity, Database, GitBranch, MapPin, Timer, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AnalysisPack, AnalysisTheme } from "../useStandardAnalysis";
import { THEME_LABELS } from "../standardRoutes";
import { cn } from "@/lib/utils";

export const STANDARD_WORKBENCH_GRID_CLASS =
  "grid min-h-0 flex-1 lg:grid-cols-[minmax(240px,280px)_minmax(0,1fr)]";

export const THEME_META: Record<AnalysisTheme, { label: string; icon: LucideIcon }> = {
  lifecycle: { label: THEME_LABELS.lifecycle, icon: GitBranch },
  distribution: { label: THEME_LABELS.distribution, icon: MapPin },
  activity: { label: THEME_LABELS.activity, icon: Activity },
  trend: { label: THEME_LABELS.trend, icon: TrendingUp },
};

export const SNAPSHOT_LABELS: Record<string, string> = {
  daily: "每日快照",
  weekly: "每周快照",
  monthly: "每月快照",
};

export const ALL_ANALYSIS_THEMES: AnalysisTheme[] = ["lifecycle", "distribution", "activity", "trend"];

export function createEmptyAnalysisPack(): AnalysisPack {
  return {
    packKey: "",
    displayName: "",
    businessObjectCode: "",
    physicalTableFqn: "",
    dataSourceId: "",
    fieldMapping: { status: "status", region: "region", createdAt: "created_at" },
    enabledThemes: ["lifecycle", "distribution"],
    allowedRoles: ["analyst", "admin"],
    snapshotCronPreset: "daily",
  };
}

export function StandardAnalysisMetaRow({ pack, className }: { pack: AnalysisPack; className?: string }) {
  const snapshotLabel = SNAPSHOT_LABELS[pack.snapshotCronPreset] ?? pack.snapshotCronPreset;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Badge variant="light" color="primary" size="sm">
        {pack.businessObjectCode}
      </Badge>
      <Badge variant="light" color="light" size="sm" className="max-w-[min(100%,14rem)] truncate font-mono">
        <Database className="size-3 shrink-0" aria-hidden />
        {pack.physicalTableFqn}
      </Badge>
      <Badge variant="light" color="info" size="sm">
        <Timer className="size-3 shrink-0" aria-hidden />
        {snapshotLabel}
      </Badge>
    </div>
  );
}

export function formatCompareDelta(delta: number | null): string {
  if (delta == null) return "—";
  if (delta > 0) return `+${delta}`;
  return String(delta);
}

export function compareDeltaClassName(delta: number | null): string {
  if (delta == null) return "text-gray-500 dark:text-gray-400";
  if (delta > 0) return "text-success-600 dark:text-success-400";
  if (delta < 0) return "text-error-600 dark:text-error-400";
  return "text-gray-600 dark:text-gray-300";
}

type ColumnLike = { name?: string; key?: string } | string;

export function columnName(col: ColumnLike): string {
  if (typeof col === "string") return col;
  return col.name ?? col.key ?? "";
}

export function normalizeColumns(columns: ColumnLike[]): string[] {
  return columns.map(columnName).filter(Boolean);
}

export function normalizeRows(rows: unknown[], headers: string[]): unknown[][] {
  return rows.map((row) => {
    if (Array.isArray(row)) return row;
    if (typeof row === "object" && row !== null) {
      return headers.map((h) => (row as Record<string, unknown>)[h] ?? "");
    }
    return [];
  });
}

export function buildLiveSummaryMetrics(headers: string[], rows: unknown[][]) {
  const metrics: Array<{ label: string; value: string }> = [
    { label: "结果行数", value: String(rows.length) },
  ];
  const numericIdx = headers.findIndex((header) => /^(cnt|count|total|sum|qty|amount)$/i.test(header));
  if (numericIdx >= 0) {
    const sum = rows.reduce((acc, row) => {
      const value = Number(row[numericIdx]);
      return Number.isFinite(value) ? acc + value : acc;
    }, 0);
    metrics.push({ label: headers[numericIdx], value: String(sum) });
  }
  return metrics;
}
