import type { ChartFieldRef } from "@/lib/chartViewConfig";

type KpiCardProps = {
  title: string;
  metrics: ChartFieldRef[];
  columns: string[];
  rows: unknown[][];
};

function formatValue(raw: unknown): string {
  if (raw === null || raw === undefined || raw === "") return "—";
  const n = Number(raw);
  if (!Number.isNaN(n) && String(raw).trim() !== "") return n.toLocaleString("zh-CN");
  return String(raw);
}

export function KpiCard({ title, metrics, columns, rows }: KpiCardProps) {
  const row = rows[0] ?? [];
  return (
    <div role="group" aria-label={`${title}指标`} className="grid gap-4 sm:grid-cols-2">
      {metrics.map((m) => {
        const idx = columns.indexOf(m.field);
        const value = idx >= 0 ? row[idx] : undefined;
        return (
          <div key={m.field} className="min-h-[72px] rounded-lg border border-gray-100 p-3 dark:border-gray-800">
            <p className="line-clamp-2 text-theme-xs text-gray-500">{m.label ?? m.field}</p>
            <p className="text-title-sm font-semibold tabular-nums text-gray-800 dark:text-white/90">
              {formatValue(value)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
