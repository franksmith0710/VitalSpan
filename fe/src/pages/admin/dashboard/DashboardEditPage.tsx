import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { apiFetch } from "@/lib/api";
import type { ChartTypeL1 } from "@/lib/chartViewConfig";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { DashboardWidget } from "@/components/dashboard/DashboardWidget";
import { GlobalFilterBar } from "@/components/dashboard/GlobalFilterBar";
import {
  buildWidgetFilterParams,
  type Linkage,
} from "@/components/dashboard/dashboardFilterUtils";
import {
  defaultChartConfig,
  moveWidget,
  normalizeWidgetIds,
  resizeWidget,
  sortWidgets,
  type DashboardLayout,
  type LayoutWidget,
} from "@/components/dashboard/layoutUtils";
import { WidgetPalette } from "@/components/dashboard/WidgetPalette";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type DashboardDetail = {
  id: string;
  name: string;
  layoutJson: DashboardLayout;
};

type DashboardEditPageProps = {
  mode: "edit" | "view";
};

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-error-500 bg-error-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-error-500/30 dark:bg-error-500/15">
      <p className="text-theme-sm text-error-700 dark:text-error-400">{message}</p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        重试
      </Button>
    </div>
  );
}

export function DashboardEditPage({ mode }: DashboardEditPageProps) {
  const { id } = useParams<{ id: string }>();
  const [name, setName] = useState("");
  const [widgets, setWidgets] = useState<LayoutWidget[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [linkage, setLinkage] = useState<Linkage | null>(null);

  const loadFilters = useCallback(async () => {
    if (!id || mode !== "view") return;
    try {
      const data = await apiFetch<Linkage>(`/api/v1/dashboards/${id}/global-filters`);
      setLinkage(data);
      const initial: Record<string, string> = {};
      for (const f of data.filters ?? []) {
        if (f.defaultValue) initial[f.filterId] = f.defaultValue;
      }
      setFilterValues(initial);
    } catch {
      setLinkage(null);
    }
  }, [id, mode]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<DashboardDetail>(`/api/v1/dashboards/${id}`);
      setName(data.name);
      setWidgets(sortWidgets(data.layoutJson.widgets ?? []));
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadFilters();
  }, [loadFilters]);

  const executeKey = useMemo(() => JSON.stringify(filterValues), [filterValues]);

  const handleInsert = (type: ChartTypeL1) => {
    const widgetId = crypto.randomUUID();
    const maxOrder = widgets.reduce((m, w) => Math.max(m, w.order), -1);
    const chartConfig = { ...defaultChartConfig(type), chartId: widgetId };
    const next: LayoutWidget = {
      id: widgetId,
      type: "chart",
      title: type === "table" ? "表格" : type === "line" ? "折线图" : "柱状图",
      colSpan: 6,
      rowSpan: 1,
      order: maxOrder + 1,
      chartConfig,
    };
    setWidgets((prev) => sortWidgets([...prev, next]));
  };

  const handleSave = async () => {
    if (!id) return;
    const missingDs = widgets.some((w) => !w.chartConfig.dataSourceId);
    if (missingDs) {
      setError("请为所有组件选择数据源");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const normalized = normalizeWidgetIds(sortWidgets(widgets));
      await apiFetch(`/api/v1/dashboards/${id}/layout`, {
        method: "PUT",
        body: JSON.stringify({
          layoutJson: { version: 1, widgets: normalized, globalFilters: [] },
        }),
      });
    } catch (err) {
      const apiErr = err as Error & { code?: string };
      setError(apiErr.message || "操作失败，请稍后重试");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="min-h-[320px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-theme-xl font-semibold text-gray-900 dark:text-white">{name || "Dashboard"}</h1>
          <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
            {mode === "edit" ? "编辑布局" : "预览"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/admin/dashboards">返回列表</Link>
          </Button>
          {mode === "edit" ? (
            <Button asChild variant="outline">
              <Link to={`/admin/dashboards/${id}`}>预览</Link>
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link to={`/admin/dashboards/${id}/edit`}>编辑布局</Link>
            </Button>
          )}
          {mode === "edit" ? (
            <Button type="button" variant="primary" disabled={saving} onClick={() => void handleSave()}>
              {saving ? "保存中…" : "保存布局"}
            </Button>
          ) : null}
        </div>
      </div>

      {error ? <ErrorBanner message={error} onRetry={() => void load()} /> : null}

      {mode === "view" && id ? (
        <GlobalFilterBar
          dashboardId={id}
          values={filterValues}
          onChange={(filterId, value) =>
            setFilterValues((prev) => ({ ...prev, [filterId]: value }))
          }
        />
      ) : null}

      <div className="flex flex-col gap-6 lg:flex-row">
        {mode === "edit" ? <WidgetPalette onInsert={handleInsert} /> : null}
        <div className="min-w-0 flex-1">
          <DashboardGrid
            mode={mode}
            widgets={widgets}
            onAddWidget={mode === "edit" ? () => handleInsert("table") : undefined}
            onLayoutChange={
              mode === "edit" ? (next) => setWidgets(sortWidgets(next)) : undefined
            }
            renderWidget={(widget) => {
              const filterParameters =
                mode === "view" && linkage
                  ? buildWidgetFilterParams(widget.id, linkage, filterValues)
                  : undefined;
              return (
              <DashboardWidget
                widget={widget}
                mode={mode}
                filterParameters={filterParameters}
                executeKey={mode === "view" ? executeKey : undefined}
                onDelete={(wid) => setWidgets((prev) => prev.filter((w) => w.id !== wid))}
                onMove={(wid, direction) => setWidgets((prev) => moveWidget(prev, wid, direction))}
                onResize={(wid, patch) => setWidgets((prev) => resizeWidget(prev, wid, patch))}
                onTitleChange={(wid, title) =>
                  setWidgets((prev) => resizeWidget(prev, wid, { title }))
                }
                onChartConfigChange={(wid, chartConfig) =>
                  setWidgets((prev) =>
                    prev.map((w) => (w.id === wid ? { ...w, chartConfig } : w)),
                  )
                }
              />
              );
            }}
          />
        </div>
      </div>
    </div>
  );
}
