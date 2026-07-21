import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { CanvasChartHost } from "@/components/charts/engine/CanvasChartHost";
import { buildStyleContext } from "@/components/charts/engine/buildStyleContext";
import {
  CHART_CATALOG_SMOKE_CASES,
  smokeCaseToConfig,
  smokeCaseToViewModel,
} from "@/components/charts/chartCatalogSmokeFixtures";
import { resolveChartColors } from "@/lib/chartPalette";
import {
  CHART_CAPABILITY_LABELS,
  CHART_CATEGORY_LABELS,
  CHART_RENDERER_LABELS,
  chartTypeIcon,
} from "@/lib/chartTypeCatalogDisplay";
import { cn } from "@/lib/utils";
import type { ChartTypeCatalogEntry } from "./chartExploreTypes";

const CATEGORY_LABELS = CHART_CATEGORY_LABELS;
const RENDERER_LABELS = CHART_RENDERER_LABELS;
const CAPABILITY_LABELS = CHART_CAPABILITY_LABELS;

export function ChartExplorePreview({ chartType }: { chartType: string }) {
  const fixture = CHART_CATALOG_SMOKE_CASES.find((item) => item.type === chartType);
  const config = useMemo(() => (fixture ? smokeCaseToConfig(fixture) : null), [fixture]);
  const viewModel = useMemo(() => (fixture ? smokeCaseToViewModel(fixture) : null), [fixture]);
  const style = useMemo(() => {
    if (!config) return null;
    return buildStyleContext({
      config,
      scheme: "light",
      chartColors: resolveChartColors("default"),
    });
  }, [config]);

  if (!fixture || !config || !viewModel || !style) {
    return (
      <p className="text-theme-sm text-gray-500 dark:text-gray-400">暂无标准夹具预览</p>
    );
  }

  return (
    <div className="h-[220px] w-full overflow-hidden rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <CanvasChartHost viewModel={viewModel} style={style} chartConfig={config} height={190} />
    </div>
  );
}

export function CatalogMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex min-w-[5.5rem] flex-col gap-0.5">
      <span className="text-theme-xs text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-theme-sm font-semibold tabular-nums text-gray-800 dark:text-white/90">
        {value}
      </span>
    </div>
  );
}

export function ChartTypeDetail({ chart }: { chart: ChartTypeCatalogEntry }) {
  const Icon = chartTypeIcon(chart.type);
  return (
    <div className="flex min-h-0 flex-col">
      <div className="shrink-0 border-b border-gray-100 px-5 py-5 dark:border-white/[0.06] sm:px-6">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
            <Icon className="size-6" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-theme-lg font-semibold text-gray-900 dark:text-white">
                {chart.displayName}
              </h2>
              <Badge variant="light" color="primary" size="sm">
                {CATEGORY_LABELS[chart.category] ?? chart.category}
              </Badge>
              <Badge variant="light" color="light" size="sm">
                {RENDERER_LABELS[chart.renderer] ?? chart.renderer}
              </Badge>
            </div>
            <p className="mt-1 font-mono text-theme-xs text-gray-500 dark:text-gray-400">
              {chart.type}
            </p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
        <div>
          <h3 className="mb-2 text-theme-sm font-semibold text-gray-800 dark:text-white/90">
            标准夹具预览
          </h3>
          <ChartExplorePreview chartType={chart.type} />
        </div>
        <dl className="grid gap-4 rounded-xl border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-white/[0.02] sm:grid-cols-2">
          <div>
            <dt className="text-theme-xs text-gray-500 dark:text-gray-400">维度字段</dt>
            <dd className="mt-1 text-theme-sm font-medium text-gray-800 dark:text-white/90">
              {chart.fieldRule.minDimensions}–{chart.fieldRule.maxDimensions} 个
            </dd>
          </div>
          <div>
            <dt className="text-theme-xs text-gray-500 dark:text-gray-400">指标字段</dt>
            <dd className="mt-1 text-theme-sm font-medium text-gray-800 dark:text-white/90">
              {chart.fieldRule.minMetrics}–{chart.fieldRule.maxMetrics} 个
            </dd>
          </div>
          {chart.fieldRule.note ? (
            <div className="sm:col-span-2">
              <dt className="text-theme-xs text-gray-500 dark:text-gray-400">字段说明</dt>
              <dd className="mt-1 text-theme-sm text-gray-600 dark:text-gray-400">
                {chart.fieldRule.note}
              </dd>
            </div>
          ) : null}
        </dl>

        <div>
          <h3 className="mb-2 text-theme-sm font-semibold text-gray-800 dark:text-white/90">
            样式变体
          </h3>
          <div className="flex flex-wrap gap-2">
            {chart.styleVariants.map((variant) => (
              <Badge key={variant} variant="light" color="light" size="sm">
                {variant}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-theme-sm font-semibold text-gray-800 dark:text-white/90">
            支持能力
          </h3>
          <div className="flex flex-wrap gap-2">
            {chart.capabilities.map((cap) => (
              <Badge key={cap} variant="light" color="primary" size="sm">
                {CAPABILITY_LABELS[cap] ?? cap}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CatalogListItem({
  chart,
  active,
  onSelect,
}: {
  chart: ChartTypeCatalogEntry;
  active: boolean;
  onSelect: () => void;
}) {
  const Icon = chartTypeIcon(chart.type);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
        "hover:bg-gray-100 focus-visible:outline-hidden focus-visible:ring-3 focus-visible:ring-brand-500/10",
        "dark:hover:bg-white/[0.03]",
        active && "bg-brand-50 dark:bg-brand-500/10",
      )}
      aria-current={active ? "true" : undefined}
    >
      <Icon
        className={cn(
          "size-5 shrink-0",
          active ? "text-brand-600 dark:text-brand-400" : "text-gray-500",
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-theme-sm font-medium",
            active ? "text-brand-600 dark:text-brand-400" : "text-gray-800 dark:text-white/90",
          )}
        >
          {chart.displayName}
        </p>
        <p className="truncate text-theme-xs text-gray-500 dark:text-gray-400">
          {RENDERER_LABELS[chart.renderer] ?? chart.renderer}
        </p>
      </div>
    </button>
  );
}
