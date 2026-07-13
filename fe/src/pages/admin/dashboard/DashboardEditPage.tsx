import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Pencil, Redo2, Undo2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { isDashboardNotFound, mapApiError } from "@/lib/apiError";
import { cn } from "@/lib/utils";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { DashboardWidget } from "@/components/dashboard/DashboardWidget";
import { GlobalFilterBar } from "@/components/dashboard/GlobalFilterBar";
import {
  buildWidgetFilterParams,
  mergeLayoutFilterLinkage,
  type Linkage,
} from "@/components/dashboard/dashboardFilterUtils";
import { layoutFingerprint } from "@/components/dashboard/layoutHistory";
import {
  appendWidgetToTabPane,
  coerceLayoutWidgets,
  normalizeWidgetIds,
  resizeWidget,
  sortWidgets,
  type DashboardLayout,
  type DashboardStyleConfig,
  type FilterWidgetConfig,
  type LayoutWidget,
  type MediaWidgetConfig,
  type TabsWidgetConfig,
  type TextWidgetConfig,
} from "@/components/dashboard/layoutUtils";
import {
  normalizeWidgetLayout,
  placeNewWidget,
  placeWidgetAt,
  placeWidgetExact,
} from "@/components/dashboard/gridLayoutAdapter";
import type { GridInsertAt } from "@/components/dashboard/DashboardGrid";
import {
  createPaletteWidget,
  type PaletteInsertType,
} from "@/components/dashboard/createLayoutWidget";
import { DashboardContextInspector } from "@/components/dashboard/DashboardContextInspector";
import { DashboardEditWorkspace } from "@/components/dashboard/DashboardEditWorkspace";
import { ChartEditRail, ChartEditRailEmpty } from "@/components/dashboard/ChartEditRail";
import { FilterWidgetInspector } from "@/components/dashboard/FilterWidgetInspector";
import { TextWidgetInspector } from "@/components/dashboard/TextWidgetInspector";
import { MediaWidgetInspector } from "@/components/dashboard/MediaWidgetInspector";
import { TabsWidgetInspector } from "@/components/dashboard/TabsWidgetInspector";
import { ReuseWidgetDialog } from "@/components/dashboard/ReuseWidgetDialog";
import { DashboardStyleDialog } from "@/components/dashboard/DashboardStyleDialog";
import { WidgetPalette } from "@/components/dashboard/WidgetPalette";
import { useLayoutHistory } from "@/hooks/useLayoutHistory";
import { useWidgetSelection } from "@/hooks/useWidgetSelection";
import { useUnsavedLeaveGuard } from "@/hooks/use-unsaved-leave-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

