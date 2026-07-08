import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import type { ChartType } from "@/lib/chartViewConfig";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
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
import { placeNewWidget } from "@/components/dashboard/gridLayoutAdapter";
import { WidgetPalette } from "@/components/dashboard/WidgetPalette";
import { DashboardEditWorkspace } from "@/components/dashboard/DashboardEditWorkspace";
import { WidgetInspector } from "@/components/dashboard/WidgetInspector";
import { WIDGET_CHART_LABELS } from "@/components/dashboard/widgetIcons";
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

const TITLE_MAP: Record<string, string> = WIDGET_CHART_LABELS;

export function DashboardEditPage({ mode }: DashboardEditPageProps) {
  const { id } = useParams<{ id: string }>();
  const [name, setName] = useState("");
  const [widgets, setWidgets] = useState<LayoutWidget[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [linkage, setLinkage] = useState<Linkage | null>(null);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);

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
      setError(mapApiError(err));
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

  useEffect(() => {
    if (mode !== "edit") return;
    if (widgets.length === 0) {
      setSelectedWidgetId(null);
      return;
    }
    if (!selectedWidgetId || !widgets.some((w) => w.id === selectedWidgetId)) {
      setSelectedWidgetId(widgets[0].id);
    }
  }, [mode, widgets, selectedWidgetId]);

  const selectedWidget = useMemo(
    () => widgets.find((w) => w.id === selectedWidgetId) ?? null,
    [widgets, selectedWidgetId],
  );

  const executeKey = useMemo(() => JSON.stringify(filterValues), [filterValues]);

  const handleInsert = (type: ChartType) => {
    const widgetId = crypto.randomUUID();
    const maxOrder = widgets.reduce((m, w) => Math.max(m, w.order), -1);
    const chartConfig = { ...defaultChartConfig(type), chartId: widgetId };
    const next: LayoutWidget = placeNewWidget(widgets, {
      id: widgetId,
      type: "chart",
      title: TITLE_MAP[type] ?? type,
      colSpan: 6,
      rowSpan: 3,
      order: maxOrder + 1,
      chartConfig,
    });
    setWidgets((prev) => sortWidgets([...prev, next]));
    setSelectedWidgetId(widgetId);
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
      setError(mapApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild variant="outline" size="sm">
        <Link to="/admin/dashboards">返回列表</Link>
      </Button>
      {mode === "edit" ? (
        <Button asChild variant="outline" size="sm">
          <Link to={`/admin/dashboards/${id}`}>预览</Link>
        </Button>
      ) : (
        <Button asChild variant="outline" size="sm">
          <Link to={`/admin/dashboards/${id}/edit`}>编辑布局</Link>
        </Button>
      )}
      {mode === "edit" ? (
        <Button asChild variant="outline" size="sm">
          <Link to={`/admin/dashboards/${id}/share`}>分享</Link>
        </Button>
      ) : null}
      {mode === "edit" ? (
        <Button type="button" variant="primary" size="sm" disabled={saving} onClick={() => void handleSave()}>
          {saving ? "保存中…" : "保存布局"}
        </Button>
      ) : null}
    </div>
  );

  if (loading) {
    return (
      <AdminPageShell title="Dashboard" description="加载中…">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="min-h-[320px] w-full rounded-2xl" />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      layout={mode === "edit" ? "fill" : "default"}
      title={name || "Dashboard"}
      description={
        mode === "edit"
          ? "从左侧拖入组件，在画布中拖拽排列与缩放，右侧配置数据后保存。"
          : "预览模式，查看图表与全局筛选效果。"
      }
      actions={headerActions}
    >
      {error ? <ErrorBanner message={error} onRetry={() => (error.includes("数据源") ? setError(null) : void load())} /> : null}

      {mode === "view" && id ? (
        <GlobalFilterBar
          dashboardId={id}
          values={filterValues}
          onChange={(filterId, value) =>
            setFilterValues((prev) => ({ ...prev, [filterId]: value }))
          }
        />
      ) : null}

      {mode === "edit" ? (
        <DashboardEditWorkspace
          palette={<WidgetPalette onInsert={handleInsert} />}
          canvas={
            <DashboardGrid
              mode="edit"
              widgets={widgets}
              onAddWidget={() => handleInsert("table")}
              onLayoutChange={(next) => setWidgets(sortWidgets(next))}
              renderWidget={(widget) => (
                <DashboardWidget
                  widget={widget}
                  mode="edit"
                  selected={widget.id === selectedWidgetId}
                  onSelect={() => setSelectedWidgetId(widget.id)}
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
              )}
            />
          }
          inspector={
            <WidgetInspector
              widget={selectedWidget}
              onChange={(chartConfig) => {
                if (!selectedWidgetId) return;
                setWidgets((prev) =>
                  prev.map((w) => (w.id === selectedWidgetId ? { ...w, chartConfig } : w)),
                );
              }}
            />
          }
        />
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.02]">
          <DashboardGrid
            mode="view"
            widgets={widgets}
            renderWidget={(widget) => {
              const filterParameters = linkage
                ? buildWidgetFilterParams(widget.id, linkage, filterValues)
                : undefined;
              return (
                <DashboardWidget
                  widget={widget}
                  mode="view"
                  filterParameters={filterParameters}
                  executeKey={executeKey}
                  onDelete={() => {}}
                  onMove={() => {}}
                  onResize={() => {}}
                  onTitleChange={() => {}}
                />
              );
            }}
          />
        </div>
      )}
    </AdminPageShell>
  );
}
