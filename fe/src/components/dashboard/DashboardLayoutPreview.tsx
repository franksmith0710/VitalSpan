import { useMemo } from "react";
import { DashboardGrid } from "./DashboardGrid";
import { DashboardWidget } from "./DashboardWidget";
import {
  buildWidgetFilterParams,
  type Linkage,
} from "./dashboardFilterUtils";
import { pixelWidgetToLayoutWidget, type DashboardWidgetShell } from "./dashboardCanvasMode";
import { PixelCanvas } from "./pixelCanvas";
import {
  pickWidgetDashboardStyle,
  resolveArtboardStyle,
  widgetDashboardStyleFingerprint,
  type DashboardStyleConfig,
  type ScaleMode,
} from "./dashboardStyleConfig";
import {
  preparePixelLayoutForDisplay,
  resolveDashboardGapRuntimeFromLayout,
  resolveEffectiveDashboardStyle,
} from "./stylePipeline";
import { DashboardStyleSurface } from "./DashboardStyleSurface";
import { DashboardWidgetsProvider } from "./DashboardWidgetsContext";
import { widgetFilterExecuteRevision } from "./dashboardWidgetExecuteKey";
import { ChartDrillProvider } from "@/components/charts/ChartDrillContext";
import type {
  DashboardLayout,
  LayoutWidget,
  PixelLayoutWidget,
} from "./layoutUtils";

type DashboardLayoutPreviewProps = {
  layout: DashboardLayout;
  /** 编辑态实时样式；缺省回退 layout.styleConfig（经 bootstrap 归一化） */
  styleConfig?: DashboardStyleConfig;
  linkage?: Linkage | null;
  filterValues?: Record<string, string>;
  onFilterValueChange?: (filterId: string, value: string) => void;
  scaleMode?: ScaleMode;
  className?: string;
};

export function DashboardLayoutPreview({
  layout,
  styleConfig: styleConfigOverride,
  linkage = null,
  filterValues = {},
  onFilterValueChange,
  scaleMode,
  className,
}: DashboardLayoutPreviewProps) {
  const styleConfig = useMemo(
    () => resolveEffectiveDashboardStyle(layout, styleConfigOverride),
    [layout, styleConfigOverride],
  );
  const displayLayout = useMemo(
    () =>
      layout.version === 2
        ? preparePixelLayoutForDisplay(layout, styleConfig)
        : layout,
    [layout, styleConfig],
  );
  const widgetDashboardStyle = useMemo(
    () => pickWidgetDashboardStyle(styleConfig),
    [widgetDashboardStyleFingerprint(styleConfig)],
  );
  const widgets =
    displayLayout.version === 1
      ? displayLayout.widgets
      : displayLayout.widgets.map(pixelWidgetToLayoutWidget);
  const styleRevision = widgetDashboardStyleFingerprint(styleConfig);
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
        allWidgets={widget.type === "tabs" ? widgets : undefined}
        renderNestedWidget={renderNested}
        filterParameters={
          widget.type === "chart"
            ? buildWidgetFilterParams(widget.id, effectiveLinkage, filterValues)
            : undefined
        }
        executeKey={widgetFilterExecuteRevision(
          widget.id,
          effectiveLinkage,
          filterValues,
        )}
        filterValue={
          widget.filterConfig
            ? filterValues[widget.filterConfig.filterId]
            : undefined
        }
        onFilterValueChange={onFilterValueChange}
        onTitleChange={() => {}}
        dashboardStyle={widgetDashboardStyle}
      />
    );
  };

  if (displayLayout.version === 2) {
    const widgetContentRevision = (widget: PixelLayoutWidget) =>
      widgetFilterExecuteRevision(widget.id, effectiveLinkage, filterValues);

    return (
      <DashboardWidgetsProvider widgets={widgets}>
      <ChartDrillProvider>
      <DashboardStyleSurface
        styleConfig={styleConfig}
        componentGapPx={resolveDashboardGapRuntimeFromLayout(displayLayout, styleConfigOverride).shellPaddingPx}
        className={className}
      >
        <PixelCanvas
          mode="view"
          layout={displayLayout}
          styleConfig={styleConfig}
          scaleMode={scaleMode ?? styleConfig.scaleMode}
          className="h-full min-h-0"
          renderWidget={(widget: PixelLayoutWidget) =>
            renderWidget(pixelWidgetToLayoutWidget(widget), undefined, "shape")
          }
          widgetContentRevision={widgetContentRevision}
        />
      </DashboardStyleSurface>
      </ChartDrillProvider>
      </DashboardWidgetsProvider>
    );
  }

  return (
    <DashboardWidgetsProvider widgets={widgets}>
    <ChartDrillProvider>
    <DashboardStyleSurface
      styleConfig={styleConfig}
      componentGapPx={resolveDashboardGapRuntimeFromLayout(layout, styleConfigOverride).shellPaddingPx}
      className={className}
    >
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
    </ChartDrillProvider>
    </DashboardWidgetsProvider>
  );
}
