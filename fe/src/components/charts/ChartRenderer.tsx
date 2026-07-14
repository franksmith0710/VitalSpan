import { useEffect, useMemo, useState } from "react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { apiFetch } from "@/lib/api";
import {
  isAdvancedEchartsType,
  isKpiType,
  type ChartViewConfig,
} from "@/lib/chartViewConfig";
import { createBarChartOptions, createLineChartOptions } from "@/lib/chart-theme";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AdvancedEchartsChart } from "./adapters/AdvancedEchartsChart";
import { KpiCard } from "./adapters/KpiCard";
import type { RenderSpec } from "./adapters/renderFromSpec";
import { ChartConfigPanel } from "./ChartConfigPanel";
import { ChartPanel } from "./ChartPanel";
import { CHART_EXECUTE_LIMIT, useChartExecute } from "./useChartExecute";
import { useElementSize } from "@/hooks/useElementSize";
import { estimateWidgetBodyHeight } from "@/components/dashboard/gridLayoutAdapter";

type ChartRendererProps = {
  config: ChartViewConfig;
  title?: string;
  mode?: "preview" | "config";
  /** 看板 widget 内嵌：填满容器、无重复 Panel 边框 */
  embedded?: boolean;
  /** 栅格行高（编辑态缩放时传入，用于首帧高度估算） */
  gridSpan?: { w: number; h: number };
  /** 像素画布逻辑尺寸（缩放/拖拽时比 DOM 测量更稳定） */
  pixelSize?: { width: number; height: number };
  /** shape 壳层顶部拖动手柄等占用高度 */
  contentChromePx?: number;
  filterParameters?: Record<string, string>;
  executeKey?: string;
};

const PAGE_SIZE = 50;

function pickColumns(columns: string[], fields: string[]): string[] {
  if (!fields.length) return columns;
  return fields.filter((f) => columns.includes(f));
}

