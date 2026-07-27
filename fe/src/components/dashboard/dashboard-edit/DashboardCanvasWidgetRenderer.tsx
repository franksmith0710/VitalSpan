import { memo, useCallback, useMemo, type ReactNode } from "react";
import { DashboardWidget } from "../DashboardWidget";
import {
  pixelWidgetToLayoutWidget,
  type DashboardWidgetShell,
} from "../dashboardCanvasMode";
import {
  buildWidgetFilterParams,
  type Linkage,
} from "../dashboardFilterUtils";
import {
  buildWidgetExecuteKey,
} from "../dashboardWidgetExecuteKey";
import type { DashboardStyleConfig } from "../dashboardStyleConfig";
import {
  resizeWidget,
  type LayoutWidget,
  type PixelLayoutWidget,
} from "../layoutUtils";
import { WidgetErrorBoundary } from "../WidgetErrorBoundary";
import type { PaletteDragPayload } from "@/lib/dashboardDnd";
import { useDashboardGridPlayer } from "../dashboardGridPlayerContext";
import { usePixelShapePlayer } from "../pixelCanvas/pixelShapePlayerContext";
import { preservePixelCanvasHostScroll } from "../pixelCanvas/preserveCanvasHostScroll";

export type DashboardWidgetsSetter = (
  update: LayoutWidget[] | ((previous: LayoutWidget[]) => LayoutWidget[]),
) => void;

export type RenderDashboardCanvasWidgetOptions = {
  shell?: DashboardWidgetShell;
  gridSize?: { w: number; h: number };
  nested?: boolean;
};

type DashboardCanvasWidgetRendererProps = {
  widget: LayoutWidget | PixelLayoutWidget;
  mode: "edit" | "view";
  selected: boolean;
  gridSize?: { w: number; h: number };
  linkage: Linkage;
  filterValues: Record<string, string>;
  onFilterValueChange: (filterId: string, value: string) => void;
  onSelect: (widgetId: string, additive: boolean) => void;
  onNestedSelect?: (widgetId: string, additive: boolean) => void;
  onDelete: (widgetId: string) => void;
  setWidgets: DashboardWidgetsSetter;
  nested?: boolean;
  shell?: DashboardWidgetShell;
  dashboardStyle?: DashboardStyleConfig;
  chartPaletteDefaults?: ReturnType<
    typeof import("../dashboardStyleConfig").pickChartPaletteDefaults
  >;
  allWidgets?: LayoutWidget[];
  styleRevision?: string;
  chartRefreshKeys?: Record<string, number>;
  onTabPaletteDrop?: (tabsWidgetId: string, type: PaletteDragPayload) => void;
  renderChild?: (
    widget: LayoutWidget,
    options?: RenderDashboardCanvasWidgetOptions,
  ) => ReactNode;
  componentMap?: import("@/lib/resolveVizComponent").VizComponentMap;
};

function asLayoutWidget(
  widget: LayoutWidget | PixelLayoutWidget,
): LayoutWidget {
  return "width" in widget
    ? pixelWidgetToLayoutWidget(widget)
    : widget;
}

function widgetContentEqual(
  prev: LayoutWidget | PixelLayoutWidget,
  next: LayoutWidget | PixelLayoutWidget,
): boolean {
  const a = asLayoutWidget(prev);
  const b = asLayoutWidget(next);
  if (a.id !== b.id || a.type !== b.type || a.title !== b.title) return false;
  if (a.chartConfig !== b.chartConfig) return false;
  if (a.componentRef !== b.componentRef) return false;
  if (a.textConfig !== b.textConfig) return false;
  if (a.tabsConfig !== b.tabsConfig) return false;
  if (a.filterConfig !== b.filterConfig) return false;
  if (a.mediaConfig !== b.mediaConfig) return false;
  if ("width" in prev && "width" in next) {
    if (prev.width !== next.width || prev.height !== next.height) return false;
  }
  return true;
}

function rendererPropsEqual(
  prev: DashboardCanvasWidgetRendererProps,
  next: DashboardCanvasWidgetRendererProps,
): boolean {
  if (prev.mode !== next.mode || prev.shell !== next.shell || prev.nested !== next.nested) {
    return false;
  }
  if (prev.selected !== next.selected) return false;
  if (prev.styleRevision !== next.styleRevision) return false;
  if (prev.dashboardStyle !== next.dashboardStyle) return false;
  if (prev.chartPaletteDefaults !== next.chartPaletteDefaults) return false;
  if (prev.componentMap !== next.componentMap) return false;
  if (prev.allWidgets !== next.allWidgets) return false;
  if (!widgetContentEqual(prev.widget, next.widget)) return false;
  if (prev.gridSize?.w !== next.gridSize?.w || prev.gridSize?.h !== next.gridSize?.h) {
    return false;
  }
  return true;
}

