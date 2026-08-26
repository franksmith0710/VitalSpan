export type SummaryMetricItem = {
  label: string;
  value: string;
  hint?: string;
};

type Props = {
  metrics: SummaryMetricItem[];
};

export function StandardAnalysisSummaryMetrics({ metrics }: Props) {
  if (metrics.length === 0) return null;

  return (
    <div
      className="grid shrink-0 gap-4 px-5 py-3 sm:grid-cols-[repeat(auto-fit,minmax(0,1fr))]"
      style={{ gridTemplateColumns: `repeat(${metrics.length}, minmax(0, 1fr))` }}
      data-testid="standard-analysis-live-summary"
    >
      {metrics.map((metric) => (
        <div key={metric.label} className="min-w-0">
          <p className="text-theme-xs text-gray-500 dark:text-gray-400">{metric.label}</p>
          <p className="mt-0.5 text-title-sm font-semibold tabular-nums text-gray-900 dark:text-white">
            {metric.value}
          </p>
          {metric.hint ? (
            <p className="mt-0.5 text-[11px] leading-snug text-gray-400 dark:text-gray-500">{metric.hint}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
