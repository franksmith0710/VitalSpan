import { useCallback, useEffect, useMemo, useRef, useState, type SetStateAction } from "react";
import { setChartAnimationSuppressed } from "@/components/charts/engine/d3/core/animate";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { ChevronLeft, Redo2, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { isDashboardNotFound, mapApiError } from "@/lib/apiError";
import { isDataScreenAdminPath, dataScreenListPath, dataScreenPreviewPath, dashboardSharePath, ensureDataScreenStyleConfig, isDataScreenLayout } from "@/lib/dataScreenLayout";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { GlobalFilterBar } from "@/components/dashboard/GlobalFilterBar";
import { PageErrorBanner } from "@/components/ui/page-error-banner";
import {
  buildWidgetFilterParams,
  mergeLayoutFilterLinkage,
  sanitizeLinkageForSave,
  type Linkage,
} from "@/components/dashboard/dashboardFilterUtils";
import {
  appendWidgetToTabPane,
  coerceLayoutWidgets,
  isTabPaneChild,
  moveWidgetToExtreme,
  resizeWidget,
  sortWidgets,
  type DashboardLayout,
  type DashboardLayoutV2,
  type DashboardStyleConfig,
  type FilterWidgetConfig,
  type LayoutWidget,
  type MediaWidgetConfig,
  type PixelLayoutWidget,
  type TabsWidgetConfig,
  type TextWidgetConfig,
} from "@/components/dashboard/layoutUtils";
import {
  isPixelCanvasEnabled,
  pixelWidgetToLayoutWidget,
  prepareDashboardLayout,
} from "@/components/dashboard/dashboardCanvasMode";
import {
  insertClonedPixelWidget,
  insertPixelPaletteWidget,
  insertPixelPaletteWidgetAt,
  insertPaletteWidgetIntoTabHost,
  type PixelRect,
} from "@/components/dashboard/pixelCanvas";
import { TAB_PALETTE_DROP_BUFFER_PX } from "@/components/dashboard/pixelCanvas/tabPaletteDrop";
import {
  activePaneIdForTabHost,
  resolveTabPaletteInsertHost,
  type TabInsertIntent,
} from "@/components/dashboard/pixelCanvas/tabInsertResolver";
import { preservePixelCanvasHostScroll } from "@/components/dashboard/pixelCanvas/preserveCanvasHostScroll";
import { clampPixelLayoutToCanvasBounds } from "@/components/dashboard/pixelCanvas/layoutSanitize";
import { unparkPixelWidgetFromTab } from "@/components/dashboard/pixelCanvas/tabParking";
import {
  editorDirtySnapshot,
  editorResetBaselineSnapshot,
  hydrateDashboardStyle,
  layoutForEditorAfterPersist,
  persistDashboardLayout,
  preparePixelLayoutForDisplay,
  syncPixelLayoutChartStyles,
} from "@/components/dashboard/stylePipeline";
import { resolvePixelGutter } from "@/components/dashboard/dashboardStyleConfig";
import { resolveDashboardChrome } from "@/components/dashboard/dashboardChromeConfig";
import {
  compactPixelLayoutForGapChange,
  compactPixelLayoutOuterRects,
} from "@/components/dashboard/pixelCanvas/gapCompaction";
import { hasPositiveOuterGaps } from "@/components/dashboard/gapRuntimeProbe";
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
  createLinkedLayoutWidget,
  createPaletteWidget,
  type PaletteInsertType,
} from "@/components/dashboard/createLayoutWidget";
import type { PaletteDragPayload } from "@/lib/dashboardDnd";
import { readTabsWidgetIdFromDropEvent } from "@/lib/tabsDropTarget";
import { cn } from "@/lib/utils";
import { DashboardContextInspector } from "@/components/dashboard/DashboardContextInspector";
import { DashboardTemplateExtras } from "@/components/dashboard/DashboardTemplateExtras";
import { LayerPanel } from "@/components/dashboard/LayerPanel";
import { DashboardEditWorkspace } from "@/components/dashboard/DashboardEditWorkspace";
import { DASHBOARD_EDIT_RAIL_SCROLL_CLASS } from "@/components/dashboard/dashboardEditRailLayout";
import { DashboardEditCanvas } from "@/components/dashboard/dashboard-edit/DashboardEditCanvas";
import { ChartDrillProvider } from "@/components/charts/ChartDrillContext";
import { ChartEditRail, ChartEditRailEmpty } from "@/components/dashboard/ChartEditRail";
import { FilterWidgetInspector } from "@/components/dashboard/FilterWidgetInspector";
import { TextEditRail } from "@/components/dashboard/TextEditRail";
import { ScreenVisualEditRail } from "@/components/dashboard/screen/ScreenVisualEditRail";
import { DataScreenConfigExtras } from "@/components/dashboard/screen/DataScreenConfigExtras";
import { isScreenVisualWidget } from "@/lib/screenVisualAssets";
import {
  clampDataScreenCanvasSize,
} from "@/lib/surfacePreset";
import type { PresentationMode } from "@/components/dashboard/screen/presentationScale";
import { DATA_SCREEN_EDIT_PRESENTATION_DEFAULT } from "@/components/dashboard/screen/presentationScale";
import { MediaEditRail } from "@/components/dashboard/MediaEditRail";
import { TabsEditRail } from "@/components/dashboard/TabsEditRail";
import { VizReuseDialog } from "@/components/dashboard/VizReuseDialog";
import { PublishVizComponentDialog } from "@/components/dashboard/PublishVizComponentDialog";
import { VizComponentInspectorHeader } from "@/components/dashboard/VizComponentInspectorHeader";
import { useVizComponentMap } from "@/hooks/useVizComponentMap";
import { useVizComponentInspectorActions } from "@/hooks/useVizComponentInspectorActions";
import { resolveLayoutWidget, resolveLayoutWidgets } from "@/lib/resolveVizComponent";
import { isPublishableWidgetType } from "@/lib/vizComponentEdit";
import { fetchVizComponent } from "@/lib/vizComponents";
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

