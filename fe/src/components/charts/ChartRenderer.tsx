import { useEffect, useState } from "react";
import Chart from "react-apexcharts";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import { createBarChartOptions, createLineChartOptions } from "@/lib/chart-theme";
import { Button } from "@/components/ui/button";
import { ChartPanel } from "./ChartPanel";
import { CHART_EXECUTE_LIMIT, useChartExecute } from "./useChartExecute";

type ChartRendererProps = {
  config: ChartViewConfig;
  title?: string;
};

const PAGE_SIZE = 50;

function pickColumns(columns: string[], fields: string[]): string[] {
  if (!fields.length) return columns;
  return fields.filter((f) => columns.includes(f));
}

export function ChartRenderer({ config, title = "图表" }: ChartRendererProps) {
  const { columns, rows, loading, error, slowHint, retry } = useChartExecute(config);
  const [page, setPage] = useState(1);
  const empty = !loading && !error && rows.length === 0;

  useEffect(() => {
    setPage(1);
  }, [config]);

  const renderBody = () => {
    if (config.chartType === "table") {
      const fields = [
        ...(config.dimensions?.map((d) => d.field) ?? []),
        ...(config.metrics?.map((m) => m.field) ?? []),
      ];
      const displayCols = pickColumns(columns, fields);
      const cols = displayCols.length ? displayCols : columns;
      const pageRows =
        rows.length > PAGE_SIZE ? rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : rows;
      const totalPages = Math.ceil(rows.length / PAGE_SIZE);

      return (
        <>
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
                {pageRows.map((row, i) => (
                  <tr
                    key={i}
                    className="border-t border-gray-100 hover:bg-gray-50/50 dark:border-gray-800"
                  >
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
          {rows.length > PAGE_SIZE ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                上一页
              </Button>
              <span className="text-theme-xs text-gray-500">
                第 {page}/{totalPages} 页，共 {rows.length} 条
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                下一页
              </Button>
            </div>
          ) : null}
        </>
      );
    }

    if (rows.length > CHART_EXECUTE_LIMIT) {
      return (
        <p className="text-theme-sm text-warning-600 dark:text-warning-400">
          结果超过 {CHART_EXECUTE_LIMIT} 行，请缩小查询范围
        </p>
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
        <Chart
          options={options}
          series={series}
          type={config.chartType === "line" ? "line" : "bar"}
          height={180}
        />
      </div>
    );
  };

  return (
    <ChartPanel
      title={title}
      loading={loading}
      error={error}
      empty={empty}
      slowHint={slowHint}
      onRetry={retry}
    >
      {!loading && !error && !empty ? renderBody() : null}
    </ChartPanel>
  );
}
