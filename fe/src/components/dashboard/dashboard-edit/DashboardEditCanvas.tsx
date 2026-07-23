import { useCallback, useMemo } from "react";
import { DashboardGrid, type GridInsertAt } from "../DashboardGrid";
import { DashboardLayoutPreview } from "../DashboardLayoutPreview";
import { ChartDrillProvider } from "@/components/charts/ChartDrillContext";
import type { Linkage } from "../dashboardFilterUtils";
import type { DashboardCanvasEditor } from "../dashboardCanvasMode";
import { pixelWidgetToLayoutWidget } from "../dashboardCanvasMode";
import { PixelCanvas, type PixelRect } from "../pixelCanvas";
import type { PixelWidgetActions } from "../pixelCanvas/PixelShapeActionRail";
import {
  PaletteDragProvider,
  usePaletteDocumentDrag,
} from "../pixelCanvas/paletteDragContext";
import {
  sortWidgets,
  type DashboardLayout,
  type DashboardLayoutV2,
  type DashboardStyleConfig,
  type LayoutWidget,
  type PixelLayoutWidget,
} from "../layoutUtils";
import {
  pickWidgetDashboardStyle,
  resolveArtboardStyle,
  widgetDashboardStyleFingerprint,
  pickChartPaletteDefaults,
  chartPaletteDefaultsFingerprint,
} from "../dashboardStyleConfig";
import { resolveDashboardGapRuntimeFromLayout, resolveEffectiveDashboardStyle } from "../stylePipeline";
import { DashboardStyleSurface } from "../DashboardStyleSurface";
import { DataScreenEditViewport } from "../screen/DataScreenEditViewport";
import type { PresentationMode } from "../screen/presentationScale";
import { DATA_SCREEN_EDIT_PRESENTATION_DEFAULT } from "../screen/presentationScale";
import { DashboardWidgetsProvider } from "../DashboardWidgetsContext";
import { widgetFilterExecuteRevision } from "../dashboardWidgetExecuteKey";
import type { PaletteInsertType } from "../createLayoutWidget";
import type { PaletteDragPayload } from "@/lib/dashboardDnd";
import type { TabInsertIntent } from "../pixelCanvas/tabInsertResolver";
import {
  DashboardCanvasWidgetRenderer,
  type DashboardWidgetsSetter,
  type RenderDashboardCanvasWidgetOptions,
} from "./DashboardCanvasWidgetRenderer";

type DashboardEditCanvasProps = {
  mode: "edit" | "view";
  editor: DashboardCanvasEditor;
  layout: DashboardLayout;
  widgets: LayoutWidget[];
  selectedIds: Set<string>;
  linkage: Linkage;
  filterValues: Record<string, string>;
  styleConfig?: DashboardStyleConfig;
  chartRefreshKeys?: Record<string, number>;
  setWidgets: DashboardWidgetsSetter;
  setPixelLayout: (layout: DashboardLayoutV2) => void;
  onSelect: (widgetId: string, additive: boolean) => void;
  onNestedSelect: (widgetId: string, additive: boolean) => void;
  onClearSelection: () => void;
  onDeleteWidget: (widgetId: string) => void;
  onFilterValueChange: (filterId: string, value: string) => void;
  onDropInsert: (type: PaletteInsertType, at: GridInsertAt) => void;
  onPaletteDrop?: (
    type: PaletteDragPayload,
    point: { x: number; y: number },
    sourceEvent?: DragEvent,
  ) => void;
  onTabPaletteDrop?: (tabsWidgetId: string, type: PaletteDragPayload) => void;
  onTabChildUnpark?: (widgetId: string, point: import("../pixelCanvas/geometry").PixelPoint) => void;
  onViewportChange: (viewport: PixelRect) => void;
  tabInsertIntent?: TabInsertIntent | null;
  onTabInsertIntentChange?: (intent: TabInsertIntent | null) => void;
  widgetActions?: PixelWidgetActions;
  dataScreenPresentationMode?: PresentationMode;
};