function linkageSnapshot(widgets: LayoutWidget[], linkage: Linkage | null): string {
  return JSON.stringify(mergeLayoutFilterLinkage(widgets, linkage));
}

export function DashboardEditPage({ mode }: DashboardEditPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const routeIsDataScreen = isDataScreenAdminPath(location.pathname);

  useEffect(() => {
    if (mode !== "edit") return undefined;
    setChartAnimationSuppressed(true);
    return () => setChartAnimationSuppressed(false);
  }, [mode]);

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
  const { componentMap, refetch: refetchComponents } = useVizComponentMap(widgets);
  const [loading, setLoading] = useState(true);
  const isDataScreenSurface = useMemo(() => {
    if (!loading && layout) {
      return isDataScreenLayout(layout);
    }
    return routeIsDataScreen;
  }, [layout, loading, routeIsDataScreen]);
  const listPath = isDataScreenSurface ? dataScreenListPath() : "/admin/dashboards";
  const routeBase = isDataScreenSurface ? "/admin/data-screens" : "/admin/dashboards";
  const sharePath = id ? dashboardSharePath(id, isDataScreenSurface) : "/admin/dashboards";
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
  const [savedLinkageSnapshot, setSavedLinkageSnapshot] = useState<string | null>(null);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [styleConfig, setStyleConfig] = useState<DashboardStyleConfig>({});
  const [reuseOpen, setReuseOpen] = useState(false);
  const [publishComponentOpen, setPublishComponentOpen] = useState(false);
  const [chartRailOpen, setChartRailOpen] = useState(true);
  const [chartRefreshKeys, setChartRefreshKeys] = useState<Record<string, number>>({});
  const pixelViewportRef = useRef<PixelRect | undefined>(undefined);
  const handlePixelViewportChange = useCallback((viewport: PixelRect) => {
    pixelViewportRef.current = viewport;
  }, []);
  const [widgetActionDialog, setWidgetActionDialog] = useState<{
    type: "view-data" | "enlarge";
    widgetId: string;
  } | null>(null);

  const layoutRef = useRef(layout);
  const styleConfigRef = useRef(styleConfig);
  const nameRef = useRef(name);
  const linkageRef = useRef(linkage);
  const widgetsRef = useRef(widgets);
  layoutRef.current = layout;
  styleConfigRef.current = styleConfig;
  nameRef.current = name;
  linkageRef.current = linkage;
  widgetsRef.current = widgets;

  const applyName = useCallback((value: SetStateAction<string>) => {
    setName((prev) => {
      const next = typeof value === "function" ? value(prev) : value;
      nameRef.current = next;
      return next;
    });
  }, []);

  const applyStyleConfig = useCallback((value: SetStateAction<DashboardStyleConfig>) => {
    const prev = styleConfigRef.current;
    const raw = typeof value === "function" ? value(prev) : value;
    const next = hydrateDashboardStyle(raw);
    styleConfigRef.current = next;
    setStyleConfig(next);

    const currentLayout = layoutRef.current;
    if (currentLayout.version === 2 && currentLayout.widgets.length > 0) {
      const prevGap = resolvePixelGutter(prev);
      const nextGap = resolvePixelGutter(next);
      // 仅间隙配置变更时收紧外框；避免切换字体/网格等无关项反复 compact + toast
      if (prevGap !== nextGap) {
        const shouldCompact =
          nextGap < prevGap ||
          (nextGap === 0 && hasPositiveOuterGaps(currentLayout.widgets));
        if (shouldCompact) {
          const result =
            nextGap === 0
              ? compactPixelLayoutOuterRects(currentLayout)
              : compactPixelLayoutForGapChange(currentLayout, prevGap, nextGap);
          if (result.compacted) {
            setPixelLayout(result.layout);
          }
        }
      }
    }
  }, [setPixelLayout]);

  const applyLinkage = useCallback((value: SetStateAction<Linkage | null>) => {
    setLinkage((prev) => {
      const next = typeof value === "function" ? value(prev) : value;
      linkageRef.current = next;
      return next;
    });
  }, []);

  const loadGenerationRef = useRef(0);
  const hydratedRef = useRef(false);
  const isDirtyRef = useRef(false);

  const leaveEditShell = useCallback(() => {
    // 先清脏标记，避免离开守卫/二次操作卡在僵尸编辑态
    setMissing(true);
    resetLayout({ version: 1, widgets: [], globalFilters: [] });
    setSavedFingerprint(null);
    setSavedName("");
    setSavedLinkageSnapshot(null);
    setDeleteDashboardOpen(false);
    navigate(listPath, { replace: true });
  }, [navigate, resetLayout, listPath]);

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
      nameRef.current = data.name;
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
      const hydratedStyle = hydrateDashboardStyle(prepared.layout.styleConfig);
      let layoutForEditor: typeof prepared.layout = {
        ...prepared.layout,
        styleConfig: hydratedStyle,
      };
      if (layoutForEditor.version === 2) {
        layoutForEditor = syncPixelLayoutChartStyles(
          layoutForEditor,
          hydratedStyle.colorScheme ?? "light",
        );
        layoutForEditor = preparePixelLayoutForDisplay(layoutForEditor, hydratedStyle);
      }
      resetLayout(layoutForEditor);
      setStyleConfig(hydratedStyle);
      styleConfigRef.current = hydratedStyle;
      const loadSnapshot = editorResetBaselineSnapshot(
        layoutForEditor,
        hydratedStyle,
        mode === "edit" ? pixelEnabled : false,
      );
      setSavedFingerprint(loadSnapshot.fingerprint);
      setSavedLinkageSnapshot(linkageSnapshot(loadSnapshot.widgets, loadedLinkage));
      setLinkage(loadedLinkage);
      linkageRef.current = loadedLinkage;
      pixelViewportRef.current = undefined;
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
    const effectiveStyle = ensureDataScreenStyleConfig(styleConfig, isDataScreenSurface);
    const snapshot = editorDirtySnapshot(layout, effectiveStyle, pixelEnabled);
    return (
      snapshot.fingerprint !== savedFingerprint ||
      name.trim() !== savedName ||
      (savedLinkageSnapshot !== null &&
        linkageSnapshot(snapshot.widgets, linkage) !== savedLinkageSnapshot)
    );
  }, [
    missing,
    savedFingerprint,
    savedLinkageSnapshot,
    layout,
    styleConfig,
    pixelEnabled,
    name,
    savedName,
    linkage,
    isDataScreenSurface,
  ]);

  isDirtyRef.current = isDirty;

  const { leaveDialogOpen, confirmLeave, cancelLeave } = useUnsavedLeaveGuard({
    enabled: mode === "edit" && canSave && isDirty && !missing,
  });

  const selectedWidget = useMemo(
    () => widgets.find((w) => w.id === primarySelectedId) ?? null,
    [widgets, primarySelectedId],
  );
  const resolvedSelectedWidget = useMemo(
    () => (selectedWidget ? resolveLayoutWidget(selectedWidget, componentMap) : null),
    [selectedWidget, componentMap],
  );
  const resolvedWidgets = useMemo(
    () => resolveLayoutWidgets(widgets, componentMap),
    [widgets, componentMap],
  );
  const vizInspectorActions = useVizComponentInspectorActions({
    primarySelectedId,
    selectedWidget,
    resolvedSelectedWidget,
    componentMap,
    setWidgets,
    refetchComponents,
  });
  const inspectorWidget = resolvedSelectedWidget ?? selectedWidget;
  const multiSelectCount = selectedIds.size;
  const canPublishSelected =
    multiSelectCount < 2 &&
    Boolean(selectedWidget && isPublishableWidgetType(selectedWidget.type));
  const vizComponentHeader =
    selectedWidget && isPublishableWidgetType(selectedWidget.type) ? (
      <VizComponentInspectorHeader
        widget={selectedWidget}
        resolvedWidget={resolvedSelectedWidget ?? selectedWidget}
        componentMap={componentMap}
        onDetach={vizInspectorActions.detach}
        onRelink={vizInspectorActions.relink}
        onPublish={() => setPublishComponentOpen(true)}
        onPushToLibrary={() => void vizInspectorActions.pushToLibrary()}
        pushing={vizInspectorActions.pushing}
      />
    ) : null;

  const collapseChartRail = useCallback(() => setChartRailOpen(false), []);

  const selectWidgetOnCanvas = useCallback(
    (widgetId: string, additive: boolean) => {
      preservePixelCanvasHostScroll(() => {
        const w = widgets.find((x) => x.id === widgetId);
        if (
          w &&
          (w.type === "chart" ||
            w.type === "media" ||
            w.type === "tabs" ||
            w.type === "filter" ||
            w.type === "text")
        ) {
          setChartRailOpen(true);
        }
        handleSelect(widgetId, additive);
      });
    },
    [handleSelect, widgets],
  );

  const selectNestedWidgetOnCanvas = useCallback(
    (widgetId: string, additive: boolean) => {
      preservePixelCanvasHostScroll(() => {
        setChartRailOpen(true);
        handleSelect(widgetId, false);
      });
    },
    [handleSelect],
  );

  const selectTabChildWidget = useCallback(
    (childId: string) => {
      preservePixelCanvasHostScroll(() => {
        setChartRailOpen(true);
        handleSelect(childId, false);
      });
    },
    [handleSelect],
  );

  const [tabInsertIntent, setTabInsertIntent] = useState<TabInsertIntent | null>(null);
  const [dataScreenEditPresentationMode, setDataScreenEditPresentationMode] =
    useState<PresentationMode>(DATA_SCREEN_EDIT_PRESENTATION_DEFAULT);

  /** 对标 DE：选中 Tab（或其子组件）即锁定投放意图 */
  useEffect(() => {
    if (selectedWidget?.type === "tabs" && selectedWidget.tabsConfig) {
      setTabInsertIntent({
        tabsWidgetId: selectedWidget.id,
        paneId: selectedWidget.tabsConfig.activePaneId,
      });
      return;
    }
    if (layout.version === 2 && selectedWidget?.id) {
      const pixelChild = layout.widgets.find((w) => w.id === selectedWidget.id);
      if (pixelChild?.parentTabsId && pixelChild.tabPaneId) {
        setTabInsertIntent({
          tabsWidgetId: pixelChild.parentTabsId,
          paneId: pixelChild.tabPaneId,
        });
        return;
      }
    }
    setTabInsertIntent(null);
  }, [
    layout,
    selectedWidget?.id,
    selectedWidget?.type,
    selectedWidget?.tabsConfig?.activePaneId,
    selectedWidget?.tabsConfig,
  ]);

  const openDashboardContext = useCallback(() => {
    clearSelection();
    setChartRailOpen(true);
  }, [clearSelection]);

  const effectiveLinkage = useMemo(
    () => mergeLayoutFilterLinkage(resolvedWidgets, linkage),
    [resolvedWidgets, linkage],
  );

  const widgetActionTarget = useMemo(
    () =>
      widgetActionDialog
        ? (resolvedWidgets.find((item) => item.id === widgetActionDialog.widgetId) ?? null)
        : null,
    [widgetActionDialog, resolvedWidgets],
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

  const commitPixelPaletteInsert = useCallback(
    (
      type: PaletteInsertType | PaletteDragPayload,
      options?: {
        point?: { x: number; y: number };
        tabsWidgetIdFromDom?: string | null;
        tabsWidgetId?: string | null;
      },
    ) => {
      if (missing || !canSave || layout.version !== 2) return;
      const insertType = type as PaletteInsertType;
      const tabsHost =
        insertType === "tabs"
          ? undefined
          : resolveTabPaletteInsertHost(layout, {
              tabsWidgetId: options?.tabsWidgetIdFromDom ?? options?.tabsWidgetId,
              point: options?.point,
              selectedWidgetId: primarySelectedId,
              intent: tabInsertIntent,
              dropBufferPx: TAB_PALETTE_DROP_BUFFER_PX,
            });
      let nextLayout: DashboardLayoutV2;
      if (tabsHost?.tabsConfig) {
        const paneId = activePaneIdForTabHost(
          tabsHost,
          tabInsertIntent,
          layout.widgets.find((w) => w.id === primarySelectedId),
        );
        nextLayout = insertPaletteWidgetIntoTabHost(insertType, layout, tabsHost, paneId);
      } else {
        nextLayout = options?.point
          ? insertPixelPaletteWidgetAt(insertType, layout, options.point)
          : insertPixelPaletteWidget(insertType, layout, pixelViewportRef.current);
      }
      const draft = nextLayout.widgets.find(
        (item) => !layout.widgets.some((widget) => widget.id === item.id),
      );
      if (!draft) return;
      if (tabsHost?.tabsConfig) {
        preservePixelCanvasHostScroll(() => {
          setPixelLayout(nextLayout);
          handleSelect(tabsHost.id, false);
          setChartRailOpen(true);
        });
      } else {
        setPixelLayout(nextLayout);
        handleSelect(draft.id, false);
      }
      if (draft.type === "filter" && draft.filterConfig) {
        setFilterValues((previous) => ({
          ...previous,
          [draft.filterConfig!.filterId]: draft.filterConfig!.defaultValue ?? "",
        }));
      }
    },
    [
      canSave,
      handleSelect,
      layout,
      missing,
      primarySelectedId,
      setPixelLayout,
      tabInsertIntent,
    ],
  );

  const appendWidget = (type: PaletteInsertType, at?: GridInsertAt) => {
    if (missing || !canSave) return;
    if (layout.version === 2) {
      commitPixelPaletteInsert(
        type,
        tabInsertIntent && type !== "tabs"
          ? { tabsWidgetId: tabInsertIntent.tabsWidgetId }
          : undefined,
      );
      return;
    }
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

  const appendClonedWidget = (widget: LayoutWidget, sourcePixel?: PixelLayoutWidget) => {
    if (missing || !canSave) return;
    if (layout.version === 2) {
      const nextLayout = insertClonedPixelWidget(widget, layout, pixelViewportRef.current, sourcePixel);
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

  const appendClonedWidgetRef = useRef(appendClonedWidget);
  appendClonedWidgetRef.current = appendClonedWidget;
  const insertFromHubRef = useRef<string | null>(null);

  useEffect(() => {
    if (mode !== "edit" || loading || missing || !canSave) return;
    const componentId = new URLSearchParams(location.search).get("insertComponent");
    if (!componentId) {
      insertFromHubRef.current = null;
      return;
    }
    if (insertFromHubRef.current === componentId) return;
    insertFromHubRef.current = componentId;

    let cancelled = false;
    void (async () => {
      try {
        const detail = await fetchVizComponent(componentId);
        if (cancelled) return;
        const linked = createLinkedLayoutWidget(detail, widgetsRef.current);
        appendClonedWidgetRef.current(linked);
        refetchComponents();
        navigate(location.pathname, { replace: true });
        toast.success(`已插入组件「${detail.name}」`);
      } catch (err) {
        if (cancelled) return;
        toast.error(mapApiError(err));
        navigate(location.pathname, { replace: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mode, loading, missing, canSave, location.search, location.pathname, navigate, refetchComponents]);

  const handleInsert = (type: PaletteInsertType) => {
    appendWidget(type);
  };

  const handleDropInsert = (type: PaletteInsertType, at: GridInsertAt) => {
    appendWidget(type, at);
  };

  const handlePaletteDrop = (
    type: PaletteDragPayload,
    point: { x: number; y: number },
    sourceEvent?: DragEvent,
  ) => {
    const tabsWidgetIdFromDom = sourceEvent ? readTabsWidgetIdFromDropEvent(sourceEvent) : null;
    commitPixelPaletteInsert(type, { point, tabsWidgetIdFromDom });
  };

  const handleTabPaletteDrop = useCallback(
    (tabsWidgetId: string, type: PaletteDragPayload) => {
      commitPixelPaletteInsert(type, { tabsWidgetId });
    },
    [commitPixelPaletteInsert],
  );

  const handleTabChildUnpark = useCallback(
    (widgetId: string, point: PixelPoint) => {
      if (missing || !canSave || layout.version !== 2) return;
      preservePixelCanvasHostScroll(() => {
        const next = unparkPixelWidgetFromTab(layout, widgetId, point);
        setPixelLayout(next);
        handleSelect(widgetId, false);
        setChartRailOpen(true);
      });
    },
    [canSave, handleSelect, layout, missing, setPixelLayout],
  );

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
      onTitleChange: (widgetId, title) => {
        setWidgets((prev) => resizeWidget(prev, widgetId, { title }));
      },
      showLayerActions: isDataScreenSurface,
      onBringToFront: isDataScreenSurface
        ? (widgetId) => setWidgets((prev) => moveWidgetToExtreme(prev, widgetId, "top"))
        : undefined,
      onSendToBack: isDataScreenSurface
        ? (widgetId) => setWidgets((prev) => moveWidgetToExtreme(prev, widgetId, "bottom"))
        : undefined,
    }),
    [
      handleCopyWidget,
      handleDeleteWidget,
      openWidgetEnlargeDialog,
      openWidgetViewDataDialog,
      setWidgets,
      isDataScreenSurface,
    ],
  );

  const handleBatchDelete = () => {
    if (!canSave) return;
    const ids = [...selectedIds];
    setWidgets((prev) => prev.filter((w) => !selectedIds.has(w.id)));
    removeFromSelection(ids);
    setBatchDeleteOpen(false);
  };

  const handleDataScreenCanvasSize = useCallback(
    (patch: { width?: number; height?: number }) => {
      const currentLayout = layoutRef.current;
      if (!canSave || currentLayout.version !== 2) return;
      const width = patch.width ?? currentLayout.canvas.width;
      const height = patch.height ?? currentLayout.canvas.height;
      const next = clampDataScreenCanvasSize(width, height);
      if (
        next.width === currentLayout.canvas.width &&
        next.height === currentLayout.canvas.height
      ) {
        return;
      }
      setPixelLayout(
        clampPixelLayoutToCanvasBounds({
          ...currentLayout,
          canvas: next,
        }),
      );
      if (next.width !== width || next.height !== height) {
        toast.message(`画布尺寸已调整为 ${next.width}×${next.height}（已钳制到允许范围）`);
      }
    },
    [canSave, setPixelLayout],
  );

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
    if (saving) {
      toast.message("正在保存中，请稍候…");
      return false;
    }
    const active = document.activeElement;
    if (active instanceof HTMLElement && active !== document.body) {
      active.blur();
    }

    const currentLayout = layoutRef.current;
    const currentStyle = ensureDataScreenStyleConfig(
      styleConfigRef.current,
      isDataScreenSurface,
    );
    const currentName = nameRef.current;
    const currentLinkage = linkageRef.current;

    setSaving(true);
    setError(null);
    try {
      const normalizedLayout = persistDashboardLayout(currentLayout, currentStyle);
      const normalized =
        normalizedLayout.version === 1
          ? normalizedLayout.widgets
          : normalizedLayout.widgets.map(pixelWidgetToLayoutWidget);
      const trimmedName = currentName.trim() || "未命名看板";

      if (trimmedName !== savedName) {
        await apiFetch(`/api/v1/dashboards/${id}`, {
          method: "PUT",
          body: JSON.stringify({ name: trimmedName }),
        });
        applyName(trimmedName);
        setSavedName(trimmedName);
      }

      await apiFetch(`/api/v1/dashboards/${id}/layout`, {
        method: "PUT",
        body: JSON.stringify({
          layoutJson: normalizedLayout,
        }),
      });

      const savedStyle = hydrateDashboardStyle(normalizedLayout.styleConfig);
      const layoutForEditor = layoutForEditorAfterPersist(normalizedLayout, savedStyle);
      resetLayout(layoutForEditor);
      setStyleConfig(savedStyle);
      styleConfigRef.current = savedStyle;
      const saveSnapshot = editorResetBaselineSnapshot(
        layoutForEditor,
        savedStyle,
        pixelEnabled,
      );
      setSavedFingerprint(saveSnapshot.fingerprint);

      const mergedLinkage = sanitizeLinkageForSave(
        normalized,
        mergeLayoutFilterLinkage(normalized, currentLinkage),
      );
      let nextLinkage = currentLinkage;
      if (mergedLinkage.filters.length > 0) {
        try {
          nextLinkage = await apiFetch<Linkage>(
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
          applyLinkage(nextLinkage);
        } catch (filterErr) {
          toast.error(`布局已保存，但筛选联动保存失败：${mapApiError(filterErr)}`);
          setSavedLinkageSnapshot(linkageSnapshot(saveSnapshot.widgets, currentLinkage));
          toast.success("看板布局已保存");
          return true;
        }
      }

      setSavedLinkageSnapshot(linkageSnapshot(saveSnapshot.widgets, nextLinkage));
      toast.success("看板已保存");
      return true;
    } catch (err) {
      if (isDashboardNotFound(err)) {
        toast.error(mapApiError(err));
        leaveEditShell();
        return false;
      }
      toast.error(mapApiError(err));
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
        <Link to={listPath}>
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
                <Link to={isDataScreenSurface && id ? dataScreenPreviewPath(id) : `${routeBase}/${id}`}>
                  预览
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to={sharePath}>分享</Link>
              </Button>
            </>
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link to={`${routeBase}/${id}/edit`}>编辑布局</Link>
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
      <AdminPageShell title="仪表板" description="加载中…">
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
            <Link to={listPath}>{isDataScreenSurface ? "返回大屏列表" : "返回看板列表"}</Link>
          </Button>
        </div>
      </AdminPageShell>
    );
  }

  const pageTitle =
    mode === "edit" && !missing && canSave ? (
      <DashboardInlineTitle value={name} onChange={applyName} />
    ) : (
      name || "仪表板"
    );

  const titleUnwrapped = mode === "edit" && !missing && canSave;

  return (
    <AdminPageShell
      layout="fill"
      title={pageTitle}
      titleUnwrapped={titleUnwrapped}
      onHeaderBlankPointerDown={
        mode === "edit" && canSave ? openDashboardContext : undefined
      }
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
          dashboardStyle={styleConfig}
        />
      ) : null}

      {mode === "edit" && canSave ? (
        <>
        <ChartDrillProvider>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardEditWorkspace
          widgetCount={widgets.length}
          multiSelectCount={multiSelectCount}
          canvasEngine={editor === "pixel" ? "pixel" : "grid"}
          canvasColorScheme={styleConfig.colorScheme ?? "light"}
          chartRailOpen={chartRailOpen}
          onChartRailOpenChange={setChartRailOpen}
          chartRailLabel={isDataScreenSurface ? "大屏配置" : "仪表板配置"}
          showRailFoldHeader={!primarySelectedId && multiSelectCount < 2}
          canvasActions={
            <div className="flex shrink-0 flex-wrap items-center gap-1">
              {multiSelectCount >= 2 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  className="border-error-200 text-error-600 hover:bg-error-50 dark:border-error-500/30 dark:text-error-400"
                  onClick={() => setBatchDeleteOpen(true)}
                >
                  删除选中 ({multiSelectCount})
                </Button>
              ) : null}
              <IconButton
                type="button"
                variant="ghost"
                size="xs"
                disabled={!canUndo}
                onClick={undo}
                tooltip="回退到上一步编辑 (Ctrl+Z)"
                aria-label="上一步"
              >
                <Undo2 aria-hidden />
              </IconButton>
              <IconButton
                type="button"
                variant="ghost"
                size="xs"
                disabled={!canRedo}
                onClick={redo}
                tooltip="前进到下一步编辑 (Ctrl+Shift+Z 或 Ctrl+Y)"
                aria-label="下一步"
              >
                <Redo2 aria-hidden />
              </IconButton>
              <span className="hidden text-theme-xs text-gray-400 sm:inline">
                {layout.version === 2
                  ? isDataScreenSurface
                    ? "1920px 画布"
                    : "1440px 画布"
                  : "12 列"}
              </span>
            </div>
          }
          onPaletteInsert={handleInsert}
          onOpenReuse={() => setReuseOpen(true)}
          onOpenPublishToLibrary={
            canPublishSelected ? () => setPublishComponentOpen(true) : undefined
          }
          publishToLibraryDisabled={!canPublishSelected}
          onOpenDashboardStyle={openDashboardContext}
          onActivateDashboardContext={openDashboardContext}
          showAuxiliaryGrid={resolveDashboardChrome(styleConfig).showAuxiliaryGrid}
          onAuxiliaryGridChange={(showAuxiliaryGrid) =>
            applyStyleConfig((prev) => ({
              ...prev,
              chrome: { ...prev.chrome, showAuxiliaryGrid },
            }))
          }
          showScreenVisualAssets={isDataScreenSurface}
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
              onSelect={selectWidgetOnCanvas}
              onNestedSelect={selectNestedWidgetOnCanvas}
              onClearSelection={openDashboardContext}
              onDeleteWidget={handleDeleteWidget}
              onFilterValueChange={handleFilterValueChange}
              onDropInsert={handleDropInsert}
              onPaletteDrop={handlePaletteDrop}
              onTabPaletteDrop={handleTabPaletteDrop}
              onTabChildUnpark={handleTabChildUnpark}
              onViewportChange={handlePixelViewportChange}
              tabInsertIntent={tabInsertIntent}
              onTabInsertIntentChange={setTabInsertIntent}
              widgetActions={layout.version === 2 && canSave ? pixelWidgetActions : undefined}
              dataScreenPresentationMode={dataScreenEditPresentationMode}
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
            ) : selectedWidget?.type === "filter" && inspectorWidget?.filterConfig ? (
              <div className="flex h-full min-h-0 flex-col overflow-hidden">
                {vizComponentHeader}
                <FilterWidgetInspector
                  embedded
                  widget={
                    inspectorWidget as typeof inspectorWidget & { filterConfig: FilterWidgetConfig }
                  }
                  onChange={(filterConfig) => {
                    void vizInspectorActions.applyPayloadChange(
                      { filterConfig },
                      { filterConfig },
                    );
                  }}
                  onRailCollapse={collapseChartRail}
                />
              </div>
            ) : selectedWidget?.type === "text" && inspectorWidget?.textConfig ? (
              isScreenVisualWidget(selectedWidget) ? (
                <div className="flex h-full min-h-0 flex-col overflow-hidden">
                  {vizComponentHeader}
                  <ScreenVisualEditRail
                    className="min-h-0 flex-1"
                    widget={
                      inspectorWidget as typeof inspectorWidget & { textConfig: TextWidgetConfig }
                    }
                    onTitleChange={(title) => {
                      if (!primarySelectedId) return;
                      setWidgets((prev) =>
                        prev.map((w) => (w.id === primarySelectedId ? { ...w, title } : w)),
                      );
                    }}
                    onTextConfigChange={(textConfig) => {
                      void vizInspectorActions.applyPayloadChange({ textConfig }, { textConfig });
                    }}
                    onDelete={() => handleDeleteWidget(primarySelectedId!)}
                    onRailCollapse={collapseChartRail}
                  />
                </div>
              ) : (
              <div className="flex h-full min-h-0 flex-col overflow-hidden">
                {vizComponentHeader}
              <TextEditRail
                className="min-h-0 flex-1"
                widget={
                  inspectorWidget as typeof inspectorWidget & { textConfig: TextWidgetConfig }
                }
                onTitleChange={(title) => {
                  if (!primarySelectedId) return;
                  setWidgets((prev) =>
                    prev.map((w) => (w.id === primarySelectedId ? { ...w, title } : w)),
                  );
                }}
                onConfigChange={(textConfig) => {
                  void vizInspectorActions.applyPayloadChange({ textConfig }, { textConfig });
                }}
                onDelete={() => handleDeleteWidget(primarySelectedId!)}
                onRailCollapse={collapseChartRail}
              />
              </div>
              )
            ) : selectedWidget?.type === "media" && inspectorWidget?.mediaConfig ? (
              <div className="flex h-full min-h-0 flex-col overflow-hidden">
                {vizComponentHeader}
              <MediaEditRail
                className="min-h-0 flex-1"
                widget={
                  inspectorWidget as typeof inspectorWidget & { mediaConfig: MediaWidgetConfig }
                }
                onChange={(mediaConfig) => {
                  void vizInspectorActions.applyPayloadChange({ mediaConfig }, { mediaConfig });
                }}
                onTitleChange={(title) => {
                  if (!primarySelectedId) return;
                  setWidgets((prev) =>
                    prev.map((w) => (w.id === primarySelectedId ? { ...w, title } : w)),
                  );
                }}
                onDelete={() => handleDeleteWidget(primarySelectedId!)}
                onRailCollapse={collapseChartRail}
              />
              </div>
            ) : selectedWidget?.type === "tabs" && selectedWidget.tabsConfig ? (
              <TabsEditRail
                widget={
                  selectedWidget as typeof selectedWidget & { tabsConfig: TabsWidgetConfig }
                }
                allWidgets={widgets}
                selectedChildId={
                  isTabPaneChild(widgets, selectedWidget.id, primarySelectedId)
                    ? primarySelectedId
                    : null
                }
                onChange={(tabsConfig) => {
                  if (!primarySelectedId) return;
                  setWidgets((prev) =>
                    prev.map((w) => (w.id === primarySelectedId ? { ...w, tabsConfig } : w)),
                  );
                }}
                onSelectChild={selectTabChildWidget}
                onTitleChange={(title) => {
                  if (!primarySelectedId) return;
                  setWidgets((prev) =>
                    prev.map((w) => (w.id === primarySelectedId ? { ...w, title } : w)),
                  );
                }}
                onDelete={() => handleDeleteWidget(primarySelectedId!)}
                onRailCollapse={collapseChartRail}
              />
            ) : selectedWidget?.type === "chart" ? (
              <div className="flex h-full min-h-0 flex-col overflow-hidden">
                {vizComponentHeader}
              <ChartEditRail
                key={primarySelectedId ?? selectedWidget.id}
                className="min-h-0 flex-1"
                widget={inspectorWidget}
                dashboardId={id}
                dashboardStyle={styleConfig}
                onTitleChange={(title) => {
                  if (!primarySelectedId) return;
                  setWidgets((prev) => resizeWidget(prev, primarySelectedId, { title }));
                }}
                onChange={(chartConfig) => {
                  void vizInspectorActions.applyPayloadChange({ chartConfig }, { chartConfig });
                }}
                onDelete={() => handleDeleteWidget(primarySelectedId!)}
                onDataRefresh={() => primarySelectedId && handleChartDataRefresh(primarySelectedId)}
              />
              </div>
            ) : id ? (
              <div className={cn(DASHBOARD_EDIT_RAIL_SCROLL_CLASS, "min-h-0 flex-1")}>
                {isDataScreenSurface && layout.version === 2 ? (
                  <DataScreenConfigExtras
                    layout={layout}
                    styleConfig={styleConfig}
                    widgets={widgets}
                    name={name}
                    canSave={canSave}
                    dashboardId={id}
                    presentationMode={dataScreenEditPresentationMode}
                    onPresentationModeChange={setDataScreenEditPresentationMode}
                    onCanvasSizeChange={handleDataScreenCanvasSize}
                  />
                ) : null}
                {isDataScreenSurface ? (
                  <LayerPanel
                    widgets={widgets}
                    selectedId={primarySelectedId}
                    onSelect={(widgetId) => selectWidgetOnCanvas(widgetId, false)}
                    onWidgetsChange={setWidgets}
                    className="shrink-0 border-b border-gray-100 pb-4 dark:border-white/[0.06]"
                  />
                ) : null}
                {!isDataScreenSurface ? (
                  <DashboardTemplateExtras
                    layout={layout}
                    styleConfig={styleConfig}
                    widgets={widgets}
                    name={name}
                    canSave={canSave}
                    dashboardId={id}
                  />
                ) : null}
                <DashboardContextInspector
                  embedded
                  widgetCount={widgets.length}
                  widgets={widgets}
                  styleConfig={styleConfig}
                  onStyleChange={applyStyleConfig}
                  onWidgetsChange={setWidgets}
                  isPixelLayout={layout.version === 2}
                  dashboardId={id}
                  linkage={linkage}
                  effectiveLinkage={effectiveLinkage}
                  onLinkageChange={applyLinkage}
                />
              </div>
            ) : null
          }
        />
        </div>
        <VizReuseDialog
          open={reuseOpen}
          onOpenChange={setReuseOpen}
          currentDashboardId={id}
          widgets={widgets}
          styleConfig={styleConfig}
          targetPixelWidgets={layout.version === 2 ? layout.widgets : undefined}
          onInsertCloned={appendClonedWidget}
        />
        <PublishVizComponentDialog
          open={publishComponentOpen}
          onOpenChange={setPublishComponentOpen}
          widget={selectedWidget}
          styleConfig={styleConfig}
          componentMap={componentMap}
          onPublished={(componentId) => {
            if (!primarySelectedId) return;
            setWidgets((prev) =>
              prev.map((w) =>
                w.id === primarySelectedId
                  ? {
                      ...w,
                      componentRef: { componentId },
                    }
                  : w,
              ),
            );
            void refetchComponents();
          }}
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
              widgetId={widgetActionTarget.id}
              title={widgetActionTarget.title}
              chartConfig={widgetActionChartConfig}
              filterParameters={widgetActionFilterParams}
              executeKey={widgetActionExecuteKey}
              styleConfig={styleConfig}
            />
          )}
        </ChartDrillProvider>
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
          onSelect={selectWidgetOnCanvas}
          onNestedSelect={selectNestedWidgetOnCanvas}
          onClearSelection={clearSelection}
          onDeleteWidget={handleDeleteWidget}
          onFilterValueChange={handleFilterValueChange}
          onDropInsert={handleDropInsert}
          onPaletteDrop={handlePaletteDrop}
              onTabPaletteDrop={handleTabPaletteDrop}
              onTabChildUnpark={handleTabChildUnpark}
              onViewportChange={handlePixelViewportChange}
              tabInsertIntent={tabInsertIntent}
              onTabInsertIntentChange={setTabInsertIntent}
              dataScreenPresentationMode={dataScreenEditPresentationMode}
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
