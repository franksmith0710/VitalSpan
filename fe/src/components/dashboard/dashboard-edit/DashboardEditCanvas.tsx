import type { CSSProperties } from "react";
import { DashboardGrid, type GridInsertAt } from "../DashboardGrid";
import { DashboardLayoutPreview } from "../DashboardLayoutPreview";
import type { Linkage } from "../dashboardFilterUtils";
import type { DashboardCanvasEditor } from "../dashboardCanvasMode";
import { PixelCanvas, type PixelRect } from "../pixelCanvas";
import {
  sortWidgets,
  type DashboardLayout,
  type DashboardLayoutV2,
  type LayoutWidget,
} from "../layoutUtils";
import type { PaletteInsertType } from "../createLayoutWidget";
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
  canvasBackground?: string;
  setWidgets: DashboardWidgetsSetter;
  setPixelLayout: (layout: DashboardLayoutV2) => void;
  onSelect: (widgetId: string, additive: boolean) => void;
  onNestedSelect: (widgetId: string, additive: boolean) => void;
  onClearSelection: () => void;
  onDeleteWidget: (widgetId: string) => void;
  onFilterValueChange: (filterId: string, value: string) => void;
  onDropInsert: (type: PaletteInsertType, at: GridInsertAt) => void;
  onViewportChange: (viewport: PixelRect) => void;
};

export function DashboardEditCanvas({
  mode,
  editor,
  layout,
  widgets,
  selectedIds,
  linkage,
  filterValues,
  canvasBackground,
  setWidgets,
  setPixelLayout,
  onSelect,
  onNestedSelect,
  onClearSelection,
  onDeleteWidget,
  onFilterValueChange,
  onDropInsert,
  onViewportChange,
}: DashboardEditCanvasProps) {
  if (mode === "view" || editor === "pixel-readonly") {
    return (
      <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.02]">
        <DashboardLayoutPreview
          layout={layout}
          linkage={linkage}
          filterValues={filterValues}
          onFilterValueChange={
            mode === "view" ? onFilterValueChange : undefined
          }
        />
      </div>
    );
  }

  const style: CSSProperties | undefined = canvasBackground
    ? { background: canvasBackground }
    : undefined;
  const renderWidget = (
    widget: LayoutWidget,
    gridSize?: { w: number; h: number },
  ) => (
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
    />
  );

  return (
    <div className="h-full min-h-0" style={style}>
      {layout.version === 2 ? (
        <PixelCanvas
          mode="edit"
          layout={layout}
          selectedIds={selectedIds}
          onSelect={onSelect}
          onClearSelection={onClearSelection}
          onLayoutChange={setPixelLayout}
          onViewportChange={onViewportChange}
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
            />
          )}
        />
      ) : (
        <DashboardGrid
          mode="edit"
          widgets={widgets}
          selectedIds={selectedIds}
          onClearSelection={onClearSelection}
          onInsertChart={onDropInsert}
          onLayoutChange={(next) => setWidgets(sortWidgets(next))}
          renderWidget={renderWidget}
        />
      )}
    </div>
  );
}
