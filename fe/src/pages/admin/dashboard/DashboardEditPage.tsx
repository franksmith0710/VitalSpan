import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ChevronLeft, Redo2, Trash2, Undo2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { isDashboardNotFound, mapApiError } from "@/lib/apiError";
import { cn } from "@/lib/utils";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { GlobalFilterBar } from "@/components/dashboard/GlobalFilterBar";
import { PageErrorBanner } from "@/components/ui/page-error-banner";
import {
  buildWidgetFilterParams,
  mergeLayoutFilterLinkage,
  type Linkage,
} from "@/components/dashboard/dashboardFilterUtils";
import {
  appendWidgetToTabPane,
  coerceLayoutWidgets,
  sortWidgets,
  type DashboardLayout,
  type DashboardStyleConfig,
  type FilterWidgetConfig,
  type LayoutWidget,
  type MediaWidgetConfig,
  type PixelLayoutWidget,
  type TabsWidgetConfig,
  type TextWidgetConfig,
} from "@/components/dashboard/layoutUtils";
import {
  buildDashboardLayoutForSave,
  dashboardPersistFingerprint,
  isPixelCanvasEnabled,
  mergeLayoutWidgetIntoPixel,
  pixelWidgetToLayoutWidget,
  prepareDashboardLayout,
} from "@/components/dashboard/dashboardCanvasMode";
import {
  insertClonedPixelWidget,
  insertPixelPaletteWidget,
  insertPixelPaletteWidgetAt,
  type PixelRect,
} from "@/components/dashboard/pixelCanvas";
import { DashboardEditCanvas } from "@/components/dashboard/dashboard-edit/DashboardEditCanvas";
import { cloneLayoutWidget } from "@/components/dashboard/cloneLayoutWidget";
import type { PixelWidgetActions } from "@/components/dashboard/pixelCanvas/PixelShapeActionRail";
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
import type { PaletteDragPayload } from "@/lib/dashboardDnd";
import { DashboardContextInspector } from "@/components/dashboard/DashboardContextInspector";
import { DashboardEditWorkspace } from "@/components/dashboard/DashboardEditWorkspace";
import { ChartEditRail, ChartEditRailEmpty } from "@/components/dashboard/ChartEditRail";
import { FilterWidgetInspector } from "@/components/dashboard/FilterWidgetInspector";
import { TextEditRail } from "@/components/dashboard/TextEditRail";
import { MediaWidgetInspector } from "@/components/dashboard/MediaWidgetInspector";
import { TabsWidgetInspector } from "@/components/dashboard/TabsWidgetInspector";
import { ReuseWidgetDialog } from "@/components/dashboard/ReuseWidgetDialog";
import { WidgetEnlargeDialog } from "@/components/dashboard/widget-actions/WidgetEnlargeDialog";
import { WidgetViewDataDialog } from "@/components/dashboard/widget-actions/WidgetViewDataDialog";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import { DashboardInlineTitle } from "@/components/dashboard/DashboardInlineTitle";
import { useDashboardCanvasState } from "@/hooks/useDashboardCanvasState";
import { useWidgetSelection } from "@/hooks/useWidgetSelection";
import { useUnsavedLeaveGuard } from "@/hooks/use-unsaved-leave-guard";
import { Button, IconButton } from "@/components/ui/button";
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

