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
  resizeWidget,
  type LayoutWidget,
  type PixelLayoutWidget,
} from "../layoutUtils";

export type DashboardWidgetsSetter = (
  update: LayoutWidget[] | ((previous: LayoutWidget[]) => LayoutWidget[]),
) => void;

type DashboardCanvasWidgetRendererProps = {
  widget: LayoutWidget | PixelLayoutWidget;
  mode: "edit" | "view";
  gridSize?: { w: number; h: number };
  widgets: LayoutWidget[];
  selectedIds: ReadonlySet<string>;
  linkage: Linkage;
  filterValues: Record<string, string>;
  onFilterValueChange: (filterId: string, value: string) => void;
  onSelect: (widgetId: string, additive: boolean) => void;
  onNestedSelect?: (widgetId: string, additive: boolean) => void;
  onDelete: (widgetId: string) => void;
  setWidgets: DashboardWidgetsSetter;
  nested?: boolean;
  shell?: DashboardWidgetShell;
};

function asLayoutWidget(
  widget: LayoutWidget | PixelLayoutWidget,
): LayoutWidget {
  return "width" in widget
    ? pixelWidgetToLayoutWidget(widget)
    : widget;
}

export function DashboardCanvasWidgetRenderer({
  widget: sourceWidget,
  mode,
  gridSize,
  widgets,
  selectedIds,
  linkage,
  filterValues,
  onFilterValueChange,
  onSelect,
  onNestedSelect = onSelect,
  onDelete,
  setWidgets,
  nested = false,
  shell = "grid",
}: DashboardCanvasWidgetRendererProps) {
  const widget = asLayoutWidget(sourceWidget);
  const pixelSize =
    "width" in sourceWidget
      ? { width: sourceWidget.width, height: sourceWidget.height }
      : undefined;
  const executeKey = JSON.stringify(filterValues);
  const updateWidget = (widgetId: string, patch: Partial<LayoutWidget>) => {
    setWidgets((previous) =>
      previous.map((item) =>
        item.id === widgetId ? { ...item, ...patch } : item,
      ),
    );
  };
  const renderNested = (child: LayoutWidget) => (
    <DashboardCanvasWidgetRenderer
      widget={child}
      mode={mode}
      widgets={widgets}
      selectedIds={selectedIds}
      linkage={linkage}
      filterValues={filterValues}
      onFilterValueChange={onFilterValueChange}
      onSelect={onNestedSelect}
      onNestedSelect={onNestedSelect}
      onDelete={onDelete}
      setWidgets={setWidgets}
      nested
      shell={shell}
    />
  );

  return (
    <DashboardWidget
      widget={widget}
      mode={mode}
      shell={shell}
      selected={selectedIds.has(widget.id)}
      gridSize={gridSize}
      pixelSize={pixelSize}
      allWidgets={nested ? undefined : widgets}
      renderNestedWidget={renderNested}
      filterParameters={
        widget.type === "chart"
          ? buildWidgetFilterParams(widget.id, linkage, filterValues)
          : undefined
      }
      executeKey={executeKey}
      filterValue={
        widget.filterConfig
          ? filterValues[widget.filterConfig.filterId]
          : undefined
      }
      onFilterValueChange={onFilterValueChange}
      onSelect={(event) => onSelect(widget.id, event.shiftKey)}
      onDelete={mode === "edit" ? onDelete : undefined}
      onTitleChange={(widgetId, title) =>
        setWidgets((previous) =>
          resizeWidget(previous, widgetId, { title }),
        )
      }
      onChartConfigChange={(widgetId, chartConfig) =>
        updateWidget(widgetId, { chartConfig })
      }
      onTabsConfigChange={
        nested
          ? undefined
          : (widgetId, tabsConfig) =>
              updateWidget(widgetId, { tabsConfig })
      }
      onTextConfigChange={(widgetId, textConfig) =>
        updateWidget(widgetId, { textConfig })
      }
    />
  );
}
