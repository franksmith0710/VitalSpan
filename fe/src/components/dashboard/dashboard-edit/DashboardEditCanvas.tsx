import { DashboardGrid, type GridInsertAt } from "../DashboardGrid";
import { DashboardLayoutPreview } from "../DashboardLayoutPreview";
import type { Linkage } from "../dashboardFilterUtils";
import type { DashboardCanvasEditor } from "../dashboardCanvasMode";
import { PixelCanvas, type PixelRect } from "../pixelCanvas";
import type { PixelWidgetActions } from "../pixelCanvas/PixelShapeActionRail";
import {
  sortWidgets,
  type DashboardLayout,
  type DashboardLayoutV2,
  type DashboardStyleConfig,
  type LayoutWidget,
} from "../layoutUtils";
import { resolvePixelGutter } from "../dashboardStyleConfig";
import { DashboardStyleSurface } from "../DashboardStyleSurface";
import type { PaletteInsertType } from "../createLayoutWidget";
import type { PaletteDragPayload } from "@/lib/dashboardDnd";
import {
  DashboardCanvasWidgetRenderer,
  type DashboardWidgetsSetter,
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
  if (mode === "view" || editor === "pixel-readonly") {
    return (
      <DashboardStyleSurface styleConfig={styleConfig} className="flex min-h-0 flex-1 flex-col">
        <div className="dashboard-canvas-surface min-h-0 flex-1 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50/60 p-4 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.02]">
          <DashboardLayoutPreview
            layout={layout}
            linkage={linkage}
            filterValues={filterValues}
            onFilterValueChange={mode === "view" ? onFilterValueChange : undefined}
            scaleMode={styleConfig.scaleMode}
            pixelGutter={resolvePixelGutter(styleConfig)}
            className="h-full min-h-0"
          />
        </div>
      </DashboardStyleSurface>
    );
  }

  const renderWidget = (widget: LayoutWidget, gridSize?: { w: number; h: number }) => (
    <DashboardCanvasWidgetRenderer
      widget={widget}
      mode="edit"
      gridSize={gridSize}
      widgets={widgets}
      selectedIds={selectedIds}
      linkage={linkage}
      filterValues={filterValues}
      onFilterValueChange={onFilterValueChange}
      onSelect={onSelect}
      onNestedSelect={onNestedSelect}
      onDelete={onDeleteWidget}
      setWidgets={setWidgets}
      dashboardStyle={styleConfig}
      chartRefreshKeys={chartRefreshKeys}
    />
  );

  return (
    <DashboardStyleSurface styleConfig={styleConfig} className="h-full min-h-0">
      {layout.version === 2 ? (
        <PixelCanvas
          mode="edit"
          layout={layout}
          scaleMode={styleConfig.scaleMode}
          pixelGutter={resolvePixelGutter(styleConfig)}
          selectedIds={selectedIds}
          onSelect={onSelect}
          onClearSelection={onClearSelection}
          onLayoutChange={setPixelLayout}
          onViewportChange={onViewportChange}
          onPaletteDrop={onPaletteDrop}
          widgetActions={widgetActions}
          renderWidget={(widget) => (
            <DashboardCanvasWidgetRenderer
              widget={widget}
              mode="edit"
              shell="shape"
              widgets={widgets}
              selectedIds={selectedIds}
              linkage={linkage}
              filterValues={filterValues}
              onFilterValueChange={onFilterValueChange}
              onSelect={onSelect}
              onNestedSelect={onNestedSelect}
              onDelete={onDeleteWidget}
              setWidgets={setWidgets}
              dashboardStyle={styleConfig}
              chartRefreshKeys={chartRefreshKeys}
            />
          )}
        />
      ) : (
        <DashboardGrid
          mode="edit"
          widgets={widgets}
          styleConfig={styleConfig}
          selectedIds={selectedIds}
          onClearSelection={onClearSelection}
          onInsertChart={onDropInsert}
          onLayoutChange={(next) => setWidgets(sortWidgets(next))}
          renderWidget={renderWidget}
        />
      )}
    </DashboardStyleSurface>
  );
}
