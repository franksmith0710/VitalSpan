import type { ChartFieldRef } from "@/lib/chartViewConfig";

import type { NumberFormatConfig } from "@/components/dashboard/dashboardStyleConfig";
import { formatMetricValue } from "@/components/dashboard/dashboardStyleConfig";

type KpiCardProps = {
  title: string;
  metrics: ChartFieldRef[];
  columns: string[];
  rows: unknown[][];
  numberFormat?: NumberFormatConfig;
};

export function KpiCard({ title, metrics, columns, rows, numberFormat }: KpiCardProps) {
  const row = rows[0] ?? [];
  return (
    <div
      role="group"
      aria-label={`${title}指标`}
      className="flex h-full min-h-0 flex-col justify-center overflow-auto p-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {metrics.map((m) => {
          const idx = columns.indexOf(m.field);
          const value = idx >= 0 ? row[idx] : undefined;
          return (
            <div key={m.field} className="min-h-[72px] rounded-lg border border-gray-100 p-3 dark:border-gray-800">
              <p className="line-clamp-2 text-theme-xs text-gray-500">{m.label ?? m.field}</p>
              <p className="text-title-sm font-semibold tabular-nums text-gray-800 dark:text-white/90">
                {formatMetricValue(value, numberFormat)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
