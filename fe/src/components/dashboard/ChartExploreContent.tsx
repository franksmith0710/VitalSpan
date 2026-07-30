import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MousePointerClick, Search } from "lucide-react";
import { ListPageSection, ListPageToolbar } from "@/components/layout/list-page-kit";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PageErrorBanner } from "@/components/ui/page-error-banner";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { chartCategoryLabel, groupCatalogItemsByCategory } from "@/lib/chartTypeCatalogDisplay";
import { queryKeys } from "@/lib/queryKeys";
import {
  CatalogListItem,
  CatalogMetric,
  ChartTypeDetail,
} from "@/pages/admin/charts/chartExplorePanels";
import type { ChartTypeCatalogEntry } from "@/pages/admin/charts/chartExploreTypes";

export type { ChartTypeCatalogEntry };

type ChartExploreContentProps = {
  /** Drawer 内嵌时省略外层 min-h 约束 */
  embedded?: boolean;
};

export function ChartExploreContent({ embedded = false }: ChartExploreContentProps) {
  const [category, setCategory] = useState<string>("__all__");
  const [query, setQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.charts.types,
    queryFn: () => apiFetch<ChartTypeCatalogEntry[]>("/api/v1/charts/types"),
  });

  const items = data ?? [];

  const categories = useMemo(
    () => [...new Set(items.map((chart) => chart.category))].sort(),
    [items],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((chart) => {
      if (category !== "__all__" && chart.category !== category) return false;
      if (!needle) return true;
      return (
        chart.displayName.toLowerCase().includes(needle) ||
        chart.type.toLowerCase().includes(needle)
      );
    });
  }, [items, category, query]);

  const grouped = useMemo(
    () => groupCatalogItemsByCategory(filtered),
    [filtered],
  );

  const selected = filtered.find((chart) => chart.type === selectedType) ?? filtered[0] ?? null;

  useEffect(() => {
    if (!filtered.length) {
      setSelectedType(null);
      return;
    }
    if (!selectedType || !filtered.some((chart) => chart.type === selectedType)) {
      setSelectedType(filtered[0]!.type);
    }
  }, [filtered, selectedType]);

  const rendererKinds = new Set(items.map((chart) => chart.renderer)).size;
  const maxStyleVariants = items.length
    ? Math.max(...items.map((chart) => chart.styleVariants.length))
    : 0;

  return (
    <div className={embedded ? "flex min-h-0 flex-1 flex-col gap-4" : "flex min-h-0 flex-1 flex-col gap-4"}>
      {isError ? (
        <PageErrorBanner message={mapApiError(error)} onRetry={() => void refetch()} />
      ) : null}

      <Alert severity="info" appearance="subtle" className="shrink-0">
        <AlertDescription>
          本目录为只读参考；实际建图请在仪表板编辑态添加组件，并配置数据源与 SQL。
        </AlertDescription>
      </Alert>

      <ListPageSection className="min-h-0 flex-1">
        <ListPageToolbar
          filters={
            <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative w-full max-w-xs">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400"
                  aria-hidden
                />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索图表名称或类型 ID"
                  className="h-10 pl-9"
                  aria-label="搜索图表类型"
                />
              </div>
              <div className="hidden flex-wrap items-center gap-2 lg:flex">
                <Button
                  type="button"
                  size="sm"
                  variant={category === "__all__" ? "primary" : "outline"}
                  onClick={() => setCategory("__all__")}
                >
                  全部
                </Button>
                {categories.map((cat) => (
                  <Button
                    key={cat}
                    type="button"
                    size="sm"
                    variant={category === cat ? "primary" : "outline"}
                    onClick={() => setCategory(cat)}
                  >
                    {chartCategoryLabel(cat)}
                  </Button>
                ))}
              </div>
              <div className="lg:hidden">
                <Label className="mb-2 block">分类</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">全部分类</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {chartCategoryLabel(cat)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          }
          actions={
            isLoading ? (
              <Skeleton className="h-10 w-48 rounded-lg" aria-label="加载注册表摘要" />
            ) : (
              <div className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-2 dark:border-gray-800 dark:bg-white/[0.02]">
                <CatalogMetric label="图表类型" value={items.length} />
                <CatalogMetric label="分类" value={categories.length} />
                <CatalogMetric label="渲染引擎" value={rendererKinds} />
                <CatalogMetric label="样式变体（最多）" value={maxStyleVariants} />
              </div>
            )
          }
        />

        <div className="flex min-h-0 flex-1 overflow-hidden lg:hidden">
          <div className="flex w-full flex-col gap-3 border-b border-gray-100 p-4 dark:border-white/[0.06]">
            <Label>图表类型</Label>
            <Select
              value={selected?.type ?? "__none__"}
              onValueChange={(value) => setSelectedType(value === "__none__" ? null : value)}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="选择图表类型" />
              </SelectTrigger>
              <SelectContent>
                {filtered.map((chart) => (
                  <SelectItem key={chart.type} value={chart.type}>
                    {chart.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <aside className="hidden min-h-0 w-[min(300px,32%)] shrink-0 flex-col border-r border-gray-100 dark:border-white/[0.06] lg:flex">
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {isLoading
                ? Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton key={index} className="mb-1 h-11 w-full rounded-lg" />
                  ))
                : null}
              {!isLoading && filtered.length === 0 ? (
                <p className="px-3 py-8 text-center text-theme-sm text-gray-500 dark:text-gray-400">
                  没有匹配的图表类型
                </p>
              ) : null}
              {!isLoading && category === "__all__"
                ? grouped.map((group) => (
                    <div key={group.category} className="mb-3">
                      <p className="px-3 py-2 text-theme-xs font-medium tracking-wide text-gray-400 uppercase dark:text-gray-500">
                        {group.label}
                      </p>
                      <div className="space-y-0.5">
                        {group.items.map((item) => (
                          <CatalogListItem
                            key={item.type}
                            chart={item}
                            active={selected?.type === item.type}
                            onSelect={() => setSelectedType(item.type)}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                : null}
              {!isLoading && category !== "__all__"
                ? filtered.map((chart) => (
                    <CatalogListItem
                      key={chart.type}
                      chart={chart}
                      active={selected?.type === chart.type}
                      onSelect={() => setSelectedType(chart.type)}
                    />
                  ))
                : null}
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
                  {filtered.length ? "选择图表类型" : "暂无匹配结果"}
                </h3>
                <p className="mt-2 max-w-sm text-theme-sm text-gray-500 dark:text-gray-400">
                  {filtered.length
                    ? "从左侧目录选择图表，查看字段规则、样式变体与支持能力。"
                    : "尝试调整搜索关键词或切换分类筛选。"}
                </p>
              </div>
            )}
          </section>
        </div>
      </ListPageSection>
    </div>
  );
}
