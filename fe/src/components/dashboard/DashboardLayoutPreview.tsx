import { DashboardGrid } from "./DashboardGrid";
import { DashboardWidget } from "./DashboardWidget";
import {
  buildWidgetFilterParams,
  type Linkage,
} from "./dashboardFilterUtils";
import { pixelWidgetToLayoutWidget, type DashboardWidgetShell } from "./dashboardCanvasMode";
import { PixelCanvas } from "./pixelCanvas";
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
  className?: string;
};

export function DashboardLayoutPreview({
  layout,
  linkage = null,
  filterValues = {},
  onFilterValueChange,
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