function parseMetricValue(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const parsed = Number.parseFloat(raw.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function resolveEmbeddedChartSize(
  bodySize: { width: number; height: number },
  pixelSize: { width: number; height: number } | undefined,
  contentChromePx: number,
  gridSpan: { w: number; h: number } | undefined,
): { width: number; height: number } {
  const measuredHeight = bodySize.height > 0 ? bodySize.height : 0;
  const pixelHeight = pixelSize
    ? Math.max(48, pixelSize.height - contentChromePx)
    : 0;
  const fallbackHeight = gridSpan?.h ? estimateWidgetBodyHeight(gridSpan.h) : 120;
  const height = Math.max(64, measuredHeight || pixelHeight || fallbackHeight);

  const measuredWidth = bodySize.width > 0 ? bodySize.width : 0;
  const pixelWidth = pixelSize?.width ?? 0;
  const width = Math.max(80, measuredWidth || pixelWidth || 240);

  return { width, height };
}

export function ChartRenderer({
  config,
  title = "图表",
  mode = "preview",
  embedded = false,
  gridSpan,
  pixelSize,
  contentChromePx = 0,
  filterParameters,
  executeKey,
}: ChartRendererProps) {
  const { ref: bodyRef, size: bodySize } = useElementSize<HTMLDivElement>(embedded);
  const chartSize = useMemo(() => {
    if (!embedded) {
      return { width: bodySize.width || undefined, height: Math.max(180, bodySize.height || 180) };
    }
    return resolveEmbeddedChartSize(bodySize, pixelSize, contentChromePx, gridSpan);
  }, [
    embedded,
    bodySize.width,
    bodySize.height,
    pixelSize?.width,
    pixelSize?.height,
    contentChromePx,
    gridSpan?.h,
  ]);
  const { columns, rows, loading, error, slowHint, rerun } = useChartExecute(config, {
    filterParameters,
    executeKey,
  });
  const [page, setPage] = useState(1);
  const [renderSpec, setRenderSpec] = useState<RenderSpec | null>(null);
  const [localConfig, setLocalConfig] = useState(config);
  const empty = !loading && !error && rows.length === 0;

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  useEffect(() => {
    setPage(1);
  }, [config]);

  useEffect(() => {
    if (isKpiType(localConfig.chartType) || !isAdvancedEchartsType(localConfig.chartType) || loading || error) {
      setRenderSpec(null);
      return;
    }
    apiFetch<RenderSpec>("/api/v1/charts/render-spec", {
      method: "POST",
      body: JSON.stringify(localConfig),
    })
      .then(setRenderSpec)
      .catch(() => setRenderSpec(null));
  }, [localConfig, loading, error]);

  const renderBody = () => {
    if (isKpiType(localConfig.chartType)) {
      return (
        <KpiCard
          title={title}
          metrics={localConfig.metrics ?? []}
          columns={columns}
          rows={rows as unknown[][]}
        />
      );
    }

    if (isAdvancedEchartsType(localConfig.chartType)) {
      if (!renderSpec) {
        return <p className="text-theme-sm text-gray-500">渲染配置加载中…</p>;
      }
      return (
        <AdvancedEchartsChart
          spec={renderSpec}
          rows={rows as unknown[][]}
          columns={columns}
          ariaLabel={title}
          height={chartSize.height}
          width={chartSize.width}
        />
      );
    }

    if (localConfig.chartType === "table") {
      const fields = [
        ...(localConfig.dimensions?.map((d) => d.field) ?? []),
        ...(localConfig.metrics?.map((m) => m.field) ?? []),
      ];
      const displayCols = pickColumns(columns, fields);
      const cols = displayCols.length ? displayCols : columns;
      const pageRows =
        rows.length > PAGE_SIZE ? rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : rows;
      const totalPages = Math.ceil(rows.length / PAGE_SIZE);

      return (
        <div className={embedded ? "flex h-full min-h-0 flex-col" : undefined}>
          <div className={embedded ? "min-h-0 flex-1 overflow-auto" : "overflow-x-auto"}>
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
            <div className="mt-3 flex shrink-0 flex-wrap items-center gap-2">
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
        </div>
      );
    }

    if (rows.length > CHART_EXECUTE_LIMIT) {
      return (
        <p className="text-theme-sm text-warning-600 dark:text-warning-400">
          结果超过 {CHART_EXECUTE_LIMIT} 行，请缩小查询范围
        </p>
      );
    }

    const dim = localConfig.dimensions?.[0]?.field;
    const metricFields = localConfig.metrics?.map((m) => m.field) ?? [];
    if (!dim || !metricFields.length || !columns.includes(dim)) {
      return <p className="text-theme-sm text-gray-500">列不存在，请检查维度与指标配置</p>;
    }
    const categories = rows.map((r) => String(r[columns.indexOf(dim)] ?? ""));
    const series = metricFields.map((field) => ({
      name: field,
      data: rows.map((r) => parseMetricValue(r[columns.indexOf(field)])),
    }));
    let options: ApexOptions;
    const compactEmbedded = embedded && chartSize.height < 160;
    const apexSizeKey = `${Math.round(chartSize.width)}x${Math.round(chartSize.height)}`;
    const apexChart: ApexOptions["chart"] = {
      height: chartSize.height,
      redrawOnParentResize: true,
      redrawOnWindowResize: true,
      animations: embedded ? { enabled: false } : undefined,
      ...(localConfig.chartType === "bar" && localConfig.styleVariant === "stacked"
        ? { stacked: true }
        : {}),
    };
    const apexOverrides: ApexOptions = {
      chart: apexChart,
      legend: compactEmbedded ? { show: false } : undefined,
      markers: compactEmbedded ? { size: 3, strokeWidth: 0 } : undefined,
      xaxis: {
        categories,
        labels: {
          rotate: compactEmbedded && categories.length > 4 ? -35 : 0,
          hideOverlappingLabels: true,
          trim: true,
        },
      },
    };
    if (localConfig.chartType === "line") {
      options = createLineChartOptions(categories, apexOverrides);
    } else {
      options = createBarChartOptions(categories, apexOverrides);
    }
    return (
      <div
        ref={embedded ? bodyRef : undefined}
        className="h-full min-h-0 w-full overflow-hidden"
      >
        <Chart
          key={`${localConfig.chartType}-${apexSizeKey}-${series[0]?.data.length ?? 0}`}
          options={options}
          series={series}
          type={localConfig.chartType === "line" ? "line" : "bar"}
          height={chartSize.height}
          width={chartSize.width}
        />
      </div>
    );
  };

  const body = !loading && !error && !empty ? (
    <div
      className={
        mode === "config"
          ? "grid gap-4 lg:grid-cols-2"
          : embedded
            ? "flex min-h-0 flex-1 flex-col overflow-hidden"
            : ""
      }
    >
      {mode === "config" ? (
        <ChartConfigPanel
          config={localConfig}
          columns={columns}
          onChange={setLocalConfig}
        />
      ) : null}
      <div className={embedded ? "min-h-0 flex-1 overflow-hidden" : undefined}>
        {renderBody()}
      </div>
    </div>
  ) : null;

  if (embedded) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        {loading ? (
          <Skeleton className="min-h-[120px] w-full flex-1 rounded-lg" aria-busy="true" aria-label="图表加载中" />
        ) : error ? (
          <div
            role="alert"
            className="flex min-h-[120px] flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-error-500/40 bg-error-50/80 p-3 dark:bg-error-500/10"
          >
            <p className="text-theme-xs text-error-700 dark:text-error-400">{error}</p>
            <Button type="button" variant="outline" size="sm" onClick={rerun}>
              重试
            </Button>
          </div>
        ) : empty ? (
          <p className="flex flex-1 items-center justify-center text-theme-xs text-gray-500">暂无数据</p>
        ) : (
          body
        )}
      </div>
    );
  }

  return (
    <ChartPanel
      title={title}
      loading={loading}
      error={error}
      empty={empty}
      slowHint={slowHint}
      onRetry={rerun}
    >
      {body}
    </ChartPanel>
  );
}
