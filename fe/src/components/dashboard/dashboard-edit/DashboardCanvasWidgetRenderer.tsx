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
import { useDashboardWidgets } from "../DashboardWidgetsContext";
import {
  buildWidgetExecuteKey,
} from "../dashboardWidgetExecuteKey";
import {
  resizeWidget,
  type DashboardStyleConfig,
  type LayoutWidget,
  type PixelLayoutWidget,
} from "../layoutUtils";
import { WidgetErrorBoundary } from "../WidgetErrorBoundary";
import { useDashboardGridPlayer } from "../dashboardGridPlayerContext";
import { usePixelShapePlayer } from "../pixelCanvas/pixelShapePlayerContext";

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
  styleRevision?: string;
  chartRefreshKeys?: Record<string, number>;
  renderChild?: (
    widget: LayoutWidget,
    options?: RenderDashboardCanvasWidgetOptions,
  ) => ReactNode;
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
  styleRevision: _styleRevision,
  chartRefreshKeys,
  renderChild,
}: DashboardCanvasWidgetRendererProps) {
  const widget = asLayoutWidget(sourceWidget);
  const allWidgets = useDashboardWidgets();
  const isShapePlaying = usePixelShapePlayer();
  const isGridPlaying = useDashboardGridPlayer();
  const pixelSize =
    "width" in sourceWidget && !isShapePlaying
      ? { width: sourceWidget.width, height: sourceWidget.height }
      : undefined;
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

  const handleSelect = useCallback(
    (event: { shiftKey: boolean }) => onSelect(widget.id, event.shiftKey),
    [onSelect, widget.id],
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
      renderChild?.(child, { nested: true, shell }) ?? null,
    [renderChild, shell],
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
        selected={selected}
        gridSize={gridSize}
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
        onTextConfigChange={handleTextConfigChange}
        dashboardStyle={dashboardStyle}
        suspendLiveResize={isShapePlaying || isGridPlaying}
      />
    </WidgetErrorBoundary>
  );
}, rendererPropsEqual);
