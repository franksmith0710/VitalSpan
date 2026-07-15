import { useCallback, useMemo } from "react";
import { DashboardGrid, type GridInsertAt } from "../DashboardGrid";
import { DashboardLayoutPreview } from "../DashboardLayoutPreview";
import type { Linkage } from "../dashboardFilterUtils";
import type { DashboardCanvasEditor } from "../dashboardCanvasMode";
import { pixelWidgetToLayoutWidget } from "../dashboardCanvasMode";
import { PixelCanvas, type PixelRect } from "../pixelCanvas";
import type { PixelWidgetActions } from "../pixelCanvas/PixelShapeActionRail";
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
  resolvePixelGutter,
  widgetDashboardStyleFingerprint,
} from "../dashboardStyleConfig";
import { DashboardStyleSurface } from "../DashboardStyleSurface";
import { DashboardWidgetsProvider } from "../DashboardWidgetsContext";
import { widgetFilterExecuteRevision } from "../dashboardWidgetExecuteKey";
import type { PaletteInsertType } from "../createLayoutWidget";
import type { PaletteDragPayload } from "@/lib/dashboardDnd";
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
  onPaletteDrop?: (type: PaletteDragPayload, point: { x: number; y: number }) => void;
  onViewportChange: (viewport: PixelRect) => void;
  widgetActions?: PixelWidgetActions;
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
  onViewportChange,
  widgetActions,
}: DashboardEditCanvasProps) {
  const widgetDashboardStyle = useMemo(
    () => pickWidgetDashboardStyle(styleConfig),
    [widgetDashboardStyleFingerprint(styleConfig)],
  );
  const styleRevision = widgetDashboardStyleFingerprint(styleConfig);

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
          styleRevision={styleRevision}
          chartRefreshKeys={chartRefreshKeys}
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
      styleRevision,
      chartRefreshKeys,
    ],
  );

  const renderPixelWidget = useCallback(
    (widget: PixelLayoutWidget) => renderCanvasWidget(widget, { shell: "shape" }),
    [renderCanvasWidget],
  );

  const widgetContentRevision = useCallback(
    (widget: PixelLayoutWidget) =>
      `${styleRevision}:${widgetFilterExecuteRevision(widget.id, linkage, filterValues, chartRefreshKeys)}:${selectedIds.has(widget.id)}`,
    [styleRevision, linkage, filterValues, chartRefreshKeys, selectedIds],
  );

  if (mode === "view" || editor === "pixel-readonly") {
    return (
      <DashboardLayoutPreview
        layout={layout}
        linkage={linkage}
        filterValues={filterValues}
        onFilterValueChange={mode === "view" ? onFilterValueChange : undefined}
        scaleMode={styleConfig.scaleMode}
        pixelGutter={resolvePixelGutter(styleConfig)}
        className="h-full min-h-0 w-full"
      />
    );
  }

  return (
    <DashboardWidgetsProvider widgets={widgets}>
      <DashboardStyleSurface styleConfig={styleConfig} className="h-full min-h-0">
        {layout.version === 2 ? (
          <PixelCanvas
            mode="edit"
            layout={layout}
            styleConfig={styleConfig}
            scaleMode={styleConfig.scaleMode}
            pixelGutter={resolvePixelGutter(styleConfig)}
            selectedIds={selectedIds}
            onSelect={onSelect}
            onClearSelection={onClearSelection}
            onLayoutChange={setPixelLayout}
            onViewportChange={onViewportChange}
            onPaletteDrop={onPaletteDrop}
            widgetActions={widgetActions}
            renderWidget={renderPixelWidget}
            widgetContentRevision={widgetContentRevision}
          />
        ) : (
          <div className="relative h-full min-h-0">
            <div
              data-testid="dashboard-canvas-backdrop"
              className="pointer-events-none absolute inset-0 z-0"
              style={resolveArtboardStyle(styleConfig)}
              aria-hidden
            />
            <DashboardGrid
              mode="edit"
              widgets={widgets}
              styleConfig={styleConfig}
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
    </DashboardWidgetsProvider>
  );
}
