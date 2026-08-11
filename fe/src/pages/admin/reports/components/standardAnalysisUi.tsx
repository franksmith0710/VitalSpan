import type { LucideIcon } from "lucide-react";
import { Activity, GitBranch, MapPin, TrendingUp } from "lucide-react";
import type { AnalysisPack, AnalysisTheme } from "../useStandardAnalysis";
import { THEME_LABELS } from "../standardRoutes";
import { cn } from "@/lib/utils";

export const STANDARD_WORKBENCH_GRID_CLASS =
  "grid min-h-[min(560px,calc(100dvh-13rem))] flex-1 lg:grid-cols-[minmax(220px,260px)_1fr]";

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

const META_ITEM_CLASS = "inline-flex min-w-0 items-center gap-1.5";

export function StandardAnalysisMetaRow({ pack }: { pack: AnalysisPack }) {
  const snapshotLabel = SNAPSHOT_LABELS[pack.snapshotCronPreset] ?? pack.snapshotCronPreset;

  return (
    <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-theme-xs">
      <div className={META_ITEM_CLASS}>
        <dt className="shrink-0 text-gray-400 dark:text-gray-500">业务对象</dt>
        <dd className="truncate font-medium text-gray-700 dark:text-gray-300">{pack.businessObjectCode}</dd>
      </div>
      <div className={META_ITEM_CLASS}>
        <dt className="shrink-0 text-gray-400 dark:text-gray-500">物理表</dt>
        <dd className="truncate font-mono text-gray-600 dark:text-gray-400">{pack.physicalTableFqn}</dd>
      </div>
      <div className={META_ITEM_CLASS}>
        <dt className="shrink-0 text-gray-400 dark:text-gray-500">快照</dt>
        <dd className="truncate text-gray-600 dark:text-gray-400">{snapshotLabel}</dd>
      </div>
    </dl>
  );
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