export function DashboardEditPage({ mode }: DashboardEditPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const pixelEnabled = isPixelCanvasEnabled(import.meta.env.VITE_DASHBOARD_PIXEL_CANVAS);
  const {
    editor,
    canSave,
    layout,
    widgets,
    setWidgets,
    resetLayout,
    setPixelLayout,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useDashboardCanvasState({
    keyboardEnabled: mode === "edit",
    pixelEnabled,
    editable: mode === "edit",
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
  const [reuseOpen, setReuseOpen] = useState(false);
  const [linkagePanelOpen, setLinkagePanelOpen] = useState(false);
  const [chartRailOpen, setChartRailOpen] = useState(true);
  const [chartRefreshKeys, setChartRefreshKeys] = useState<Record<string, number>>({});
  const [pixelViewport, setPixelViewport] = useState<PixelRect>();
  const [widgetActionDialog, setWidgetActionDialog] = useState<{
    type: "view-data" | "enlarge";
    widgetId: string;
  } | null>(null);
  const loadGenerationRef = useRef(0);
  const hydratedRef = useRef(false);
  const isDirtyRef = useRef(false);

  const leaveEditShell = useCallback(() => {
    // 先清脏标记，避免离开守卫/二次操作卡在僵尸编辑态
    setMissing(true);
    resetLayout({ version: 1, widgets: [], globalFilters: [] });
    setSavedFingerprint(null);
    setSavedName("");
    setDeleteDashboardOpen(false);
    navigate("/admin/dashboards", { replace: true });
  }, [navigate, resetLayout]);

  const load = useCallback(async (opts?: { force?: boolean }) => {
    if (!id) return;
    const generation = ++loadGenerationRef.current;
    const firstLoad = !hydratedRef.current;
    if (firstLoad) setLoading(true);
    setError(null);
    try {
      const [data, loadedLinkage] = await Promise.all([
        apiFetch<DashboardDetail>(`/api/v1/dashboards/${id}`),
        apiFetch<Linkage>(`/api/v1/dashboards/${id}/global-filters`).catch(() => null),
      ]);
      if (generation !== loadGenerationRef.current) return;
      if (!opts?.force && hydratedRef.current && isDirtyRef.current) {
        return;
      }
      setMissing(false);
      setName(data.name);
      setSavedName(data.name);
      const source =
        data.layoutJson.version === 1
          ? {
              ...data.layoutJson,
              widgets: normalizeWidgetLayout(
                sortWidgets(coerceLayoutWidgets(data.layoutJson.widgets ?? [])),
              ),
            }
          : data.layoutJson;
      const prepared = prepareDashboardLayout(
        source,
        mode === "edit" ? pixelEnabled : false,
      );
      resetLayout(source);
      setStyleConfig(source.styleConfig ?? {});
      setSavedFingerprint(
        dashboardPersistFingerprint(
          prepared.layout,
          source.styleConfig ?? {},
          mode === "edit" ? pixelEnabled : false,
        ),
      );
      setLinkage(loadedLinkage);
      setPixelViewport(undefined);
      clearSelection();
      hydratedRef.current = true;
      setFilterValues(() => {
        const next: Record<string, string> = {};
        for (const filter of loadedLinkage?.filters ?? []) {
          if (filter.defaultValue) next[filter.filterId] = filter.defaultValue;
        }
        for (const w of prepared.layout.widgets) {
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
      if (generation !== loadGenerationRef.current) return;
      if (isDashboardNotFound(err)) {
        setMissing(true);
        resetLayout({ version: 1, widgets: [], globalFilters: [] });
        setSavedFingerprint(JSON.stringify({ version: 1, widgets: [], globalFilters: [] }));
        setError(mapApiError(err));
      } else {
        setError(mapApiError(err));
      }
    } finally {
      if (generation === loadGenerationRef.current && firstLoad) setLoading(false);
    }
  }, [id, resetLayout, clearSelection, mode, pixelEnabled]);

  useEffect(() => {
    hydratedRef.current = false;
    void load({ force: true });
  }, [id, mode]);

  useEffect(() => {
    if (mode !== "edit") return;
    pruneMissing(widgets.map((w) => w.id));
  }, [mode, widgets, pruneMissing]);

  const isDirty = useMemo(() => {
    if (missing || savedFingerprint === null) return false;
    return (
      dashboardPersistFingerprint(layout, styleConfig, pixelEnabled) !== savedFingerprint ||
      name.trim() !== savedName
    );
  }, [missing, savedFingerprint, layout, styleConfig, pixelEnabled, name, savedName]);

  isDirtyRef.current = isDirty;

  const filterWidgetCount = useMemo(
    () => widgets.filter((w) => w.type === "filter").length,
    [widgets],
  );

  const { leaveDialogOpen, confirmLeave, cancelLeave } = useUnsavedLeaveGuard({
    enabled: mode === "edit" && canSave && isDirty && !missing,
  });

  const selectedWidget = useMemo(
    () => widgets.find((w) => w.id === primarySelectedId) ?? null,
    [widgets, primarySelectedId],
  );
  const multiSelectCount = selectedIds.size;

  const effectiveLinkage = useMemo(
    () => mergeLayoutFilterLinkage(widgets, linkage),
    [widgets, linkage],
  );

  const widgetActionTarget = useMemo(
    () =>
      widgetActionDialog
        ? (widgets.find((item) => item.id === widgetActionDialog.widgetId) ?? null)
        : null,
    [widgetActionDialog, widgets],
  );

  const widgetActionChartConfig = useMemo((): ChartViewConfig | null => {
    if (!widgetActionTarget || widgetActionTarget.type !== "chart" || !widgetActionTarget.chartConfig) {
      return null;
    }
    return { ...widgetActionTarget.chartConfig, chartId: widgetActionTarget.id };
  }, [widgetActionTarget]);

  const widgetActionFilterParams = useMemo(() => {
    if (!widgetActionTarget || widgetActionTarget.type !== "chart") return undefined;
    return buildWidgetFilterParams(widgetActionTarget.id, effectiveLinkage, filterValues);
  }, [widgetActionTarget, effectiveLinkage, filterValues]);

  const widgetActionExecuteKey = useMemo(() => {
    if (!widgetActionTarget) return undefined;
    return JSON.stringify({
      filters: filterValues,
      refresh: chartRefreshKeys[widgetActionTarget.id] ?? 0,
    });
  }, [widgetActionTarget, filterValues, chartRefreshKeys]);

  const closeWidgetActionDialog = useCallback((open: boolean) => {
    if (!open) setWidgetActionDialog(null);
  }, []);

  const appendWidget = (type: PaletteInsertType, at?: GridInsertAt) => {
    if (missing || !canSave) return;
    const tabsHost =
      selectedWidget?.type === "tabs" && selectedWidget.tabsConfig && type !== "tabs"
        ? selectedWidget
        : null;
    if (layout.version === 2) {
      const nextLayout = insertPixelPaletteWidget(type, layout, pixelViewport);
      const draft = nextLayout.widgets.find(
        (item) => !layout.widgets.some((widget) => widget.id === item.id),
      );
      if (!draft) return;
      if (tabsHost?.tabsConfig) {
        const withParent: PixelLayoutWidget = {
          ...draft,
          parentTabsId: tabsHost.id,
          tabPaneId: tabsHost.tabsConfig.activePaneId,
        };
        const withParentWidgets = nextLayout.widgets.map((item) =>
          item.id === draft.id ? withParent : item,
        );
        const legacyUpdated = appendWidgetToTabPane(
          withParentWidgets.map(pixelWidgetToLayoutWidget),
          tabsHost.id,
          tabsHost.tabsConfig.activePaneId,
          draft.id,
        );
        setPixelLayout({
          ...nextLayout,
          widgets: withParentWidgets.map((item) => {
            if (item.id === tabsHost.id) {
              const legacy = legacyUpdated.find((widget) => widget.id === tabsHost.id)!;
              return mergeLayoutWidgetIntoPixel(item, legacy);
            }
            return item.id === draft.id ? withParent : item;
          }),
        });
      } else {
        setPixelLayout(nextLayout);
      }
      handleSelect(draft.id, false);
      if (draft.type === "filter" && draft.filterConfig) {
        setFilterValues((previous) => ({
          ...previous,
          [draft.filterConfig!.filterId]: draft.filterConfig!.defaultValue ?? "",
        }));
      }
      return;
    }
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

  const appendClonedWidget = (widget: LayoutWidget, sourcePixel?: PixelLayoutWidget) => {
    if (missing || !canSave) return;
    if (layout.version === 2) {
      const nextLayout = insertClonedPixelWidget(widget, layout, pixelViewport, sourcePixel);
      const draft = nextLayout.widgets.find((item) => item.id === widget.id);
      if (!draft) return;
      setPixelLayout(nextLayout);
      handleSelect(draft.id, false);
      return;
    }
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

  const handlePaletteDrop = (type: PaletteDragPayload, point: { x: number; y: number }) => {
    if (missing || !canSave || layout.version !== 2) return;
    const nextLayout = insertPixelPaletteWidgetAt(type, layout, point);
    const draft = nextLayout.widgets.find(
      (item) => !layout.widgets.some((widget) => widget.id === item.id),
    );
    if (!draft) return;
    setPixelLayout(nextLayout);
    handleSelect(draft.id, false);
    if (draft.type === "filter" && draft.filterConfig) {
      setFilterValues((previous) => ({
        ...previous,
        [draft.filterConfig!.filterId]: draft.filterConfig!.defaultValue ?? "",
      }));
    }
  };

  const handleFilterValueChange = (filterId: string, value: string) => {
    if (mode === "edit" && !canSave) return;
    setFilterValues((prev) => ({ ...prev, [filterId]: value }));
  };

  const handleChartDataRefresh = useCallback((widgetId: string) => {
    setChartRefreshKeys((prev) => ({ ...prev, [widgetId]: (prev[widgetId] ?? 0) + 1 }));
  }, []);

  const handleDeleteWidget = (widgetId: string) => {
    if (!canSave) return;
    setWidgets((prev) => prev.filter((w) => w.id !== widgetId));
    removeFromSelection([widgetId]);
  };

  const handleCopyWidget = useCallback(
    (widgetId: string) => {
      if (!canSave) return;
      const source = widgets.find((w) => w.id === widgetId);
      if (!source) return;
      const sourcePixel =
        layout.version === 2 ? layout.widgets.find((w) => w.id === widgetId) : undefined;
      appendClonedWidget(cloneLayoutWidget(source, widgets), sourcePixel);
    },
    [canSave, widgets, layout, appendClonedWidget],
  );

  const openWidgetViewDataDialog = useCallback((widgetId: string) => {
    const target = widgets.find((item) => item.id === widgetId);
    if (target?.type !== "chart") return;
    setWidgetActionDialog({ type: "view-data", widgetId });
  }, [widgets]);

  const openWidgetEnlargeDialog = useCallback((widgetId: string) => {
    const target = widgets.find((item) => item.id === widgetId);
    if (target?.type !== "chart") return;
    setWidgetActionDialog({ type: "enlarge", widgetId });
  }, [widgets]);

  const pixelWidgetActions = useMemo<PixelWidgetActions>(
    () => ({
      onCopy: handleCopyWidget,
      onDelete: handleDeleteWidget,
      onEnlarge: openWidgetEnlargeDialog,
      onViewData: openWidgetViewDataDialog,
    }),
    [handleCopyWidget, handleDeleteWidget, openWidgetEnlargeDialog, openWidgetViewDataDialog],
  );

  const handleBatchDelete = () => {
    if (!canSave) return;
    const ids = [...selectedIds];
    setWidgets((prev) => prev.filter((w) => !selectedIds.has(w.id)));
    removeFromSelection(ids);
    setBatchDeleteOpen(false);
  };

  const handleDeleteDashboard = async () => {
    if (!canSave) return;
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
    if (!id || missing || !canSave) return false;
    setSaving(true);
    setError(null);
    try {
      const normalizedLayout = buildDashboardLayoutForSave(layout, styleConfig);
      const normalized =
        normalizedLayout.version === 1
          ? normalizedLayout.widgets
          : normalizedLayout.widgets.map(pixelWidgetToLayoutWidget);
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
          layoutJson: normalizedLayout,
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

      resetLayout(normalizedLayout);
      setSavedFingerprint(
        dashboardPersistFingerprint(normalizedLayout, styleConfig, pixelEnabled),
      );
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
      <Button asChild variant="ghost" size="sm">
        <Link to="/admin/dashboards">
          <ChevronLeft className="size-4" aria-hidden />
          <span className="hidden sm:inline">返回</span>
        </Link>
      </Button>

      {!missing ? (
        <>
          <span
            className="hidden h-5 w-px shrink-0 bg-gray-200 dark:bg-gray-700 sm:block"
            aria-hidden
          />
          {mode === "edit" ? (
            <>
              <Button asChild variant="outline" size="sm">
                <Link to={`/admin/dashboards/${id}`}>预览</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to={`/admin/dashboards/${id}/share`}>分享</Link>
              </Button>
            </>
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link to={`/admin/dashboards/${id}/edit`}>编辑布局</Link>
            </Button>
          )}
        </>
      ) : null}

      {mode === "edit" && canSave && !missing ? (
        <>
          <span
            className="hidden h-5 w-px shrink-0 bg-gray-200 dark:bg-gray-700 sm:block"
            aria-hidden
          />
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={saving || !isDirty}
            onClick={() => void handleSave()}
          >
            {saving ? "保存中…" : "保存"}
          </Button>
          <IconButton
            type="button"
            variant="outline"
            size="sm"
            aria-label="删除看板"
            disabled={deleting}
            className="border-error-200 text-error-600 hover:border-error-300 hover:bg-error-50 hover:text-error-700 dark:border-error-500/30 dark:text-error-400 dark:hover:border-error-500/50 dark:hover:bg-error-500/10"
            onClick={() => setDeleteDashboardOpen(true)}
          >
            <Trash2 className="size-4" aria-hidden />
          </IconButton>
        </>
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
    mode === "edit" && !missing && canSave ? (
      <DashboardInlineTitle value={name} onChange={setName} />
    ) : (
      name || "Dashboard"
    );

  const titleUnwrapped = mode === "edit" && !missing && canSave;

  return (
    <AdminPageShell
      layout="fill"
      title={pageTitle}
      titleUnwrapped={titleUnwrapped}
      description={
        mode === "edit"
          ? !canSave
            ? "像素布局只读 · 当前回退开关禁止修改与保存"
            : isDirty
              ? "有未保存的更改 · 保存后生效"
              : "已保存 · 点击标题可重命名"
          : "预览模式 · 筛选器变更会刷新关联图表"
      }
      actions={headerActions}
    >
      {error ? (
        <PageErrorBanner
          message={error}
          onDismiss={() => setError(null)}
          onRetry={() => {
            if (error.includes("数据源")) setError(null);
            else void load({ force: true });
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

      {mode === "edit" && canSave ? (
        <>
        <DashboardEditWorkspace
          widgetCount={widgets.length}
          multiSelectCount={multiSelectCount}
          canvasEngine={editor === "pixel" ? "pixel" : "grid"}
          chartRailOpen={chartRailOpen}
          onChartRailOpenChange={setChartRailOpen}
          chartRailLabel="仪表板配置"
          showRailFoldHeader={!primarySelectedId && multiSelectCount < 2}
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
              <span className="hidden text-theme-xs text-gray-400 sm:inline">
                {layout.version === 2 ? "1440px 画布" : "12 列"}
              </span>
            </div>
          }
          onPaletteInsert={handleInsert}
          onOpenReuse={() => setReuseOpen(true)}
          onOpenDashboardStyle={() => {
            clearSelection();
            setLinkagePanelOpen(false);
            setChartRailOpen(true);
          }}
          onOpenLinkage={() => {
            clearSelection();
            setLinkagePanelOpen(true);
            setChartRailOpen(true);
          }}
          canvas={
            <DashboardEditCanvas
              mode="edit"
              editor={editor}
              layout={layout}
              widgets={widgets}
              selectedIds={selectedIds}
              linkage={effectiveLinkage}
              filterValues={filterValues}
              styleConfig={styleConfig}
              chartRefreshKeys={chartRefreshKeys}
              setWidgets={setWidgets}
              setPixelLayout={setPixelLayout}
              onSelect={(widgetId, additive) => {
                setLinkagePanelOpen(false);
                if (
                  widgets.find((w) => w.id === widgetId && w.type === "chart")
                ) {
                  setChartRailOpen(true);
                }
                handleSelect(widgetId, additive);
              }}
              onNestedSelect={(widgetId, additive) => {
                setLinkagePanelOpen(false);
                setChartRailOpen(true);
                handleSelect(widgetId, additive);
              }}
              onClearSelection={() => {
                clearSelection();
                setLinkagePanelOpen(false);
              }}
              onDeleteWidget={handleDeleteWidget}
              onFilterValueChange={handleFilterValueChange}
              onDropInsert={handleDropInsert}
              onPaletteDrop={handlePaletteDrop}
              onViewportChange={setPixelViewport}
              widgetActions={layout.version === 2 && canSave ? pixelWidgetActions : undefined}
            />
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
              <TextEditRail
                widget={
                  selectedWidget as typeof selectedWidget & { textConfig: TextWidgetConfig }
                }
                onTitleChange={(title) => {
                  if (!primarySelectedId) return;
                  setWidgets((prev) =>
                    prev.map((w) => (w.id === primarySelectedId ? { ...w, title } : w)),
                  );
                }}
                onConfigChange={(textConfig) => {
                  if (!primarySelectedId) return;
                  setWidgets((prev) =>
                    prev.map((w) => (w.id === primarySelectedId ? { ...w, textConfig } : w)),
                  );
                }}
                onDelete={() => handleDeleteWidget(primarySelectedId!)}
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
                onDataRefresh={() => primarySelectedId && handleChartDataRefresh(primarySelectedId)}
                onOpenLinkage={() => {
                  clearSelection();
                  setLinkagePanelOpen(true);
                  setChartRailOpen(true);
                }}
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
                styleConfig={styleConfig}
                onStyleChange={setStyleConfig}
                onSave={() => void handleSave()}
                isPixelLayout={layout.version === 2}
              />
            ) : null
          }
        />
        <ReuseWidgetDialog
          open={reuseOpen}
          onOpenChange={setReuseOpen}
          currentDashboardId={id}
          widgets={widgets}
          targetPixelWidgets={layout.version === 2 ? layout.widgets : undefined}
          onInsertCloned={appendClonedWidget}
        />
        {widgetActionDialog?.type === "view-data" &&
          widgetActionTarget &&
          widgetActionChartConfig && (
            <WidgetViewDataDialog
              open
              onOpenChange={closeWidgetActionDialog}
              title={widgetActionTarget.title}
              chartConfig={widgetActionChartConfig}
              filterParameters={widgetActionFilterParams}
              executeKey={widgetActionExecuteKey}
            />
          )}
        {widgetActionDialog?.type === "enlarge" &&
          widgetActionTarget &&
          widgetActionChartConfig && (
            <WidgetEnlargeDialog
              open
              onOpenChange={closeWidgetActionDialog}
              title={widgetActionTarget.title}
              chartConfig={widgetActionChartConfig}
              filterParameters={widgetActionFilterParams}
              executeKey={widgetActionExecuteKey}
              styleConfig={styleConfig}
            />
          )}
        </>
      ) : (
        <DashboardEditCanvas
          mode={mode}
          editor={editor}
          layout={layout}
          widgets={widgets}
          selectedIds={selectedIds}
          linkage={effectiveLinkage}
          filterValues={filterValues}
          styleConfig={styleConfig}
          setWidgets={setWidgets}
          setPixelLayout={setPixelLayout}
          onSelect={handleSelect}
          onNestedSelect={handleSelect}
          onClearSelection={clearSelection}
          onDeleteWidget={handleDeleteWidget}
          onFilterValueChange={handleFilterValueChange}
          onDropInsert={handleDropInsert}
          onPaletteDrop={handlePaletteDrop}
          onViewportChange={setPixelViewport}
        />
      )}
      {mode === "edit" && canSave ? (
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
      {mode === "edit" && canSave ? (
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
      {mode === "edit" && canSave ? (
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
