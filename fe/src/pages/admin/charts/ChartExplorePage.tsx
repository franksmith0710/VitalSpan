import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { Button } from "@/components/ui/button";
import { WORKSPACE_HOME_PATH } from "@/lib/workspace";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import {
  CHART_CAPABILITY_LABELS,
  CHART_CATEGORY_LABELS,
  CHART_RENDERER_LABELS,
  chartTypeIcon,
} from "@/lib/chartTypeCatalogDisplay";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import { LayoutDashboard, MousePointerClick } from "lucide-react";
import { PageErrorBanner } from "@/components/ui/page-error-banner";

export type ChartTypeCatalogEntry = {
  type: string;
  displayName: string;
  category: string;
  renderer: string;
  styleVariants: string[];
  capabilities: string[];
  fieldRule: {
    minDimensions: number;
    maxDimensions: number;
    minMetrics: number;
    maxMetrics: number;
    note?: string | null;
  };
};

const CATEGORY_LABELS = CHART_CATEGORY_LABELS;
const RENDERER_LABELS = CHART_RENDERER_LABELS;
const CAPABILITY_LABELS = CHART_CAPABILITY_LABELS;

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <>
      <span className="text-theme-xs text-gray-500 dark:text-gray-400">{label}</span>
      <span className="mt-0.5 block text-theme-sm font-semibold tabular-nums text-gray-800 dark:text-white/90">
        {value}
      </span>
    </>
  );
}

function CatalogSummary({
  loading,
  typeCount,
  categoryCount,
  echartsCount,
  maxStyleVariants,
}: {
  loading: boolean;
  typeCount: number;
  categoryCount: number;
  echartsCount: number;
  maxStyleVariants: number;
}) {
  if (loading) {
    return <Skeleton className="h-[4.25rem] w-full rounded-xl" aria-label="加载注册表摘要" />;
  }

  const stats = [
    { label: "图表类型", value: typeCount },
    { label: "分类", value: categoryCount },
    { label: "ECharts 渲染", value: echartsCount },
    { label: "样式变体（最多）", value: maxStyleVariants },
  ] as const;

  return (
    <div
      className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-gray-200 bg-gray-200 shadow-theme-xs sm:grid-cols-4 dark:border-gray-800 dark:bg-gray-800"
      aria-label="图表注册表摘要"
    >
      {stats.map((stat) => (
        <div key={stat.label} className="bg-white px-4 py-3 dark:bg-white/[0.03]">
          <SummaryStat label={stat.label} value={stat.value} />
        </div>
      ))}
    </div>
  );
}

function ChartTypeDetail({ chart }: { chart: ChartTypeCatalogEntry }) {
  const Icon = chartTypeIcon(chart.type);
  return (
    <div className="flex min-h-0 flex-col">
      <div className="shrink-0 border-b border-gray-200 px-6 py-5 dark:border-gray-800">
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
            </div>
            <p className="mt-1 font-mono text-theme-xs text-gray-500 dark:text-gray-400">
              {chart.type}
            </p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
        <dl className="grid gap-4 rounded-xl border border-gray-200 p-5 dark:border-gray-800 sm:grid-cols-2">
          <div>
            <dt className="text-theme-xs text-gray-500 dark:text-gray-400">渲染器</dt>
            <dd className="mt-1 text-theme-sm font-medium text-gray-800 dark:text-white/90">
              {RENDERER_LABELS[chart.renderer] ?? chart.renderer}
            </dd>
          </div>
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
            {chart.styleVariants.map((v) => (
              <Badge key={v} variant="light" color="light" size="sm">
                {v}
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

export function ChartExplorePage() {
  const [category, setCategory] = useState<string>("__all__");
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.charts.types,
    queryFn: () => apiFetch<ChartTypeCatalogEntry[]>("/api/v1/charts/types"),
  });

  const items = data ?? [];

  const categories = useMemo(
    () => [...new Set(items.map((c) => c.category))].sort(),
    [items],
  );

  const filtered = useMemo(
    () => (category === "__all__" ? items : items.filter((c) => c.category === category)),
    [items, category],
  );

  const selected = filtered.find((c) => c.type === selectedType) ?? filtered[0] ?? null;

  const echartsCount = items.filter((c) => c.renderer === "echarts").length;
  const maxStyleVariants = items.length
    ? Math.max(...items.map((c) => c.styleVariants.length))
    : 0;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <AdminPageShell
        title="图表类型目录"
        description="浏览平台已注册的图表类型、渲染器与字段绑定规则（VIZ-003）。此处为只读参考目录；实际建图请在 Dashboard 编辑态添加组件并配置数据源与 SQL。"
        layout="fill"
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to={WORKSPACE_HOME_PATH}>
              <LayoutDashboard className="size-4" aria-hidden />
              去 Dashboard 建图
            </Link>
          </Button>
        }
      >
        {isError ? (
          <div className="shrink-0">
            <PageErrorBanner message={mapApiError(error)} onRetry={() => void refetch()} />
          </div>
        ) : null}

        <div className="shrink-0">
          <CatalogSummary
            loading={isLoading}
            typeCount={items.length}
            categoryCount={categories.length}
            echartsCount={echartsCount}
            maxStyleVariants={maxStyleVariants}
          />
        </div>

      <div className="shrink-0 lg:hidden">
        <Label className="mb-2 block">图表类型</Label>
        <Select
          value={selected?.type ?? "__none__"}
          onValueChange={(v) => setSelectedType(v === "__none__" ? null : v)}
        >
          <SelectTrigger className="h-11">
            <SelectValue placeholder="选择图表类型" />
          </SelectTrigger>
          <SelectContent>
            {filtered.map((c) => (
              <SelectItem key={c.type} value={c.type}>
                {c.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex h-full min-h-0 w-full flex-col lg:flex-row">
          <aside className="hidden min-h-0 w-full flex-col border-b border-gray-200 lg:flex lg:w-[min(300px,32%)] lg:shrink-0 lg:border-b-0 lg:border-r dark:border-gray-800">
            <div className="shrink-0 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
              <h2 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">类型目录</h2>
              <div className="mt-3">
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">全部分类</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {CATEGORY_LABELS[cat] ?? cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="mb-1 h-11 w-full rounded-lg" />
                  ))
                : null}
              {filtered.map((chart) => {
                const Icon = chartTypeIcon(chart.type);
                const active = selected?.type === chart.type;
                return (
                  <button
                    key={chart.type}
                    type="button"
                    onClick={() => setSelectedType(chart.type)}
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
                          active
                            ? "text-brand-600 dark:text-brand-400"
                            : "text-gray-800 dark:text-white/90",
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
              })}
            </div>
          </aside>

          <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            {isLoading ? (
              <div className="p-6">
                <Skeleton className="h-48 w-full rounded-xl" />
              </div>
            ) : selected ? (
              <ChartTypeDetail chart={selected} />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
                <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400">
                  <MousePointerClick className="size-6" aria-hidden />
                </div>
                <h3 className="text-theme-base font-semibold text-gray-800 dark:text-white/90">
                  选择图表类型
                </h3>
                <p className="mt-2 max-w-sm text-theme-sm text-gray-500 dark:text-gray-400">
                  从左侧目录选择图表，查看字段规则、样式变体与支持能力。要创建可出图的组件，请前往
                  Dashboard 编辑页。
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
      </AdminPageShell>
    </div>
  );
}
