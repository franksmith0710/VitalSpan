import { DashboardGrid } from "./DashboardGrid";
import { DashboardWidget } from "./DashboardWidget";
import {
  buildWidgetFilterParams,
  type Linkage,
} from "./dashboardFilterUtils";
import { pixelWidgetToLayoutWidget, type DashboardWidgetShell } from "./dashboardCanvasMode";
import { PixelCanvas } from "./pixelCanvas";
import type { ScaleMode } from "./dashboardStyleConfig";
import { resolvePixelGutter, resolveArtboardStyle } from "./dashboardStyleConfig";
import { DashboardStyleSurface } from "./DashboardStyleSurface";
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
  const styleConfig = layout.styleConfig ?? {};
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
        dashboardStyle={styleConfig}
      />
    );
  };

  if (layout.version === 2) {
    return (
      <DashboardStyleSurface styleConfig={styleConfig} className={className}>
        <PixelCanvas
          mode="view"
          layout={layout}
          styleConfig={styleConfig}
          scaleMode={scaleMode ?? styleConfig.scaleMode}
          pixelGutter={pixelGutter ?? resolvePixelGutter(styleConfig)}
          className="h-full min-h-0"
          renderWidget={(widget: PixelLayoutWidget) =>
            renderWidget(pixelWidgetToLayoutWidget(widget), undefined, "shape")
          }
        />
      </DashboardStyleSurface>
    );
  }

  return (
    <DashboardStyleSurface styleConfig={styleConfig} className={className}>
      <div className="relative h-full min-h-0">
        <div
          data-testid="dashboard-canvas-backdrop"
          className="pointer-events-none absolute inset-0 z-0"
          style={resolveArtboardStyle(styleConfig)}
          aria-hidden
        />
        <DashboardGrid
          mode="view"
          widgets={layout.widgets}
          styleConfig={styleConfig}
          className="relative z-[1] h-full min-h-0"
          renderWidget={renderWidget}
        />
      </div>
    </DashboardStyleSurface>
  );
}