export const DashboardCanvasWidgetRenderer = memo(function DashboardCanvasWidgetRenderer({
  widget: sourceWidget,
  mode,
  selected,
  gridSize,
  linkage,
  filterValues,
  onFilterValueChange,
  onSelect,
  onNestedSelect = onSelect,
  onDelete,
  setWidgets,
  nested = false,
  shell = "grid",
  dashboardStyle,
  chartPaletteDefaults,
  allWidgets,
  styleRevision: _styleRevision,
  chartRefreshKeys,
  onTabPaletteDrop,
  renderChild,
  componentMap,
}: DashboardCanvasWidgetRendererProps) {
  const widget = asLayoutWidget(sourceWidget);
  const isShapePlaying = usePixelShapePlayer();
  const isGridPlaying = useDashboardGridPlayer();
  const hasPixelFootprint =
    "width" in sourceWidget &&
    !nested &&
    sourceWidget.width > 0 &&
    sourceWidget.height > 0;
  const pixelWidth = "width" in sourceWidget ? sourceWidget.width : 0;
  const pixelHeight = "height" in sourceWidget ? sourceWidget.height : 0;
  const pixelSize = useMemo(
    () =>
      hasPixelFootprint
        ? { width: pixelWidth, height: pixelHeight }
        : undefined,
    [hasPixelFootprint, pixelWidth, pixelHeight],
  );
  const effectiveGridSize =
    gridSize ??
    (nested ? { w: widget.colSpan, h: widget.rowSpan } : undefined);
  const filterParameters = useMemo(
    () =>
      widget.type === "chart"
        ? buildWidgetFilterParams(widget.id, linkage, filterValues)
        : undefined,
    [widget.id, widget.type, linkage, filterValues],
  );
  const executeKey = useMemo(
    () => buildWidgetExecuteKey(filterParameters, chartRefreshKeys?.[widget.id] ?? 0),
    [filterParameters, chartRefreshKeys, widget.id],
  );

  const updateWidget = useCallback(
    (widgetId: string, patch: Partial<LayoutWidget>) => {
      setWidgets((previous) =>
        previous.map((item) =>
          item.id === widgetId ? { ...item, ...patch } : item,
        ),
      );
    },
    [setWidgets],
  );

  const selectWidget = nested ? onNestedSelect : onSelect;

  const handleSelect = useCallback(
    (event: { shiftKey: boolean }) => {
      preservePixelCanvasHostScroll(() => selectWidget(widget.id, event.shiftKey));
    },
    [selectWidget, widget.id],
  );

  const handleTitleChange = useCallback(
    (widgetId: string, title: string) => {
      setWidgets((previous) => resizeWidget(previous, widgetId, { title }));
    },
    [setWidgets],
  );

  const handleChartConfigChange = useCallback(
    (widgetId: string, chartConfig: LayoutWidget["chartConfig"]) => {
      updateWidget(widgetId, { chartConfig });
    },
    [updateWidget],
  );

  const handleTabsConfigChange = useCallback(
    (widgetId: string, tabsConfig: NonNullable<LayoutWidget["tabsConfig"]>) => {
      updateWidget(widgetId, { tabsConfig });
    },
    [updateWidget],
  );

  const handleTextConfigChange = useCallback(
    (widgetId: string, textConfig: NonNullable<LayoutWidget["textConfig"]>) => {
      updateWidget(widgetId, { textConfig });
    },
    [updateWidget],
  );

  const renderNested = useCallback(
    (child: LayoutWidget) =>
      renderChild?.(child, { nested: true, shell: "shape" }) ?? null,
    [renderChild],
  );

  const handleTabPaletteDrop = useCallback(
    (payload: PaletteDragPayload) => {
      onTabPaletteDrop?.(widget.id, payload);
    },
    [onTabPaletteDrop, widget.id],
  );

  return (
    <WidgetErrorBoundary
      widgetTitle={widget.title}
      onDelete={mode === "edit" ? () => onDelete(widget.id) : undefined}
    >
      <DashboardWidget
        widget={widget}
        mode={mode}
        shell={shell}
        nested={nested}
        selected={selected}
        gridSize={effectiveGridSize}
        pixelSize={pixelSize}
        allWidgets={widget.type === "tabs" ? allWidgets : undefined}
        renderNestedWidget={nested ? undefined : renderNested}
        filterParameters={filterParameters}
        executeKey={executeKey}
        filterValue={
          widget.filterConfig
            ? filterValues[widget.filterConfig.filterId]
            : undefined
        }
        onFilterValueChange={onFilterValueChange}
        onSelect={handleSelect}
        onDelete={mode === "edit" ? onDelete : undefined}
        onTitleChange={handleTitleChange}
        onChartConfigChange={handleChartConfigChange}
        onTabsConfigChange={nested ? undefined : handleTabsConfigChange}
        onTabPaletteDrop={nested || mode !== "edit" ? undefined : handleTabPaletteDrop}
        onTextConfigChange={handleTextConfigChange}
        dashboardStyle={dashboardStyle}
        chartPaletteDefaults={chartPaletteDefaults}
        suspendLiveResize={isShapePlaying || isGridPlaying}
        componentMap={componentMap}
      />
    </WidgetErrorBoundary>
  );
}, rendererPropsEqual);
