import type { LucideIcon } from "lucide-react";
import { Activity, Database, GitBranch, MapPin, Timer, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AnalysisPack, AnalysisTheme } from "../useStandardAnalysis";
import { THEME_LABELS } from "../standardRoutes";
import { cn } from "@/lib/utils";

/** 分栏仅 xl+：侧栏占用后 lg 内容区过窄，栅格 min-width:auto 会叠到详情上。 */
export const STANDARD_WORKBENCH_GRID_CLASS =
  "grid min-h-0 min-w-0 flex-1 overflow-hidden xl:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]";

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

export const SNAPSHOT_RETENTION_OPTIONS = [
  { value: 6, label: "保留最近 6 期" },
  { value: 12, label: "保留最近 12 期（推荐）" },
  { value: 24, label: "保留最近 24 期" },
  { value: 36, label: "保留最近 36 期" },
] as const;

export function createEmptyAnalysisPack(): AnalysisPack {
  return {
    packKey: "",
    displayName: "",
    datasetId: "",
    boundConfigId: "",
    dataSourceId: "",
    fieldMapping: { status: "", region: "", createdAt: "" },
    enabledThemes: ["lifecycle", "distribution"],
    allowedRoles: ["analyst", "admin"],
    snapshotCronPreset: "daily",
    snapshotRetentionPeriods: 12,
  };
}

export function StandardAnalysisMetaRow({ pack, className }: { pack: AnalysisPack; className?: string }) {
  const snapshotLabel = SNAPSHOT_LABELS[pack.snapshotCronPreset] ?? pack.snapshotCronPreset;
  const bindingLabel = pack.datasetId || pack.physicalTableFqn || "未绑定";

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {pack.businessObjectCode ? (
        <Badge variant="light" color="primary" size="sm">
          {pack.businessObjectCode}
        </Badge>
      ) : null}
      <Badge variant="light" color="light" size="sm" className="max-w-[min(100%,14rem)] truncate font-mono">
        <Database className="size-3 shrink-0" aria-hidden />
        {bindingLabel}
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

export function buildLiveSummaryMetrics(
  headers: string[],
  rows: unknown[][],
  theme?: AnalysisTheme,
) {
  const metrics: Array<{ label: string; value: string }> = [
    { label: "结果行数", value: String(rows.length) },
  ];
  const numericIdx = headers.findIndex((header) =>
    /^(数量|cnt|count|total|sum|qty|amount|value)$/i.test(header),
  );
  if (numericIdx >= 0) {
    const sum = rows.reduce((acc, row) => {
      const value = Number(row[numericIdx]);
      return Number.isFinite(value) ? acc + value : acc;
    }, 0);
    const label = /^(cnt|count)$/i.test(headers[numericIdx]) ? "数量合计" : `${headers[numericIdx]}合计`;
    metrics.push({ label, value: String(sum) });
  }

  if (theme === "distribution" && rows.length > 0) {
    const dimIdx = headers.findIndex((header) => /^(dim|维度|region|province|city)$/i.test(header));
    const cntIdx =
      numericIdx >= 0
        ? numericIdx
        : headers.findIndex((header) => /^(cnt|count|数量)$/i.test(header));
    if (dimIdx >= 0 && cntIdx >= 0) {
      let topDim = "";
      let topVal = Number.NEGATIVE_INFINITY;
      for (const row of rows) {
        const val = Number(row[cntIdx]);
        if (!Number.isFinite(val) || val <= topVal) continue;
        topVal = val;
        topDim = String(row[dimIdx] ?? "");
      }
      if (topDim) {
        metrics.push({ label: "最高区域", value: `${topDim}（${topVal}）` });
      }
    }
  }

  return metrics;
}