function DashboardNameField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div
      className={cn(
        "group -ml-2 flex max-w-md items-center gap-2 rounded-lg border border-dashed border-transparent px-2",
        "transition-colors hover:border-gray-300 hover:bg-gray-50/80",
        "focus-within:border-brand-300 focus-within:bg-white focus-within:ring-3 focus-within:ring-brand-500/10",
        "dark:hover:border-gray-600 dark:hover:bg-white/[0.03] dark:focus-within:border-brand-500/40 dark:focus-within:bg-gray-900",
      )}
      data-testid="dashboard-name-field"
    >
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="未命名看板"
        aria-label="看板名称"
        title="点击编辑看板名称"
        className="h-9 min-w-[10rem] flex-1 border-0 bg-transparent px-0 text-title-sm font-semibold shadow-none focus-visible:ring-0"
      />
      <span
        className="flex shrink-0 items-center gap-1 text-theme-xs text-gray-400 opacity-70 transition-opacity group-hover:opacity-100 group-focus-within:text-brand-500 group-focus-within:opacity-100 dark:text-gray-500"
        aria-hidden
      >
        <Pencil className="size-3.5" />
        <span className="hidden sm:inline">点击编辑</span>
      </span>
    </div>
  );
}

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
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const { widgets, setWidgets, resetWidgets, undo, redo, canUndo, canRedo } = useLayoutHistory({
    keyboardEnabled: mode === "edit",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDashboardOpen, setDeleteDashboardOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** 看板已在服务端删除/不存在：禁止继续编辑僵尸页 */
  const [missing, setMissing] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [linkage, setLinkage] = useState<Linkage | null>(null);
  const {
    selectedIds,
    primarySelectedId,
    handleSelect,
    clearSelection,
    removeFromSelection,
    pruneMissing,
  } = useWidgetSelection();
  const [savedName, setSavedName] = useState("");
  const [savedFingerprint, setSavedFingerprint] = useState<string | null>(null);

  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [styleConfig, setStyleConfig] = useState<DashboardStyleConfig>({});
  const [savedStyleConfig, setSavedStyleConfig] = useState<DashboardStyleConfig>({});
  const [reuseOpen, setReuseOpen] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);
  const [linkagePanelOpen, setLinkagePanelOpen] = useState(false);

  const leaveEditShell = useCallback(() => {
    // 先清脏标记，避免离开守卫/二次操作卡在僵尸编辑态
    setMissing(true);
    resetWidgets([]);
    setSavedFingerprint(null);
    setSavedName("");
    setDeleteDashboardOpen(false);
    navigate("/admin/dashboards", { replace: true });
  }, [navigate, resetWidgets]);

  const loadFilters = useCallback(async () => {
    if (!id) return;
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
  }, [id]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<DashboardDetail>(`/api/v1/dashboards/${id}`);
      setMissing(false);
      setName(data.name);
      setSavedName(data.name);
      const loaded = normalizeWidgetLayout(
        sortWidgets(coerceLayoutWidgets(data.layoutJson.widgets ?? [])),
      );
      resetWidgets(loaded);
      setStyleConfig(data.layoutJson.styleConfig ?? {});
      setSavedStyleConfig(data.layoutJson.styleConfig ?? {});
      setSavedFingerprint(layoutFingerprint(loaded));
      clearSelection();
      // Seed filter values from canvas filter widgets
      setFilterValues((prev) => {
        const next = { ...prev };
        for (const w of loaded) {
          if (w.type === "filter" && w.filterConfig) {
            const fid = w.filterConfig.filterId;
            if (next[fid] === undefined && w.filterConfig.defaultValue) {
              next[fid] = w.filterConfig.defaultValue;
            }
          }
        }
        return next;
      });
    } catch (err) {
      if (isDashboardNotFound(err)) {
        setMissing(true);
        resetWidgets([]);
        setSavedFingerprint(layoutFingerprint([]));
        setError(mapApiError(err));
      } else {
        setError(mapApiError(err));
      }
    } finally {
      setLoading(false);
    }
  }, [id, resetWidgets, clearSelection]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadFilters();
  }, [loadFilters]);

  useEffect(() => {
    if (mode !== "edit") return;
    pruneMissing(widgets.map((w) => w.id));
  }, [mode, widgets, pruneMissing]);

  const isDirty = useMemo(() => {
    if (missing || savedFingerprint === null) return false;
    const styleDirty = JSON.stringify(styleConfig) !== JSON.stringify(savedStyleConfig);
    return layoutFingerprint(widgets) !== savedFingerprint || name.trim() !== savedName || styleDirty;
  }, [missing, savedFingerprint, widgets, name, savedName, styleConfig, savedStyleConfig]);

  const filterWidgetCount = useMemo(
    () => widgets.filter((w) => w.type === "filter").length,
    [widgets],
  );

  const { leaveDialogOpen, confirmLeave, cancelLeave } = useUnsavedLeaveGuard({
    enabled: mode === "edit" && isDirty && !missing,
  });

  const selectedWidget = useMemo(
    () => widgets.find((w) => w.id === primarySelectedId) ?? null,
    [widgets, primarySelectedId],
  );
  const multiSelectCount = selectedIds.size;

  const executeKey = useMemo(() => JSON.stringify(filterValues), [filterValues]);

  const effectiveLinkage = useMemo(
    () => mergeLayoutFilterLinkage(widgets, linkage),
    [widgets, linkage],
  );

  const appendWidget = (type: PaletteInsertType, at?: GridInsertAt) => {
    if (missing) return;
    const tabsHost =
      selectedWidget?.type === "tabs" && selectedWidget.tabsConfig && type !== "tabs"
        ? selectedWidget
        : null;
    let draft = createPaletteWidget(type, widgets, at);
    if (tabsHost?.tabsConfig) {
      draft = {
        ...draft,
        parentTabsId: tabsHost.id,
        tabPaneId: tabsHost.tabsConfig.activePaneId,
        colSpan: 12,
        rowSpan: 2,
      };
    }
    let next: LayoutWidget[];
    if (tabsHost?.tabsConfig && draft.parentTabsId) {
      next = sortWidgets([...widgets, draft]);
      next = appendWidgetToTabPane(
        next,
        tabsHost.id,
        tabsHost.tabsConfig.activePaneId,
        draft.id,
      );
    } else {
      const placed =
        at?.exact === true
          ? placeWidgetExact(draft, {
              gridX: at.gridX,
              gridY: at.gridY,
              colSpan: at.colSpan,
              rowSpan: at.rowSpan,
            })
          : at != null
            ? placeWidgetAt(widgets, draft, at.gridX, at.gridY)
            : widgets.length === 0
              ? { ...draft, gridX: 0, gridY: 0 }
              : placeNewWidget(widgets, draft);
      next = sortWidgets([...widgets, placed]);
      draft = placed;
    }
    setWidgets(next);
    handleSelect(draft.id, false);
    if (draft.type === "filter" && draft.filterConfig) {
      setFilterValues((prev) => ({
        ...prev,
        [draft.filterConfig!.filterId]: draft.filterConfig!.defaultValue ?? "",
      }));
    }
  };

  const appendClonedWidget = (widget: LayoutWidget) => {
    if (missing) return;
    const placed = placeNewWidget(widgets, widget);
    setWidgets((prev) => sortWidgets([...prev, placed]));
    handleSelect(placed.id, false);
  };

  const handleInsert = (type: PaletteInsertType) => {
    appendWidget(type);
  };

  const handleDropInsert = (type: PaletteInsertType, at: GridInsertAt) => {
    appendWidget(type, at);
  };

  const handleFilterValueChange = (filterId: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [filterId]: value }));
  };

  const handleDeleteWidget = (widgetId: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== widgetId));
    removeFromSelection([widgetId]);
  };

  const handleBatchDelete = () => {
    const ids = [...selectedIds];
    setWidgets((prev) => prev.filter((w) => !selectedIds.has(w.id)));
    removeFromSelection(ids);
    setBatchDeleteOpen(false);
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
      const trimmedName = name.trim() || "未命名看板";

      if (trimmedName !== savedName) {
        await apiFetch(`/api/v1/dashboards/${id}`, {
          method: "PUT",
          body: JSON.stringify({ name: trimmedName }),
        });
        setName(trimmedName);
        setSavedName(trimmedName);
      }

      await apiFetch(`/api/v1/dashboards/${id}/layout`, {
        method: "PUT",
        body: JSON.stringify({
          layoutJson: {
            version: 1,
            widgets: normalized,
            globalFilters: [],
            styleConfig: styleConfig.widgetGap || styleConfig.canvasBackground ? styleConfig : undefined,
          },
        }),
      });

      const mergedLinkage = mergeLayoutFilterLinkage(normalized, linkage);
      if (mergedLinkage.filters.length > 0) {
        const savedLinkage = await apiFetch<Linkage>(
          `/api/v1/dashboards/${id}/global-filters`,
          {
            method: "PUT",
            body: JSON.stringify({
              dashboardId: id,
              filters: mergedLinkage.filters,
              linkageRules: mergedLinkage.linkageRules,
              refreshMode: mergedLinkage.refreshMode ?? "eager",
            }),
          },
        );
        setLinkage(savedLinkage);
      }

      resetWidgets(normalized);
      setSavedStyleConfig(styleConfig);
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

  const pageTitle =
    mode === "edit" && !missing ? (
      <DashboardNameField value={name} onChange={setName} />
    ) : (
      name || "Dashboard"
    );

  return (
    <AdminPageShell
      layout={mode === "edit" ? "fill" : "default"}
      title={pageTitle}
      description={
        mode === "edit"
          ? isDirty
            ? "有未保存的更改 · 保存后生效"
            : "点击标题可重命名 · 拖入组件、右侧配置属性、保存布局"
          : "预览模式 · 筛选器变更会刷新关联图表"
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

      {id && mode !== "edit" ? (
        <GlobalFilterBar
          dashboardId={id}
          values={filterValues}
          onChange={handleFilterValueChange}
        />
      ) : null}

      {mode === "edit" ? (
        <>
        <DashboardEditWorkspace
          widgetCount={widgets.length}
          multiSelectCount={multiSelectCount}
          canvasActions={
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {multiSelectCount >= 2 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-error-200 text-error-600 hover:bg-error-50 dark:border-error-500/30 dark:text-error-400"
                  onClick={() => setBatchDeleteOpen(true)}
                >
                  删除选中 ({multiSelectCount})
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canUndo}
                onClick={undo}
                title="回退到上一步编辑 (Ctrl+Z)"
                aria-label="上一步"
              >
                <Undo2 aria-hidden />
                上一步
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canRedo}
                onClick={redo}
                title="前进到下一步编辑 (Ctrl+Shift+Z 或 Ctrl+Y)"
                aria-label="下一步"
              >
                <Redo2 aria-hidden />
                下一步
              </Button>
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
          onPaletteInsert={handleInsert}
          onOpenReuse={() => setReuseOpen(true)}
          onOpenDashboardStyle={() => setStyleOpen(true)}
          onOpenLinkage={() => {
            clearSelection();
            setLinkagePanelOpen(true);
          }}
          canvas={
            <div
              className="h-full min-h-0"
              style={
                styleConfig.canvasBackground
                  ? { background: styleConfig.canvasBackground }
                  : undefined
              }
            >
            <DashboardGrid
              mode="edit"
              widgets={widgets}
              selectedIds={selectedIds}
              onClearSelection={clearSelection}
              onInsertChart={handleDropInsert}
              onLayoutChange={(next) => setWidgets(sortWidgets(next))}
              renderWidget={(widget, grid) => {
                const filterParameters =
                  widget.type === "chart"
                    ? buildWidgetFilterParams(widget.id, effectiveLinkage, filterValues)
                    : undefined;
                const renderNested = (child: LayoutWidget) => {
                  const childFilterParams =
                    child.type === "chart"
                      ? buildWidgetFilterParams(child.id, effectiveLinkage, filterValues)
                      : undefined;
                  return (
                    <DashboardWidget
                      widget={child}
                      mode="edit"
                      selected={selectedIds.has(child.id)}
                      filterParameters={childFilterParams}
                      executeKey={executeKey}
                      filterValue={
                        child.filterConfig
                          ? filterValues[child.filterConfig.filterId]
                          : undefined
                      }
                      onFilterValueChange={handleFilterValueChange}
                      onSelect={(e) => handleSelect(child.id, e.shiftKey)}
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
                  );
                };
                return (
                  <DashboardWidget
                    widget={widget}
                    mode="edit"
                    selected={selectedIds.has(widget.id)}
                    gridSize={grid}
                    allWidgets={widgets}
                    renderNestedWidget={renderNested}
                    filterParameters={filterParameters}
                    executeKey={executeKey}
                    filterValue={
                      widget.filterConfig
                        ? filterValues[widget.filterConfig.filterId]
                        : undefined
                    }
                    onFilterValueChange={handleFilterValueChange}
                    onSelect={(e) => {
                      setLinkagePanelOpen(false);
                      handleSelect(widget.id, e.shiftKey);
                    }}
                    onDelete={handleDeleteWidget}
                    onTitleChange={(wid, title) =>
                      setWidgets((prev) => resizeWidget(prev, wid, { title }))
                    }
                    onChartConfigChange={(wid, chartConfig) =>
                      setWidgets((prev) =>
                        prev.map((w) => (w.id === wid ? { ...w, chartConfig } : w)),
                      )
                    }
                    onTabsConfigChange={(wid, tabsConfig) =>
                      setWidgets((prev) =>
                        prev.map((w) => (w.id === wid ? { ...w, tabsConfig } : w)),
                      )
                    }
                  />
                );
              }}
            />
            </div>
          }
          chartRail={
            multiSelectCount >= 2 ? (
              <ChartEditRailEmpty
                message={
                  <>
                    <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">
                      已选中 {multiSelectCount} 个组件
                    </p>
                    <p className="mt-1 max-w-[240px] text-theme-xs text-gray-500 dark:text-gray-400">
                      Shift+点击可增减多选；使用画布工具栏批量删除。
                    </p>
                  </>
                }
              />
            ) : selectedWidget?.type === "filter" && selectedWidget.filterConfig ? (
              <FilterWidgetInspector
                embedded
                widget={
                  selectedWidget as typeof selectedWidget & { filterConfig: FilterWidgetConfig }
                }
                onChange={(filterConfig) => {
                  if (!primarySelectedId) return;
                  setWidgets((prev) =>
                    prev.map((w) => (w.id === primarySelectedId ? { ...w, filterConfig } : w)),
                  );
                }}
              />
            ) : selectedWidget?.type === "text" && selectedWidget.textConfig ? (
              <TextWidgetInspector
                embedded
                widget={
                  selectedWidget as typeof selectedWidget & { textConfig: TextWidgetConfig }
                }
                onChange={(textConfig) => {
                  if (!primarySelectedId) return;
                  setWidgets((prev) =>
                    prev.map((w) => (w.id === primarySelectedId ? { ...w, textConfig } : w)),
                  );
                }}
              />
            ) : selectedWidget?.type === "media" && selectedWidget.mediaConfig ? (
              <MediaWidgetInspector
                embedded
                widget={
                  selectedWidget as typeof selectedWidget & { mediaConfig: MediaWidgetConfig }
                }
                onChange={(mediaConfig) => {
                  if (!primarySelectedId) return;
                  setWidgets((prev) =>
                    prev.map((w) => (w.id === primarySelectedId ? { ...w, mediaConfig } : w)),
                  );
                }}
              />
            ) : selectedWidget?.type === "tabs" && selectedWidget.tabsConfig ? (
              <TabsWidgetInspector
                embedded
                widget={
                  selectedWidget as typeof selectedWidget & { tabsConfig: TabsWidgetConfig }
                }
                onChange={(tabsConfig) => {
                  if (!primarySelectedId) return;
                  setWidgets((prev) =>
                    prev.map((w) => (w.id === primarySelectedId ? { ...w, tabsConfig } : w)),
                  );
                }}
              />
            ) : selectedWidget?.type === "chart" ? (
              <ChartEditRail
                widget={selectedWidget}
                onDelete={() => handleDeleteWidget(primarySelectedId!)}
                onChange={(chartConfig) => {
                  if (!primarySelectedId) return;
                  setWidgets((prev) =>
                    prev.map((w) => (w.id === primarySelectedId ? { ...w, chartConfig } : w)),
                  );
                }}
              />
            ) : id ? (
              <DashboardContextInspector
                embedded
                dashboardId={id}
                widgetCount={widgets.length}
                filterWidgetCount={filterWidgetCount}
                widgets={widgets}
                linkage={linkage}
                effectiveLinkage={effectiveLinkage}
                onLinkageChange={setLinkage}
                linkageDefaultOpen={linkagePanelOpen}
              />
            ) : null
          }
        />
        <ReuseWidgetDialog
          open={reuseOpen}
          onOpenChange={setReuseOpen}
          currentDashboardId={id}
          widgets={widgets}
          onInsertCloned={appendClonedWidget}
        />
        <DashboardStyleDialog
          open={styleOpen}
          onOpenChange={setStyleOpen}
          value={styleConfig}
          onApply={setStyleConfig}
        />
        </>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.02]">
          <DashboardGrid
            mode="view"
            widgets={widgets}
            renderWidget={(widget, grid) => {
              const filterParameters =
                widget.type === "chart"
                  ? buildWidgetFilterParams(widget.id, effectiveLinkage, filterValues)
                  : undefined;
              const renderNested = (child: LayoutWidget) => (
                <DashboardWidget
                  widget={child}
                  mode="view"
                  filterParameters={
                    child.type === "chart"
                      ? buildWidgetFilterParams(child.id, effectiveLinkage, filterValues)
                      : undefined
                  }
                  executeKey={executeKey}
                  filterValue={
                    child.filterConfig ? filterValues[child.filterConfig.filterId] : undefined
                  }
                  onFilterValueChange={handleFilterValueChange}
                  onTitleChange={() => {}}
                />
              );
              return (
                <DashboardWidget
                  widget={widget}
                  mode="view"
                  gridSize={grid}
                  allWidgets={widgets}
                  renderNestedWidget={renderNested}
                  filterParameters={filterParameters}
                  executeKey={executeKey}
                  filterValue={
                    widget.filterConfig
                      ? filterValues[widget.filterConfig.filterId]
                      : undefined
                  }
                  onFilterValueChange={handleFilterValueChange}
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
        <AlertDialog open={batchDeleteOpen} onOpenChange={setBatchDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>批量删除组件</AlertDialogTitle>
              <AlertDialogDescription>
                确定删除选中的 {multiSelectCount} 个组件？删除后需保存布局才会生效。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={handleBatchDelete}>删除</AlertDialogAction>
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
