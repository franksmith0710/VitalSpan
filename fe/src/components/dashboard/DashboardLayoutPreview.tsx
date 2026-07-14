import { DashboardGrid } from "./DashboardGrid";
import { DashboardWidget } from "./DashboardWidget";
import {
  buildWidgetFilterParams,
  type Linkage,
} from "./dashboardFilterUtils";
import { pixelWidgetToLayoutWidget, type DashboardWidgetShell } from "./dashboardCanvasMode";
import { PixelCanvas } from "./pixelCanvas";
import type { ScaleMode } from "./dashboardStyleConfig";
import { resolvePixelGutter } from "./dashboardStyleConfig";
import type {
  DashboardLayout,
  LayoutWidget,
  PixelLayoutWidget,
} from "./layoutUtils";

type DashboardLayoutPreviewProps = {
  layout: DashboardLayout;
  linkage?: Linkage | null;
  filterValues?: Record<string, string>;
  onFilterValueChange?: (filterId: string, value: string) => void;
  scaleMode?: ScaleMode;
  pixelGutter?: number;
  className?: string;
};

export function DashboardLayoutPreview({
  layout,
  linkage = null,
  filterValues = {},
  onFilterValueChange,
  scaleMode,
  pixelGutter,
  className,
}: DashboardLayoutPreviewProps) {
  const widgets =
    layout.version === 1
      ? layout.widgets
      : layout.widgets.map(pixelWidgetToLayoutWidget);
  const executeKey = JSON.stringify(filterValues);
  const effectiveLinkage: Linkage = linkage ?? {
    filters: [],
    linkageRules: [],
  };

  const renderWidget = (
    widget: LayoutWidget,
    grid?: { w: number; h: number },
    shell: DashboardWidgetShell = "grid",
  ) => {
    const renderNested = (child: LayoutWidget) =>
      renderWidget(child, grid, shell);
    return (
      <DashboardWidget
        widget={widget}
        mode="view"
        shell={shell}
        gridSize={grid}
        allWidgets={widgets}
        renderNestedWidget={renderNested}
        filterParameters={
          widget.type === "chart"
            ? buildWidgetFilterParams(widget.id, effectiveLinkage, filterValues)
            : undefined
        }
        executeKey={executeKey}
        filterValue={
          widget.filterConfig
            ? filterValues[widget.filterConfig.filterId]
            : undefined
        }
        onFilterValueChange={onFilterValueChange}
        onTitleChange={() => {}}
      />
    );
  };

  if (layout.version === 2) {
    return (
      <PixelCanvas
        mode="view"
        layout={layout}
        scaleMode={scaleMode}
        pixelGutter={pixelGutter ?? resolvePixelGutter({})}
        className={className}
        renderWidget={(widget: PixelLayoutWidget) =>
          renderWidget(pixelWidgetToLayoutWidget(widget), undefined, "shape")
        }
      />
    );
  }

  return (
    <DashboardGrid
      mode="view"
      widgets={layout.widgets}
      className={className}
      renderWidget={renderWidget}
    />
  );
}
