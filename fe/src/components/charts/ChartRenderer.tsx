import Chart from "react-apexcharts";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import { createBarChartOptions, createLineChartOptions } from "@/lib/chart-theme";
import { ChartPanel } from "./ChartPanel";
import { useChartExecute } from "./useChartExecute";

type ChartRendererProps = {
  config: ChartViewConfig;
  title?: string;
};

function pickColumns(columns: string[], fields: string[]): string[] {
  if (!fields.length) return columns;
  return fields.filter((f) => columns.includes(f));
}

export function ChartRenderer({ config, title = "图表" }: ChartRendererProps) {
  const { columns, rows, loading, error, retry } = useChartExecute(config);
  const empty = !loading && !error && rows.length === 0;

  const renderBody = () => {
    if (config.chartType === "table") {
      const fields = [
        ...(config.dimensions?.map((d) => d.field) ?? []),
        ...(config.metrics?.map((m) => m.field) ?? []),
      ];
      const displayCols = pickColumns(columns, fields);
      const cols = displayCols.length ? displayCols : columns;
      return (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[320px] text-left text-theme-sm">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                {cols.map((c) => (
                  <th key={c} className="px-3 py-2 text-theme-xs font-medium text-gray-500">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-t border-gray-100 hover:bg-gray-50/50 dark:border-gray-800">
                  {cols.map((c) => {
                    const idx = columns.indexOf(c);
                    return (
                      <td key={c} className="px-3 py-2 text-gray-700 dark:text-gray-300">
                        {idx >= 0 ? String(row[idx] ?? "") : ""}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    const dim = config.dimensions?.[0]?.field;
    const metricFields = config.metrics?.map((m) => m.field) ?? [];
    if (!dim || !metricFields.length || !columns.includes(dim)) {
      return <p className="text-theme-sm text-gray-500">列不存在，请检查维度与指标配置</p>;
    }
    const categories = rows.map((r) => String(r[columns.indexOf(dim)] ?? ""));
    const series = metricFields.map((field) => ({
      name: field,
      data: rows.map((r) => Number(r[columns.indexOf(field)] ?? 0)),
    }));
    const options =
      config.chartType === "line"
        ? createLineChartOptions(categories)
        : createBarChartOptions(categories);
    return (
      <div>
        <Chart options={options} series={series} type={config.chartType === "line" ? "line" : "bar"} height={180} />
      </div>
    );
  };

  return (
    <ChartPanel title={title} loading={loading} error={error} empty={empty} onRetry={retry}>
      {!loading && !error && !empty ? renderBody() : null}
    </ChartPanel>
  );
}