export function DashboardEditCanvas({
  mode,
  editor,
  layout,
  widgets,
  selectedIds,
  linkage,
  filterValues,
  styleConfig = {},
  chartRefreshKeys,
  setWidgets,
  setPixelLayout,
  onSelect,
  onNestedSelect,
  onClearSelection,
  onDeleteWidget,
  onFilterValueChange,
  onDropInsert,
  onPaletteDrop,
  onTabPaletteDrop,
  onTabChildUnpark,
  onViewportChange,
  tabInsertIntent = null,
  onTabInsertIntentChange,
  widgetActions,
  dataScreenPresentationMode = DATA_SCREEN_EDIT_PRESENTATION_DEFAULT,
}: DashboardEditCanvasProps) {
  const effectiveStyle = useMemo(
    () => resolveEffectiveDashboardStyle(layout, styleConfig),
    [layout, styleConfig],
  );
  const widgetDashboardStyle = useMemo(
    () => pickWidgetDashboardStyle(effectiveStyle),
    [widgetDashboardStyleFingerprint(effectiveStyle)],
  );
  const styleRevision = widgetDashboardStyleFingerprint(effectiveStyle);
  const chartPaletteDefaults = useMemo(
    () => pickChartPaletteDefaults(widgetDashboardStyle),
    [chartPaletteDefaultsFingerprint(widgetDashboardStyle)],
  );
  const paletteDragActive = usePaletteDocumentDrag(
    mode === "edit" && Boolean(onPaletteDrop || onTabPaletteDrop),
  );

  const renderCanvasWidget = useCallback(
    (
      widget: LayoutWidget | PixelLayoutWidget,
      options?: RenderDashboardCanvasWidgetOptions,
    ) => {
      const layoutWidget = "width" in widget ? pixelWidgetToLayoutWidget(widget) : widget;
      return (
        <DashboardCanvasWidgetRenderer
          key={layoutWidget.id}
          widget={widget}
          mode="edit"
          selected={selectedIds.has(layoutWidget.id)}
          shell={options?.shell}
          gridSize={options?.gridSize}
          nested={options?.nested}
          linkage={linkage}
          filterValues={filterValues}
          onFilterValueChange={onFilterValueChange}
          onSelect={onSelect}
          onNestedSelect={onNestedSelect}
          onDelete={onDeleteWidget}
          setWidgets={setWidgets}
          renderChild={renderCanvasWidget}
          dashboardStyle={widgetDashboardStyle}
          chartPaletteDefaults={chartPaletteDefaults}
          allWidgets={layoutWidget.type === "tabs" ? widgets : undefined}
          styleRevision={styleRevision}
          chartRefreshKeys={chartRefreshKeys}
          onTabPaletteDrop={onTabPaletteDrop}
        />
      );
    },
    [
      selectedIds,
      linkage,
      filterValues,
      onFilterValueChange,
      onSelect,
      onNestedSelect,
      onDeleteWidget,
      setWidgets,
      widgetDashboardStyle,
      chartPaletteDefaults,
      widgets,
      styleRevision,
      chartRefreshKeys,
      onTabPaletteDrop,
    ],
  );

  const renderPixelWidget = useCallback(
    (widget: PixelLayoutWidget) => renderCanvasWidget(widget, { shell: "shape" }),
    [renderCanvasWidget],
  );

  const widgetContentRevision = useCallback(
    (widget: PixelLayoutWidget) => {
      const base = widgetFilterExecuteRevision(widget.id, linkage, filterValues, chartRefreshKeys);
      if (widget.type === "tabs" && widget.tabsConfig) {
        const childCount = widget.tabsConfig.panes.reduce(
          (sum, pane) => sum + pane.childWidgetIds.length,
          0,
        );
        return `${base}:${childCount}`;
      }
      return base;
    },
    [linkage, filterValues, chartRefreshKeys],
  );

  if (mode === "view" || editor === "pixel-readonly") {
    return (
      <DashboardLayoutPreview
        layout={layout}
        styleConfig={effectiveStyle}
        linkage={linkage}
        filterValues={filterValues}
        onFilterValueChange={mode === "view" ? onFilterValueChange : undefined}
        className="h-full min-h-0 w-full"
      />
    );
  }

  const isDataScreenEdit =
    layout.version === 2 && effectiveStyle.surfaceKind === "data-screen";

  const pixelCanvas = (
    <PixelCanvas
      mode="edit"
      layout={layout as DashboardLayoutV2}
      styleConfig={effectiveStyle}
      designViewportLocked={isDataScreenEdit}
      viewportFit={isDataScreenEdit ? "data-screen" : undefined}
      selectedIds={selectedIds}
      onSelect={onSelect}
      onClearSelection={onClearSelection}
      onLayoutChange={setPixelLayout}
      onViewportChange={onViewportChange}
      onPaletteDrop={onPaletteDrop}
      onTabPaletteDrop={onTabPaletteDrop}
      onTabChildUnpark={onTabChildUnpark}
      onTabInsertIntentChange={onTabInsertIntentChange}
      widgetActions={widgetActions}
      renderWidget={renderPixelWidget}
      widgetContentRevision={widgetContentRevision}
      className={isDataScreenEdit ? "h-full w-full" : undefined}
    />
  );

  return (
    <ChartDrillProvider>
    <DashboardWidgetsProvider widgets={widgets}>
      <PaletteDragProvider
        active={paletteDragActive}
        tabInsertIntent={tabInsertIntent}
        onTabInsertIntentChange={onTabInsertIntentChange ?? (() => {})}
      >
      <DashboardStyleSurface
        styleConfig={effectiveStyle}
        componentGapPx={
          resolveDashboardGapRuntimeFromLayout(layout, styleConfig).shellPaddingPx
        }
        className="h-full min-h-0"
      >
        {layout.version === 2 ? (
          isDataScreenEdit ? (
            <DataScreenEditViewport
              canvasWidth={layout.canvas.width}
              canvasHeight={layout.canvas.height}
              presentationMode={dataScreenPresentationMode}
              className="h-full min-h-0 w-full"
              onBlankPointerDown={onClearSelection}
            >
              {pixelCanvas}
            </DataScreenEditViewport>
          ) : (
            pixelCanvas
          )
        ) : (
          <div className="relative h-full min-h-0" data-dashboard-thumbnail-capture="">
            <div
              data-testid="dashboard-canvas-backdrop"
              className="pointer-events-none absolute inset-0 z-0"
              style={resolveArtboardStyle(effectiveStyle)}
              aria-hidden
            />
            <DashboardGrid
              mode="edit"
              widgets={widgets}
              styleConfig={effectiveStyle}
              selectedIds={selectedIds}
              onClearSelection={onClearSelection}
              onInsertChart={onDropInsert}
              onLayoutChange={(next) => setWidgets(sortWidgets(next))}
              renderWidget={(widget, gridSize) => renderCanvasWidget(widget, { gridSize })}
              className="relative z-[1] h-full min-h-0"
            />
          </div>
        )}
      </DashboardStyleSurface>
      </PaletteDragProvider>
    </DashboardWidgetsProvider>
    </ChartDrillProvider>
  );
}
