import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { apiFetch } from "@/lib/api";
import { isDashboardNotFound, mapApiError } from "@/lib/apiError";
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
  normalizeWidgetIds,
  resizeWidget,
  sortWidgets,
  type DashboardLayout,
  type LayoutWidget,
} from "@/components/dashboard/layoutUtils";
import { placeNewWidget, normalizeWidgetLayout, placeWidgetAt } from "@/components/dashboard/gridLayoutAdapter";
import { createLayoutWidget } from "@/components/dashboard/createLayoutWidget";
import { useUnsavedLeaveGuard } from "@/hooks/use-unsaved-leave-guard";
import { WidgetPalette } from "@/components/dashboard/WidgetPalette";
import { DashboardEditWorkspace } from "@/components/dashboard/DashboardEditWorkspace";
import { WidgetInspector } from "@/components/dashboard/WidgetInspector";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

function layoutFingerprint(widgets: LayoutWidget[]): string {
  return JSON.stringify(sortWidgets(widgets));
}

export function DashboardEditPage({ mode }: DashboardEditPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [widgets, setWidgets] = useState<LayoutWidget[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDashboardOpen, setDeleteDashboardOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** 看板已在服务端删除/不存在：禁止继续编辑僵尸页 */
  const [missing, setMissing] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [linkage, setLinkage] = useState<Linkage | null>(null);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [savedFingerprint, setSavedFingerprint] = useState<string | null>(null);

  const leaveEditShell = useCallback(() => {
    // 先清脏标记，避免离开守卫/二次操作卡在僵尸编辑态
    setMissing(true);
    setWidgets([]);
    setSavedFingerprint(null);
    setDeleteDashboardOpen(false);
    navigate("/admin/dashboards", { replace: true });
  }, [navigate]);

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
      setMissing(false);
      setName(data.name);
      const loaded = normalizeWidgetLayout(sortWidgets(data.layoutJson.widgets ?? []));
      setWidgets(loaded);
      setSavedFingerprint(layoutFingerprint(loaded));
      setSelectedWidgetId(null);
    } catch (err) {
      if (isDashboardNotFound(err)) {
        setMissing(true);
        setWidgets([]);
        setSavedFingerprint(layoutFingerprint([]));
        setError(mapApiError(err));
      } else {
        setError(mapApiError(err));
      }
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
    if (selectedWidgetId && !widgets.some((w) => w.id === selectedWidgetId)) {
      setSelectedWidgetId(null);
    }
  }, [mode, widgets, selectedWidgetId]);

  const isDirty = useMemo(() => {
    if (missing || savedFingerprint === null) return false;
    return layoutFingerprint(widgets) !== savedFingerprint;
  }, [missing, savedFingerprint, widgets]);

  const { leaveDialogOpen, confirmLeave, cancelLeave } = useUnsavedLeaveGuard({
    enabled: mode === "edit" && isDirty && !missing,
  });

  const selectedWidget = useMemo(
    () => widgets.find((w) => w.id === selectedWidgetId) ?? null,
    [widgets, selectedWidgetId],
  );

  const executeKey = useMemo(() => JSON.stringify(filterValues), [filterValues]);

  const appendWidget = (type: ChartType, at?: { gridX: number; gridY: number }) => {
    if (missing) return;
    const draft = createLayoutWidget(type, widgets, at);
    const placed =
      at != null
        ? placeWidgetAt(widgets, draft, at.gridX, at.gridY)
        : widgets.length === 0
          ? { ...draft, gridX: 0, gridY: 0 }
          : placeNewWidget(widgets, draft);
    setWidgets((prev) => sortWidgets([...prev, placed]));
    setSelectedWidgetId(placed.id);
  };

  const handleInsert = (type: ChartType) => {
    appendWidget(type);
  };

  const handleDropInsert = (type: ChartType, at: { gridX: number; gridY: number }) => {
    appendWidget(type, at);
  };

  const handleDeleteWidget = (widgetId: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== widgetId));
    setSelectedWidgetId((current) => (current === widgetId ? null : current));
  };

  const handleDeleteDashboard = async () => {
    if (!id || missing) {
      leaveEditShell();
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await apiFetch(`/api/v1/dashboards/${id}`, { method: "DELETE" });
      leaveEditShell();
    } catch (err) {
      if (isDashboardNotFound(err)) {
        leaveEditShell();
        return;
      }
      setError(mapApiError(err));
      setDeleteDashboardOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async (): Promise<boolean> => {
    if (!id || missing) return false;
    setSaving(true);
    setError(null);
    try {
      const normalized = normalizeWidgetIds(normalizeWidgetLayout(sortWidgets(widgets)));
      await apiFetch(`/api/v1/dashboards/${id}/layout`, {
        method: "PUT",
        body: JSON.stringify({
          layoutJson: { version: 1, widgets: normalized, globalFilters: [] },
        }),
      });
      setWidgets(normalized);
      setSavedFingerprint(layoutFingerprint(normalized));
      return true;
    } catch (err) {
      if (isDashboardNotFound(err)) {
        setError(mapApiError(err));
        leaveEditShell();
        return false;
      }
      setError(mapApiError(err));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndLeave = async () => {
    const ok = await handleSave();
    if (ok) confirmLeave();
  };

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild variant="outline" size="sm">
        <Link to="/admin/dashboards">返回列表</Link>
      </Button>
      {!missing && mode === "edit" ? (
        <Button asChild variant="outline" size="sm">
          <Link to={`/admin/dashboards/${id}`}>预览</Link>
        </Button>
      ) : null}
      {!missing && mode !== "edit" ? (
        <Button asChild variant="outline" size="sm">
          <Link to={`/admin/dashboards/${id}/edit`}>编辑布局</Link>
        </Button>
      ) : null}
      {!missing && mode === "edit" ? (
        <Button asChild variant="outline" size="sm">
          <Link to={`/admin/dashboards/${id}/share`}>分享</Link>
        </Button>
      ) : null}
      {mode === "edit" ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-error-200 text-error-600 hover:bg-error-50 dark:border-error-500/30 dark:text-error-400"
          disabled={deleting}
          onClick={() => (missing ? leaveEditShell() : setDeleteDashboardOpen(true))}
        >
          {missing ? "返回列表" : "删除看板"}
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

  if (missing) {
    return (
      <AdminPageShell
        title={name || "看板不存在"}
        description="该看板不存在或已被删除，无法继续编辑。"
        actions={headerActions}
      >
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-700 dark:bg-white/[0.02]">
          <p className="text-theme-sm text-gray-600 dark:text-gray-400">
            {error ?? "看板不存在或已被删除"}
          </p>
          <Button asChild variant="primary" size="sm">
            <Link to="/admin/dashboards">返回看板列表</Link>
          </Button>
        </div>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      layout={mode === "edit" ? "fill" : "default"}
      title={name || "Dashboard"}
      description={
        mode === "edit"
          ? isDirty
            ? "有未保存的更改 · 左侧拖拽/点击添加 · 保存后才会写入看板"
            : "左侧拖拽或点击添加组件 · 保存后写入看板"
          : "预览模式，查看图表与全局筛选效果。"
      }
      actions={headerActions}
    >
      {error ? (
        <ErrorBanner
          message={error}
          onRetry={() => {
            if (error.includes("数据源")) setError(null);
            else void load();
          }}
        />
      ) : null}

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
          widgetCount={widgets.length}
          canvasActions={
            <div className="flex shrink-0 items-center gap-2">
              <span className="hidden text-theme-xs text-gray-400 sm:inline">12 列</span>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={saving || !isDirty}
                onClick={() => void handleSave()}
              >
                {saving ? "保存中…" : isDirty ? "保存布局" : "已保存"}
              </Button>
            </div>
          }
          palette={<WidgetPalette embedded onInsert={handleInsert} />}
          canvas={
            <DashboardGrid
              mode="edit"
              widgets={widgets}
              onInsertChart={handleDropInsert}
              onLayoutChange={(next) => setWidgets(sortWidgets(next))}
              renderWidget={(widget) => (
                <DashboardWidget
                  widget={widget}
                  mode="edit"
                  selected={widget.id === selectedWidgetId}
                  onSelect={() => setSelectedWidgetId(widget.id)}
                  onDelete={handleDeleteWidget}
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
              embedded
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
                  onTitleChange={() => {}}
                />
              );
            }}
          />
        </div>
      )}
      {mode === "edit" ? (
        <AlertDialog open={leaveDialogOpen} onOpenChange={(open) => !open && cancelLeave()}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>未保存的更改</AlertDialogTitle>
              <AlertDialogDescription>
                布局有未保存的修改，离开后将丢失。请先保存布局，或确认放弃更改。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
              <AlertDialogCancel onClick={cancelLeave}>留在此页</AlertDialogCancel>
              <AlertDialogAction
                className="bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-white/10 dark:text-white/90 dark:hover:bg-white/15"
                onClick={confirmLeave}
              >
                放弃更改并离开
              </AlertDialogAction>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={saving}
                onClick={() => void handleSaveAndLeave()}
              >
                {saving ? "保存中…" : "保存并离开"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
      {mode === "edit" ? (
        <AlertDialog open={deleteDashboardOpen} onOpenChange={setDeleteDashboardOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>删除看板</AlertDialogTitle>
              <AlertDialogDescription>
                确定删除「{name || "未命名看板"}」？删除后无法恢复。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={deleting}
                onClick={() => void handleDeleteDashboard()}
              >
                {deleting ? "删除中…" : "删除"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </AdminPageShell>
  );
}
