import type { DashboardWidgetBase } from "@/components/dashboard/dashboardLayoutContracts";
import type { VizComponentDetail } from "@/lib/vizComponents";
import { isLinkedComponentRef } from "@/lib/vizComponents";
import { applyManualGeoMapDrillOverlay } from "@/lib/geoMapRegionPicker";

export type VizComponentMap = Map<string, VizComponentDetail>;

function rewriteIds(widget: DashboardWidgetBase, payload: Record<string, unknown>): DashboardWidgetBase {
  const next = { ...widget };
  if (next.type === "chart" && payload.chartConfig) {
    const chartConfig = { ...(payload.chartConfig as object), chartId: widget.id };
    next.chartConfig = chartConfig as DashboardWidgetBase["chartConfig"];
  }
  if (next.type === "filter" && payload.filterConfig) {
    const filterConfig = { ...(payload.filterConfig as object), filterId: widget.id };
    next.filterConfig = filterConfig as DashboardWidgetBase["filterConfig"];
  }
  if (next.type === "text" && payload.textConfig) {
    next.textConfig = { ...(payload.textConfig as object) } as DashboardWidgetBase["textConfig"];
  }
  if (next.type === "media" && payload.mediaConfig) {
    next.mediaConfig = { ...(payload.mediaConfig as object) } as DashboardWidgetBase["mediaConfig"];
  }
  return next;
}

export function resolveLayoutWidget<T extends DashboardWidgetBase>(
  widget: T,
  componentMap: VizComponentMap,
): T {
  const ref = widget.componentRef;
  if (!isLinkedComponentRef(ref)) return widget;

  const component = componentMap.get(ref.componentId);
  if (!component) {
    return {
      ...widget,
      title: widget.title || "组件已下架",
    };
  }

  if (component.widgetType !== widget.type) {
    return widget;
  }

  const payload = component.payloadJson as Record<string, unknown>;
  const resolved = rewriteIds({ ...widget, title: widget.title || component.name }, payload) as T;
  if (resolved.type === "chart" && resolved.chartConfig && widget.type === "chart" && widget.chartConfig) {
    return {
      ...resolved,
      chartConfig: applyManualGeoMapDrillOverlay(resolved.chartConfig, widget.chartConfig),
    } as T;
  }
  return resolved;
}

export function resolveLayoutWidgets<T extends DashboardWidgetBase>(
  widgets: T[],
  componentMap: VizComponentMap,
): T[] {
  return widgets.map((w) => resolveLayoutWidget(w, componentMap));
}

export function buildComponentMap(items: VizComponentDetail[]): VizComponentMap {
  return new Map(items.map((item) => [item.id, item]));
}

export function detachLinkedWidget<T extends DashboardWidgetBase>(
  widget: T,
  componentMap: VizComponentMap,
): T {
  const resolved = resolveLayoutWidget(widget, componentMap);
  const { componentRef: _removed, ...rest } = resolved;
  return {
    ...rest,
    componentRef: widget.componentRef
      ? { ...widget.componentRef, detached: true }
      : undefined,
  } as T;
}
